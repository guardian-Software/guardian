'use client';

import React from 'react';

const ReportActions = ({
  report,
  reportId,
  upvotedReports,
  onCopyLink,
  onToggleUpvote,
  variant = 'modal',
  showLocation = true
}) => {
  const containerClass = variant === 'feed' ? 'feed-actions' : 
                         variant === 'fullscreen' ? 'fullscreen-actions-row' : 
                         'modal-actions-row';
  
  const actionsLeftClass = variant === 'feed' ? '' : 
                           variant === 'fullscreen' ? 'fullscreen-actions-left' : 
                           'modal-actions-left';
  
  const actionBtnClass = variant === 'feed' ? 'feed-action-btn' : 
                         variant === 'fullscreen' ? 'fullscreen-action-btn' : 
                         'modal-action-btn';
  
  const locationClass = variant === 'feed' ? 'feed-location' : 
                        variant === 'fullscreen' ? 'fullscreen-location' : 
                        'modal-location';

  const upvoteBtn = (
    <button
      className={`${variant === 'feed' ? '' : actionBtnClass + ' '}upvote-btn ${upvotedReports.some(up => up.id === reportId) ? 'upvoted' : ''}`}
      onClick={(e) => {
        if (variant === 'feed') e.stopPropagation();
        onToggleUpvote(reportId);
      }}
      title="Upvote"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill={upvotedReports.some(up => up.id === reportId) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path d="M10 3l-5 5h3v9h4V8h3l-5-5z"/>
      </svg>
      <span>{report.votes || 0}</span>
    </button>
  );

  const commentBtn = (
    <button className={actionBtnClass}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
      </svg>
      <span>{report.comments?.length || 0}</span>
    </button>
  );

  const shareBtn = (
    <button 
      className={actionBtnClass} 
      onClick={(e) => {
        if (variant === 'feed' && e) e.stopPropagation();
        onCopyLink();
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
      </svg>
    </button>
  );

  const locationEl = showLocation && (report.location || report.watchingZone?.neighborhood) && (
    <div className={locationClass} style={variant === 'feed' ? {} : undefined}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={variant === 'feed' ? {marginRight: '4px', verticalAlign: 'middle'} : undefined}>
        <path d="M6 0C3.79 0 2 1.79 2 4c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4zm0 5.5c-.83 0-1.5-.67-1.5-1.5S5.17 2.5 6 2.5s1.5.67 1.5 1.5S6.83 5.5 6 5.5z"/>
      </svg>
      <span>
        {report.location && report.location}
        {report.location && report.watchingZone?.neighborhood && ' - '}
        {report.watchingZone?.neighborhood && report.watchingZone.neighborhood}
      </span>
    </div>
  );

  if (variant === 'feed') {
    return (
      <div className={containerClass}>
        <div style={{display: 'flex', gap: '4px'}}>
          {upvoteBtn}
          {commentBtn}
          {shareBtn}
        </div>
        {locationEl}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={actionsLeftClass}>
        {upvoteBtn}
        {commentBtn}
        {shareBtn}
      </div>
      {locationEl}
    </div>
  );
};

export default ReportActions;
