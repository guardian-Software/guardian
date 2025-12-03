'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ReportActions from './ReportActions';
import { useComments, useFileUpload, generateConsistentUsername } from '../../lib/hooks';
import { CommentItem } from '../../lib/components';

const ReportModal = ({ reportId, setSelectedSection, user }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [upvotedReports, setUpvotedReports] = useState([]);
  const currentUserUid = user?.uid;

  // Use hooks for comments and file upload
  const { comments, addComment, deleteComment } = useComments(reportId);
  const { uploadToStorage } = useFileUpload();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;

      try {
        const reportDoc = await getDoc(doc(db, 'reports', reportId));
        if (reportDoc.exists()) {
          const data = reportDoc.data();
          setReport({
            id: reportDoc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
          });
        }
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUpvotes = async () => {
      if (currentUserUid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUserUid));
          if (userDoc.exists()) {
            setUpvotedReports(userDoc.data().upvotedReports || []);
          }
        } catch (error) {
          console.error("Error fetching upvotes:", error);
        }
      }
    };

    fetchReport();
    fetchUpvotes();
  }, [reportId, currentUserUid]);

  // Remove duplicate functions - using from hooks

  // Comment handlers using hooks
  const handleAddComment = async (text, imageFile = null, parentId = null) => {
    console.log('DEBUG: ReportModal handleAddComment called with:', { text, imageFile, parentId, user: user?.email });
    if (user?.emailVerified) {
      console.log('DEBUG: User is verified, calling addComment with user:', user);
      await addComment(text, imageFile, parentId, user);
      setCommentInput('');
    } else {
      console.log('DEBUG: User is not verified, skipping addComment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    await deleteComment(commentId);
  };

  const copyReportLink = () => {
    const link = `${window.location.origin}/report/${reportId}`;
    navigator.clipboard.writeText(link);
    alert('Report link copied to clipboard!');
  };

  const toggleUpvote = async (reportId) => {
    if (!currentUserUid) return;

    try {
      const userRef = doc(db, 'users', currentUserUid);
      const reportRef = doc(db, 'reports', reportId);
      const reportData = report;
      const upvoteItem = {
        id: reportId,
        title: reportData.message?.substring(0, 50) + (reportData.message?.length > 50 ? '...' : ''),
        link: `${window.location.origin}/report/${reportId}`,
        timestamp: new Date().toISOString()
      };

      const isCurrentlyUpvoted = upvotedReports.some(up => up.id === reportId);

      if (isCurrentlyUpvoted) {
        // Remove upvote
        await updateDoc(userRef, {
          upvotedReports: arrayRemove(upvoteItem)
        });
        await updateDoc(reportRef, {
          votes: (reportData.votes || 0) - 1
        });
        setUpvotedReports(prev => prev.filter(up => up.id !== reportId));
      } else {
        // Add upvote
        await updateDoc(userRef, {
          upvotedReports: arrayUnion(upvoteItem)
        });
        await updateDoc(reportRef, {
          votes: (reportData.votes || 0) + 1
        });
        setUpvotedReports(prev => [...prev, upvoteItem]);
      }
    } catch (error) {
      console.error("Error toggling upvote:", error);
    }
  };

  // Remove old renderComments function - using CommentItem components now

  const closeModal = () => {
    setSelectedSection('explore');
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={closeModal}>×</button>
          <h2>Report not found</h2>
          <p>This report doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content report-modal-redesign" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>×</button>
        
        {/* Row 1: DateTime + Problem/Action Badge */}
        <div className="modal-header-row">
          <span className="modal-datetime">
            {report.timestamp ? report.timestamp.toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Recently'}
          </span>
          <span className={`modal-badge ${report.reportType}`}>
            {report.reportType === 'problem' ? 'PROBLEM' : report.reportType === 'action' ? 'ACTION' : 'REPORT'}
          </span>
        </div>

        {/* Row 2: Text Content */}
        <div className="modal-text-row">
          <p className="modal-message">{report.message}</p>
        </div>

        {/* Row 3: Media Content (if exists) */}
        {report.fileUrl && (
          <div className="modal-media-row">
            {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={report.fileUrl}
                controls
                className="modal-media"
                preload="metadata"
                playsInline
              />
            ) : (
              <img
                src={report.fileUrl}
                alt="Report media"
                className="modal-media"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
        )}

        {/* Row 4: Comment Counter, Share, Upvote, Location */}
        <ReportActions
          report={report}
          reportId={reportId}
          upvotedReports={upvotedReports}
          onCopyLink={copyReportLink}
          onToggleUpvote={toggleUpvote}
        />

        {/* Row 5: Comments and Replies */}
        <div className="modal-comments-section">
          <h4 className="modal-comments-title">Comments ({comments?.length || 0})</h4>
          <div className="modal-comments-list">
            {comments?.map((comment, index) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                depth={0}
                user={user}
                onReply={() => {}}
                onDelete={(commentId) => handleDeleteComment(commentId)}
                generateUsername={generateConsistentUsername}
              />
            ))}
          </div>
        </div>

        {/* Row 6: Add Comment/Media Section */}
        {user?.emailVerified ? (
          <div className="modal-add-comment">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="modal-comment-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && commentInput.trim()) {
                  console.log('DEBUG: ReportModal Enter key pressed, calling handleAddComment with:', commentInput);
                  handleAddComment(commentInput);
                }
              }}
            />
            <div className="modal-comment-actions">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleAddComment('', e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="modal-image-input"
                id="comment-image-upload"
              />
              <label htmlFor="comment-image-upload" className="modal-image-label">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                  <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                </svg>
              </label>
              <button
                onClick={() => {
                  console.log('DEBUG: ReportModal Post button clicked, calling handleAddComment with:', commentInput);
                  commentInput.trim() && handleAddComment(commentInput);
                }}
                className="modal-comment-submit"
                disabled={!commentInput.trim()}
              >
                Post
              </button>
            </div>
          </div>
        ) : (
          <button
            className="modal-login-prompt"
            onClick={() => setSelectedSection('login')}
          >
            Login to comment
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
