'use client';

import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const ReportProblemModal = ({ setSelectedSection, user }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      // Import media utilities dynamically
      const { validateFileSize, validateVideoDuration, validateAndCompressFile } = await import('../../lib/mediaUtils');

      // Pre-validate file size for immediate feedback
      const sizeValidation = validateFileSize(selectedFile);
      if (!sizeValidation.valid) {
        alert(sizeValidation.error);
        e.target.value = "";
        return;
      }

      // For videos, also validate duration
      if (selectedFile.type.startsWith('video/')) {
        try {
          const durationValidation = await validateVideoDuration(selectedFile);
          if (!durationValidation.valid) {
            alert(durationValidation.error);
            e.target.value = "";
            return;
          }
        } catch (error) {
          alert('Could not validate video duration. Please try again.');
          e.target.value = "";
          return;
        }
      }

      // Validate and compress the file with progress callback
      const processedFile = await validateAndCompressFile(selectedFile, (progress) => {
        console.log(`Compression progress: ${progress}%`);
        // You can add UI progress indicator here if needed
      });

      setFile(processedFile);
      setFilePreviewUrl(URL.createObjectURL(processedFile));
    } catch (error) {
      alert(error.message);
      e.target.value = "";
      return;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      alert("Please provide a description of the problem.");
      return;
    }

    if (!location.trim()) {
      alert("Please provide the location where the issue happened.");
      return;
    }

    setLoading(true);

    try {
      let uploadedUrl = null;
      if (file) {
        const filename = `problem-reports/${auth.currentUser.uid}/${uuidv4()}`;
        const fileRef = ref(storage, filename);
        await uploadBytes(fileRef, file);
        uploadedUrl = await getDownloadURL(fileRef);
      }
      const problemData = {
        location,
        sender: auth.currentUser.uid,
        senderEmail: user.email,
        senderName: user.displayName || user.email,
        type: 'problem-report',
        message,
        fileUrl: uploadedUrl,
        filename: file?.name || null,
        timestamp: serverTimestamp(),
        status: 'pending',
        category: 'technical-issue'
      };

      await addDoc(collection(db, "problemReports"), problemData);

      setSubmitted(true);
      setTimeout(() => {
        setSelectedSection('explore');
      }, 2000);
    } catch (error) {
      console.error("Error submitting problem report:", error);
      alert('Failed to submit problem report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={() => setSelectedSection('explore')}>
        <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-animation">
            <div className="success-checkmark">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <h3 className="success-title">Report Submitted!</h3>
            <p className="success-message">Thank you for helping us improve Red Guardian. Our team will review your report shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => setSelectedSection('explore')}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSelectedSection('explore')}>×</button>
        <h3 className="modal-title">Report a Problem</h3>
        <p>Help us improve Red Guardian by reporting technical issues or bugs.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="problem-description">Describe the issue:</label>
            <textarea
              id="problem-description"
              placeholder="Please provide details about the problem you're experiencing..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-textarea"
              required
              rows={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="problem-location">Location:</label>
            <input
              id="problem-location"
              type="text"
              placeholder="Where did the issue happen?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="problem-file">Attach screenshot or file (optional):</label>
            <input
              id="problem-file"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="form-input"
            />
          </div>

          {filePreviewUrl && (
            <div className="file-preview">
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

          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="form-button"
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportProblemModal;