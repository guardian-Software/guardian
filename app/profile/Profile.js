
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const Profile = ({ userId, setSelectedSection, setSelectedReportId, user }) => {
  const router = useRouter();
  const currentUserUid = auth.currentUser?.uid;
  const [profileUser, setProfileUser] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [upvotedReports, setUpvotedReports] = useState([]);
  const [upvotedReportDetails, setUpvotedReportDetails] = useState([]);
  const [activeTab, setActiveTab] = useState('reports');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');

  const targetUserId = userId || currentUserUid;
  const isOwnProfile = targetUserId === currentUserUid;

  // If trying to view own profile but not authenticated, don't show data
  if (isOwnProfile && !currentUserUid) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Please log in to view your profile</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) return;

      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, "users", targetUserId));
        if (userDoc.exists()) {
          setProfileUser(userDoc.data());
          const upvotedData = userDoc.data().upvotedReports || [];
          console.log('Upvoted reports data:', upvotedData);
          setUpvotedReports(upvotedData);

          // Fetch full report details for upvoted reports
          if (upvotedData.length > 0) {
            const upvotedDetails = [];
            for (const upvote of upvotedData) {
              try {
                // Handle both string IDs and object structures
                const reportId = typeof upvote === 'string' ? upvote : upvote.id || upvote.reportId;
                console.log('Fetching report with ID:', reportId);
                if (reportId) {
                  const reportDoc = await getDoc(doc(db, "reports", reportId));
                  if (reportDoc.exists()) {
                    upvotedDetails.push({ id: reportDoc.id, ...reportDoc.data() });
                  }
                }
              } catch (error) {
                console.error(`Error fetching report ${JSON.stringify(upvote)}:`, error);
              }
            }
            console.log('Fetched upvoted report details:', upvotedDetails);
            setUpvotedReportDetails(upvotedDetails);
          } else {
            setUpvotedReportDetails([]);
          }
        }

        // Fetch user's reports
        const reportsQuery = query(
          collection(db, "reports"), 
          where("sender", "==", targetUserId)
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const reports = reportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserReports(reports);


      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfileData();
  }, [targetUserId]);

  const sendMessage = async () => {
    if (!messageText.trim() || !currentUserUid || !profileUser) return;

    try {
      await addDoc(collection(db, "messages"), {
        senderId: currentUserUid,
        receiverId: targetUserId,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        receiverEmail: profileUser.email,
        receiverName: profileUser.displayName || profileUser.email,
        message: messageText.trim(),
        timestamp: serverTimestamp(),
        read: false
      });

      setMessageText('');
      setShowMessageModal(false);
      alert('Message sent successfully!');
    } catch (error) {
      console.error("Error sending message:", error);
      alert('Failed to send message');
    }
  };

  const navigateToReport = (reportId) => {
    setShowMessageModal(false);
    setSelectedSection('view-report');
    setSelectedReportId(reportId);
  };

  const renderReportCard = (report, index) => (
    <div
      key={`${report.id}-${index}`}
      className="report-card compact"
      onClick={() => navigateToReport(report.id)}
    >
      <div className="report-header">
        <div className={`report-type ${report.reportType}`}>
          {report.reportType === 'problem' ? 'P' : 'A'}
        </div>
        <span className="report-date">
          {report.timestamp?.toDate?.()?.toLocaleDateString() || 'Recently'}
        </span>
      </div>
      <div className="report-content">
        {report.fileUrl ? (
          <div className="report-media">
            {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
              <video src={report.fileUrl} />
            ) : (
              <img src={report.fileUrl} alt="Report" />
            )}
          </div>
        ) : null}
        <p className="report-message">{report.message}</p>
      </div>
    </div>
  );

  if (!profileUser) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-section">
      <div className="profile-header compact">
        <div className="profile-info">
          <div className="profile-avatar compact">
            {profileUser.photoURL ? (
              <img src={profileUser.photoURL} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {(profileUser.displayName || profileUser.email).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-details">
            <h2>{profileUser.displayName || 'Anonymous User'}</h2>
            <p className="profile-email">{profileUser.email}</p>
            <div className="profile-stats">
              <span>{userReports.length} Reports</span>
              <span>{upvotedReports.length} Upvotes</span>
            </div>
          </div>
        </div>

        {!isOwnProfile && currentUserUid && (
          <button
            className="message-btn"
            onClick={() => setShowMessageModal(true)}
          >
            Send Message
          </button>
        )}
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          My Reports
        </button>
        {isOwnProfile && (
          <button
            className={`tab-btn ${activeTab === 'upvotes' ? 'active' : ''}`}
            onClick={() => setActiveTab('upvotes')}
          >
            Upvotes
          </button>
        )}
      </div>

      <div className="profile-content">
        {activeTab === 'reports' && (
          <div className="reports-grid">
            {userReports.length === 0 ? (
              <div className="empty-state">
                <p>No reports yet</p>
              </div>
            ) : (
              userReports.map((report, index) => renderReportCard(report, index))
            )}
          </div>
        )}


        {activeTab === 'upvotes' && isOwnProfile && (
          <div className="reports-grid">
            {upvotedReportDetails.length === 0 ? (
              <div className="empty-state">
                <p>No upvoted reports yet</p>
              </div>
            ) : (
              upvotedReportDetails.map((report, index) => renderReportCard(report, index))
            )}
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowMessageModal(false)}>×</button>
            <h3>Send Message to {profileUser.displayName || profileUser.email}</h3>
            <textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="message-textarea"
            />
            <button 
              onClick={sendMessage}
              disabled={!messageText.trim()}
              className="send-message-btn"
            >
              Send Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
