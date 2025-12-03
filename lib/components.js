// Reusable components for Guardian MVP
import React, { memo, useMemo } from 'react';
import ReportActions from '../app/components/ReportActions.js';

// Memoized report item component
export const ReportItem = memo(({ report, onClick, upvotedReports, onToggleUpvote, variant = 'feed' }) => {
  const isUpvoted = useMemo(() =>
    upvotedReports.some(up => up.id === report.id),
    [upvotedReports, report.id]
  );

  const avatarInitials = useMemo(() => {
    const name = report.senderName || report.senderEmail;
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  }, [report.senderName, report.senderEmail]);

  const formattedTime = useMemo(() => {
    return report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString() : 'Just now';
  }, [report.timestamp]);

  return (
    <div key={report.id} className="feed-item" onClick={onClick}>
      <div className="feed-header">
        <div className="feed-user-info">
          <div className="feed-meta">
            <span className="feed-time">{formattedTime}</span>
          </div>
        </div>
        <span className={`feed-type-badge ${report.reportType}`}>
          {report.reportType === 'problem' ? 'PROBLEM' : report.reportType === 'action' ? 'ACTION' : 'REPORT'}
        </span>
      </div>

      <div className="feed-message">{report.message}</div>

      {report.fileUrl && (
        <div className="feed-media">
          {report.filename?.match(/\.(mp4|webm|ogg)$/i) ? (
            <video
              src={report.fileUrl}
              controls
              playsInline
              preload="metadata"
              loading="lazy"
            />
          ) : (
            <img
              src={report.fileUrl}
              alt={report.filename || 'Report media'}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      )}

      <ReportActions
        report={report}
        reportId={report.id}
        upvotedReports={upvotedReports}
        onToggleUpvote={onToggleUpvote}
        variant={variant}
      />
    </div>
  );
});

// Memoized comment component
export const CommentItem = memo(({
  comment,
  depth = 0,
  user,
  onReply,
  onDelete,
  generateUsername
}) => {
  const commentAvatarInitials = useMemo(() => {
    const name = comment.authorName || comment.author;
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  }, [comment.authorName, comment.author]);

  const formattedTime = useMemo(() => {
    return new Date(comment.timestamp).toLocaleDateString();
  }, [comment.timestamp]);

  const canReply = depth === 0 && user?.emailVerified;
  const canDelete = user?.uid === comment.userId;

  return (
    <div className={`feed-comment ${depth > 0 ? 'reply' : ''}`}>
      <div className="feed-comment-avatar">{commentAvatarInitials}</div>
      <div className="feed-comment-content">
        <div className="feed-comment-author">{generateUsername(comment.userId || comment.author)}</div>
        {comment.text && <div className="feed-comment-text">{comment.text}</div>}
        {comment.imageUrl && (
          <img src={comment.imageUrl} alt="Comment attachment" className="comment-image" />
        )}
        {/* Reply functionality removed */}
        {canDelete && (
          <button className="feed-comment-delete" onClick={() => onDelete(comment.id)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

// Loading spinner component
export const LoadingSpinner = memo(({ size = 40, message = "Loading..." }) => (
  <div className="loading-spinner-container">
    <div
      className="loading-spinner"
      style={{ width: size, height: size }}
    ></div>
    {message && <p>{message}</p>}
  </div>
));

// Empty state component
export const EmptyState = memo(({ icon, title, message }) => (
  <div className="empty-state">
    {icon && (
      <div className="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor" opacity="0.3">
          <path d={icon} />
        </svg>
      </div>
    )}
    {title && <h3>{title}</h3>}
    {message && <p>{message}</p>}
  </div>
));

// Filter controls component
export const FilterControls = memo(({
  filter,
  onFilterChange,
  mode,
  onZoneChange,
  user
}) => (
  <div className="filter-controls">
    <button
      className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
      onClick={() => onFilterChange('all')}
    >
      All Reports
    </button>
    <button
      className={`filter-btn ${filter === 'problem' ? 'active' : ''}`}
      onClick={() => onFilterChange('problem')}
    >
      Problems
    </button>
    <button
      className={`filter-btn ${filter === 'action' ? 'active' : ''}`}
      onClick={() => onFilterChange('action')}
    >
      Actions
    </button>
    {mode === 'my-zone' && (
      <button
        className={`filter-btn change-zone-btn ${!user?.emailVerified ? 'disabled' : ''}`}
        onClick={onZoneChange}
        disabled={!user?.emailVerified}
        title={!user?.emailVerified ? 'Please verify your email to change your watching zone' : 'Change your watching zone'}
      >
        {!user?.emailVerified ? 'Verify Email to Change Zone' : 'Change Zone'}
      </button>
    )}
  </div>
));

// Performance metrics display (for debugging)
export const PerformanceMetrics = memo(({ metrics }) => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="performance-metrics" style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>Fetch: {metrics.fetchTime?.toFixed(0)}ms</div>
      <div>Reports: {metrics.totalReports}</div>
      <div>Filtered: {metrics.filteredReports}</div>
    </div>
  );
});