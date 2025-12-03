
'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import ReportActions from '../components/ReportActions';
import {
  useReports,
  useUpvotes,
  useComments,
  useFileUpload,
  generateRandomUsername
} from '../../lib/hooks';
import {
  ReportItem,
  CommentItem,
  LoadingSpinner,
  EmptyState,
  FilterControls,
  PerformanceMetrics
} from '../../lib/components';

const Main = ({ router, setSelectedSection, user, setProfileUserId, mode = 'explore' }) => {
  // Use custom hooks for data management
  const { reports, filteredReports, loading: reportsLoading, performanceMetrics, filterByType, setReports } = useReports(mode);
  const { upvotedReports, toggleUpvote } = useUpvotes();
  const { uploading, setUploading, compressionProgress, isCompressing, uploadToStorage, processFile } = useFileUpload();

  // Local state for UI
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showMediaFullscreen, setShowMediaFullscreen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [location, setLocation] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [loading, setLoading] = useState(false);

  // Report creation state
  const [reportType, setReportType] = useState('problem');
  const [filter, setFilter] = useState('all');

  // Zone change functionality
  const [showZoneChangeModal, setShowZoneChangeModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [zones, setZones] = useState([]);
  const [selectedAdministrativeZone1, setSelectedAdministrativeZone1] = useState(null);
  const [lastZoneChangeDate, setLastZoneChangeDate] = useState(null);
  const [bottomNavHeight, setBottomNavHeight] = useState(100);

  const fileInputRef = useRef(null);
  const currentUserUid = auth.currentUser?.uid;

  // Calculate and update bottom navigation height
  useEffect(() => {
    const updateBottomNavHeight = () => {
      const bottomNav = document.querySelector('.bottom-navigation');
      if (bottomNav) {
        const rect = bottomNav.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(bottomNav);
        const totalHeight = rect.height + parseFloat(computedStyle.paddingBottom || 0) + parseFloat(computedStyle.paddingTop || 0);
        setBottomNavHeight(totalHeight);
      }
    };

    // Update height on mount with delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateBottomNavHeight();
    }, 100);

    // Also try immediately in case DOM is already ready
    updateBottomNavHeight();

    window.addEventListener('resize', updateBottomNavHeight);
    window.addEventListener('orientationchange', updateBottomNavHeight);

    // Cleanup listeners and timer on unmount
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateBottomNavHeight);
      window.removeEventListener('orientationchange', updateBottomNavHeight);
    };
  }, []);

// Filter handler
const handleFilterChange = useCallback((newFilter) => {
  setFilter(newFilter);
  filterByType(newFilter);
}, [filterByType]);

  // Fetch zones and user zone change data for my-zone mode
  useEffect(() => {
    const fetchZoneData = async () => {
      if (mode === 'my-zone' && currentUserUid) {
        try {
          // Fetch zones
          const zonesSnapshot = await getDocs(collection(db, 'zones'));
          const zonesData = zonesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setZones(zonesData);

          // Fetch user's last zone change date
          const userDoc = await getDoc(doc(db, "users", currentUserUid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setLastZoneChangeDate(userData.lastZoneChangeDate || null);
          }
        } catch (error) {
          console.error("Error fetching zone data:", error);
        }
      }
    };

    fetchZoneData();
  }, [mode, currentUserUid]);

  // Handle file input change using the hook
  const handleFileChange = useCallback(async (e) => {
    const result = await processFile(e.target.files[0]);
    if (result.file) {
      setFile(result.file);
      setFilePreviewUrl(result.previewUrl);
    } else {
      e.target.value = "";
    }
  }, [processFile]);

  // Submit new report
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!user?.emailVerified) {
      alert("Please verify your email to create a report.");
      return;
    }

    if (!message.trim()) {
      alert("Please provide a summary.");
      return;
    }

    if (!location.trim()) {
      alert("Please provide the location where the issue happened.");
      return;
    }

    setLoading(true);

    try {
      // Get user's watching zone ID
      const userDoc = await getDoc(doc(db, "users", currentUserUid));
      const userData = userDoc.data();
      const watchingZoneId = userData?.watchingZoneId;

      let watchingZone = null;
      if (watchingZoneId) {
        // Fetch zone data by ID
        const zoneDoc = await getDoc(doc(db, 'zones', watchingZoneId));
        if (zoneDoc.exists()) {
          watchingZone = zoneDoc.data();
        }
      }

      let uploadedUrl = null;
      let filename = null;

      if (file) {
        console.log('DEBUG: File detected in form submission, starting upload process');
        setUploading(true);
        try {
          uploadedUrl = await uploadToStorage(file, 'files');
          filename = file.name;
          console.log('DEBUG: File upload completed successfully');
        } catch (uploadError) {
          console.error('DEBUG: File upload failed in form submission:', uploadError);
          alert('Failed to upload file. Please try again.');
          setLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      const newReportData = {
        sender: currentUserUid,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        type: file ? 'file' : 'text',
        message,
        fileUrl: uploadedUrl,
        filename: filename,
        category: 'undefined',
        timestamp: serverTimestamp(),
        location,
        comments: [],
        reportType,
        linkedProblems: [],
        collaborators: [],
        favorites: [],
        watchingZoneId,
        watchingZone
      };

      const newReport = await addDoc(collection(db, "reports"), newReportData);
// Add to local state immediately for better UX
setReports(prev => [{

        id: newReport.id,
        ...newReportData,
        timestamp: { toDate: () => new Date() }
      }, ...prev]);

      // Reset form
      setMessage('');
      setFile(null);
      setFilePreviewUrl('');
      setLocation('');
      setReportType('problem');
      setShowNewReportModal(false);
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Use toggleUpvote from hook, but wrap it to pass report data
  const handleToggleUpvote = useCallback((reportId) => {
    const reportData = reports.find(r => r.id === reportId);
    if (reportData) {
      toggleUpvote(reportId, reportData);
    }
  }, [reports, toggleUpvote]);

  // Navigate to user profile
  const navigateToProfile = (userId) => {
    if (setProfileUserId) {
      setProfileUserId(userId);
    }
    setSelectedSection('profile');
  };


  // Comments hook for modal
  const { comments: modalComments, addComment: addModalComment, deleteComment: deleteModalComment } = useComments(selectedReport?.id);

  console.log('DEBUG: Main component - selectedReport:', selectedReport?.id, 'modalComments:', modalComments);

  // Open report in modal
  const openReportModal = (report) => {
    setSelectedReport(report);
    setShowImageModal(true);
  };

  // Close modal
  const closeFullScreenModal = () => {
    setShowImageModal(false);
    setSelectedReport(null);
  };

  // Open media fullscreen
  const openMediaFullscreen = (mediaUrl, filename) => {
    setSelectedMedia({ url: mediaUrl, filename });
    setShowMediaFullscreen(true);
  };

  // Close media fullscreen
  const closeMediaFullscreen = () => {
    setShowMediaFullscreen(false);
    setSelectedMedia(null);
  };

  const handleOpenModal = () => {
    setShowNewReportModal(true);
  };

  const copyReportLink = (reportId) => {
    const link = `${window.location.origin}/report/${reportId}`;
    navigator.clipboard.writeText(link);
    alert('Report link copied to clipboard!');
  };

  // Handle zone change attempt
  const handleZoneChangeAttempt = () => {
    if (!user?.emailVerified) {
      alert("Please verify your email to change your watching zone.");
      return;
    }

    if (!lastZoneChangeDate) {
      // No previous change, show warning then allow
      alert("Note: You can only change your watching zone once every 30 days.");
      setShowZoneChangeModal(true);
      return;
    }

    const lastChange = new Date(lastZoneChangeDate.toDate ? lastZoneChangeDate.toDate() : lastZoneChangeDate);
    const now = new Date();
    const daysSinceChange = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));

    if (daysSinceChange < 30) {
      const daysRemaining = 30 - daysSinceChange;
      setShowRestrictionModal(true);
    } else {
      // Show warning even when allowed
      alert("Note: You can only change your watching zone once every 30 days.");
      setShowZoneChangeModal(true);
    }
  };

  // Handle administrative zone selection
  const handleAdministrativeZone1Selection = (adminZone1) => {
    setSelectedAdministrativeZone1(adminZone1);
  };

  // Handle zone selection and save
  const handleZoneSelection = async (zone) => {
    if (!currentUserUid) return;

    try {
      const userRef = doc(db, 'users', currentUserUid);
      await setDoc(userRef, {
        watchingZoneId: zone.id,
        lastZoneChangeDate: serverTimestamp()
      }, { merge: true });

      setLastZoneChangeDate(new Date());
      setShowZoneChangeModal(false);
      setSelectedAdministrativeZone1(null);

      // Refresh the page or trigger a re-render to show new zone
      window.location.reload();
    } catch (error) {
      console.error('Error saving watching zone:', error);
      alert('Failed to save watching zone. Please try again.');
    }
  };

  // Handle back to admin zones
  const handleBackToAdminZones = () => {
    setSelectedAdministrativeZone1(null);
  };

  // Close zone change modal
  const closeZoneChangeModal = () => {
    setShowZoneChangeModal(false);
    setSelectedAdministrativeZone1(null);
  };

  return (
    <div className="main-section">
      {/* Filter Controls */}
      <FilterControls
        filter={filter}
        onFilterChange={handleFilterChange}
        mode={mode}
        onZoneChange={handleZoneChangeAttempt}
        user={user}
      />

      <div className='report-feed'>
        {reportsLoading ? (
          <LoadingSpinner message="Loading Reports..." />
        ) : filteredReports.length < 1 ? (
          <EmptyState
            icon="M38 42H10c-2.2 0-4-1.8-4-4V10c0-2.2 1.8-4 4-4h28c2.2 0 4 1.8 4 4v28c0 2.2-1.8 4-4 4zM24 18c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z"
            title={mode === 'explore' ? "No Reports Yet" : "No Reports in Your Zone"}
            message={mode === 'explore' ? "Be the first to report something in your area" : "Reports from your watched area will appear here"}
          />
        ) : (
          <>
            {filteredReports.map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                onClick={() => openReportModal(report)}
                upvotedReports={upvotedReports}
                onToggleUpvote={handleToggleUpvote}
                variant="feed"
              />
            ))}
            {/* Spacer element to ensure last item is fully visible above bottom nav */}
            <div
              className="feed-spacer"
              style={{ height: `${bottomNavHeight + 60}px`, background: 'transparent' }}
            ></div>
          </>
        )}
      </div>

      {/* Report Modal */}
      {showImageModal && selectedReport && (
        <div className="modal-overlay" onClick={closeFullScreenModal}>
          <div className="modal-content report-modal-clean" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeFullScreenModal}>×</button>
            
            {/* Row 1: DateTime + Badge */}
            <div className="fullscreen-header-row">
              <span className="fullscreen-datetime">
                {selectedReport.timestamp?.toDate ? selectedReport.timestamp.toDate().toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Just now'}
              </span>
              <span className={`fullscreen-badge ${selectedReport.reportType}`}>
                {selectedReport.reportType === 'problem' ? 'PROBLEM' : 'ACTION'}
              </span>
            </div>

            {/* Row 2: Text Content */}
            <div className="fullscreen-text-row">
              <p className="fullscreen-message">{selectedReport.message}</p>
            </div>

            {/* Row 3: Media (if exists) */}
            {selectedReport.fileUrl && (
              <div className="fullscreen-media-row">
                {selectedReport.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    src={selectedReport.fileUrl}
                    className="fullscreen-media clickable-media"
                    controls
                    playsInline
                    preload="metadata"
                    onClick={() => openMediaFullscreen(selectedReport.fileUrl, selectedReport.filename)}
                  />
                ) : (
                  <img
                    src={selectedReport.fileUrl}
                    alt="Report media"
                    className="fullscreen-media clickable-media"
                    loading="lazy"
                    decoding="async"
                    onClick={() => openMediaFullscreen(selectedReport.fileUrl, selectedReport.filename)}
                  />
                )}
              </div>
            )}

            {/* Row 4: Actions (Comments, Share, Upvote, Location) */}
            <ReportActions
              report={selectedReport}
              reportId={selectedReport.id}
              upvotedReports={upvotedReports}
              onCopyLink={() => copyReportLink(selectedReport.id)}
              onToggleUpvote={toggleUpvote}
              variant="fullscreen"
            />

            {/* Row 5: Comments Section */}
            <div className="fullscreen-comments-section">
              <h4 className="fullscreen-comments-title">Comments ({modalComments?.length || 0})</h4>
              <div className="fullscreen-comments-list">
                {modalComments?.map((comment, index) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    depth={0}
                    user={user}
                    onReply={() => {}}
                    onDelete={(commentId) => deleteModalComment(commentId)}
                    generateUsername={generateRandomUsername}
                  />
                ))}
              </div>
            </div>

            {/* Row 6: Add Comment Section */}
            {user?.emailVerified ? (
              <div className="fullscreen-add-comment">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentInputs[selectedReport.id] || ''}
                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [selectedReport.id]: e.target.value }))}
                  className="fullscreen-comment-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && commentInputs[selectedReport.id]?.trim()) {
                      console.log('DEBUG: Enter key pressed, calling addModalComment with:', commentInputs[selectedReport.id], 'user:', user);
                      addModalComment(commentInputs[selectedReport.id], null, null, user);
                      setCommentInputs(prev => ({ ...prev, [selectedReport.id]: '' }));
                    }
                  }}
                />
                <div className="fullscreen-comment-actions">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        console.log('DEBUG: Image file selected, calling addModalComment with image, user:', user);
                        addModalComment('', e.target.files[0], null, user);
                        e.target.value = '';
                      }
                    }}
                    className="fullscreen-image-input"
                    id="fullscreen-comment-image"
                  />
                  <label htmlFor="fullscreen-comment-image" className="fullscreen-image-label">
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                      <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                    </svg>
                  </label>
                  <button
                    onClick={() => {
                      console.log('DEBUG: Post button clicked, calling addModalComment with:', commentInputs[selectedReport.id], 'user:', user);
                      if (commentInputs[selectedReport.id]?.trim()) {
                        addModalComment(commentInputs[selectedReport.id], null, null, user);
                        setCommentInputs(prev => ({ ...prev, [selectedReport.id]: '' }));
                      }
                    }}
                    className="fullscreen-comment-submit"
                    disabled={!commentInputs[selectedReport.id]?.trim()}
                  >
                    Post
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="fullscreen-login-prompt"
                onClick={() => setSelectedSection('login')}
              >
                Login to comment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Media Fullscreen Modal */}
      {showMediaFullscreen && selectedMedia && (
        <div className="modal-overlay" onClick={closeMediaFullscreen}>
          <div className="modal-content media-fullscreen-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close media-fullscreen-close" onClick={closeMediaFullscreen}>×</button>
            <div className="media-fullscreen-container">
              {selectedMedia.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
                <video
                  src={selectedMedia.url}
                  className="media-fullscreen-content"
                  controls
                  playsInline
                  autoPlay
                  preload="metadata"
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt="Fullscreen media"
                  className="media-fullscreen-content"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="modal-overlay" onClick={() => setShowNewReportModal(false)}>
          <div className="modal-content compact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowNewReportModal(false)}>×</button>
            <h3 className="modal-title">Create New Report</h3>

            {/* Report Type Selection - Compact */}
            <div className="report-type-selection compact">
              <label>
                <input
                  type="radio"
                  value="problem"
                  checked={reportType === 'problem'}
                  onChange={(e) => setReportType(e.target.value)}
                  disabled={loading || uploading}
                />
                <div className="report-type-icon">!</div>
                <div className="report-type-title">Problem</div>
                <div className="report-type-desc">Report issue</div>
              </label>
              <label>
                <input
                  type="radio"
                  value="action"
                  checked={reportType === 'action'}
                  onChange={(e) => setReportType(e.target.value)}
                  disabled={loading || uploading}
                />
                <div className="report-type-icon">✓</div>
                <div className="report-type-title">Action</div>
                <div className="report-type-desc">Share solution</div>
              </label>
            </div>


            {/* File Preview - Compact */}
            {filePreviewUrl && (
              <div className="file-preview compact">
                <div className="file-preview-header">
                  <span className="file-preview-title compact">
                    {file.name}
                    {uploading && <span className="uploading-indicator"> (Uploading...)</span>}
                  </span>
                  <button
                    type="button"
                    className="file-preview-remove"
                    onClick={() => {
                      setFile(null);
                      setFilePreviewUrl('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={loading || uploading}
                  >
                    ✕
                  </button>
                </div>
                {file?.type.startsWith('image/') && (
                  <img
                    src={filePreviewUrl}
                    alt="preview"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {file?.type.startsWith('video/') && (
                  <video
                    controls
                    src={filePreviewUrl}
                    preload="metadata"
                    playsInline
                  />
                )}
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="compact-form">
              <div className="form-group compact">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="file-input-hidden"
                  disabled={loading || uploading}
                  id="file-upload-input"
                />
                <label htmlFor="file-upload-input" className="file-upload-label compact">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                    <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                  </svg>
                  {isCompressing ? `Compressing... ${compressionProgress}%` : uploading ? 'Uploading...' : file ? 'Change media' : 'Add media'}
                </label>

                {/* Compression Progress Bar */}
                {isCompressing && (
                  <div className="compression-progress-container">
                    <div className="compression-progress-bar">
                      <div
                        className="compression-progress-fill"
                        style={{ width: `${compressionProgress}%` }}
                      ></div>
                    </div>
                    <div className="compression-progress-text">
                      Compressing video... {compressionProgress}%
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group compact">
                <label className="form-label compact">
                  <span className="form-label-icon">📝</span>
                  {reportType === 'problem' ? 'Description' : 'Description'}
                </label>
                <textarea
                  placeholder={reportType === 'problem'
                    ? "Describe the problem..."
                    : "Describe your action..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-textarea compact"
                  required
                  rows={3}
                  disabled={loading || uploading}
                />
              </div>
              <div className="form-group compact">
                <label className="form-label compact">
                  <span className="form-label-icon">📍</span>
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Where did the issue happen?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input compact"
                  required
                  disabled={loading || uploading}
                />
              </div>
              <button
                type="submit"
                disabled={!message.trim() || loading || uploading || (isCompressing && compressionProgress < 100)}
                className="form-button compact"
              >
                {uploading ? '📤 Uploading...' : loading ? 'Submitting...' : isCompressing ? '⏳ Processing...' : `🚀 Submit ${reportType === 'problem' ? 'Problem' : 'Action'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Zone Change Modal */}
      {showZoneChangeModal && (
        <div className="modal-overlay" onClick={closeZoneChangeModal}>
          <div className="modal-content zone-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeZoneChangeModal}>×</button>
            <h3 className="modal-title">Change Your Watching Zone</h3>
            <p>Choose a new area you want to monitor for community safety issues.</p>

            <div className="zone-selection">
              {zones.length > 0 ? (
                selectedAdministrativeZone1 ? (
                  <>
                    <button className="back-button" onClick={handleBackToAdminZones}>← Back to Zones</button>
                    <h4>{selectedAdministrativeZone1}</h4>
                    {zones
                      .filter(zone => zone.administrativeZone1 === selectedAdministrativeZone1)
                      .map(zone => (
                        <button
                          key={zone.id}
                          className="zone-option"
                          onClick={() => handleZoneSelection(zone)}
                        >
                          <div className="zone-name">{zone.neighborhood}</div>
                          <div className="zone-details">{zone.subZone1}</div>
                        </button>
                      ))
                    }
                  </>
                ) : (
                  [...new Set(zones.map(zone => zone.administrativeZone1))].map(adminZone1 => (
                    <button
                      key={adminZone1}
                      className="zone-option admin-zone-option"
                      onClick={() => handleAdministrativeZone1Selection(adminZone1)}
                    >
                      <div className="zone-name">{adminZone1}</div>
                    </button>
                  ))
                )
              ) : (
                <p>Loading zones...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restriction Modal */}
      {showRestrictionModal && (
        <div className="modal-overlay" onClick={() => setShowRestrictionModal(false)}>
          <div className="modal-content restriction-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRestrictionModal(false)}>×</button>
            <h3 className="modal-title">Zone Change Restricted</h3>
            <p>You can only change your watching zone once every 30 days.</p>
            {lastZoneChangeDate && (
              <p>
                Last changed: {new Date(lastZoneChangeDate.toDate ? lastZoneChangeDate.toDate() : lastZoneChangeDate).toLocaleDateString()}
                <br />
                Next change available: {new Date(new Date(lastZoneChangeDate.toDate ? lastZoneChangeDate.toDate() : lastZoneChangeDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            )}
            <button
              className="modal-button"
              onClick={() => setShowRestrictionModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {user && (
        <button
          className="fab"
          onClick={handleOpenModal}
          title="Create Report"
        >
          +
        </button>
      )}

    </div>
  );
};

export default Main;
