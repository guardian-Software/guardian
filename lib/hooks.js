// Custom hooks for Guardian MVP
import { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db, storage } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Utility function to generate random username for anonymity
export const generateRandomUsername = () => {
  const adjectives = ['Brave', 'Swift', 'Wise', 'Bold', 'Clever', 'Gentle', 'Kind', 'Sharp', 'Quick', 'Calm'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Owl', 'Lion', 'Hawk', 'Deer', 'Raven'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
};

// Consistent username generation based on user ID
export const generateConsistentUsername = (userId) => {
  const adjectives = ['Brave', 'Swift', 'Wise', 'Bold', 'Clever', 'Gentle', 'Kind', 'Sharp', 'Quick', 'Calm'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Owl', 'Lion', 'Hawk', 'Deer', 'Raven'];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }

  const adjIndex = Math.abs(hash) % adjectives.length;
  const nounIndex = Math.abs(hash >> 8) % nouns.length;
  return `${adjectives[adjIndex]}${nouns[nounIndex]}`;
};

// Hook for managing reports data
export const useReports = (mode = 'explore') => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fetchTime: 0,
    totalReports: 0,
    filteredReports: 0
  });

  const currentUserUid = auth.currentUser?.uid;

  // Fetch reports with performance logging
  const fetchReports = useCallback(async () => {
    const startTime = performance.now();
    try {
      setLoading(true);
      const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setReports(fetchedReports);
      setFilteredReports(fetchedReports);

      const fetchTime = performance.now() - startTime;
      console.log(`PERF: fetchReports took ${fetchTime.toFixed(2)}ms for ${fetchedReports.length} reports`);
      setPerformanceMetrics(prev => ({
        ...prev,
        fetchTime,
        totalReports: fetchedReports.length
      }));
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters with memoization
  const applyFilters = useCallback(async () => {
    let filtered = reports;

    if (mode === 'my-zone' && currentUserUid) {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUserUid));
        const userData = userDoc.data();
        const watchingZoneId = userData?.watchingZoneId;

        if (watchingZoneId) {
          filtered = reports.filter(report => report.watchingZoneId === watchingZoneId);
        } else {
          filtered = [];
        }
      } catch (error) {
        console.error("Error fetching user zone:", error);
        filtered = [];
      }
    }

    setFilteredReports(filtered);
    setPerformanceMetrics(prev => ({
      ...prev,
      filteredReports: filtered.length
    }));
  }, [reports, mode, currentUserUid]);

  // Filter reports by type
  const filterByType = useCallback((filterType) => {
    if (filterType === 'all') {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter(report => report.reportType === filterType);
      setFilteredReports(filtered);
    }
    setPerformanceMetrics(prev => ({
      ...prev,
      filteredReports: filterType === 'all' ? reports.length : reports.filter(r => r.reportType === filterType).length
    }));
  }, [reports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return {
    reports,
    setReports,
    filteredReports,
    loading,
    performanceMetrics,
    refetch: fetchReports,
    filterByType
  };
};

// Hook for managing upvotes
export const useUpvotes = () => {
  const [upvotedReports, setUpvotedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUserUid = auth.currentUser?.uid;

  const fetchUpvotes = useCallback(async () => {
    if (!currentUserUid) return;

    const startTime = performance.now();
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, "users", currentUserUid));
      if (userDoc.exists()) {
        setUpvotedReports(userDoc.data().upvotedReports || []);
      }

      const fetchTime = performance.now() - startTime;
      console.log(`PERF: fetchUpvotes took ${fetchTime.toFixed(2)}ms`);
    } catch (error) {
      console.error("Error fetching upvotes:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserUid]);

  const toggleUpvote = useCallback(async (reportId, reportData) => {
    if (!currentUserUid) return;

    try {
      const userRef = doc(db, "users", currentUserUid);
      const reportRef = doc(db, "reports", reportId);
      const upvoteItem = {
        id: reportId,
        title: reportData.message?.substring(0, 50) + (reportData.message?.length > 50 ? '...' : ''),
        link: `/report/${reportId}`,
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
  }, [currentUserUid, upvotedReports]);

  useEffect(() => {
    fetchUpvotes();
  }, [fetchUpvotes]);

  return {
    upvotedReports,
    loading,
    toggleUpvote,
    refetch: fetchUpvotes
  };
};

// Hook for managing comments
export const useComments = (reportId) => {
  const [comments, setComments] = useState([]);
  const currentUserUid = auth.currentUser?.uid;

  const fetchComments = useCallback(async () => {
    console.log('DEBUG: fetchComments called for reportId:', reportId);

    if (!reportId) {
      console.log('DEBUG: fetchComments early return - no reportId');
      return;
    }

    try {
      console.log('DEBUG: Fetching comments from Firestore');
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      if (reportDoc.exists()) {
        const reportData = reportDoc.data();
        const fetchedComments = reportData.comments || [];
        console.log('DEBUG: Fetched comments:', fetchedComments);
        setComments(fetchedComments);
      } else {
        console.log('DEBUG: Report document does not exist');
        setComments([]);
      }
    } catch (error) {
      console.error("DEBUG: Error fetching comments:", error);
    }
  }, [reportId]);

  const updateCommentsWithNewComment = useCallback((existingComments, newComment, parentId) => {
    if (!parentId) {
      return [...existingComments, newComment];
    }

    return existingComments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newComment]
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentsWithNewComment(comment.replies, newComment, parentId)
        };
      }
      return comment;
    });
  }, []);

  const addComment = useCallback(async (text, imageFile = null, parentId = null, user) => {
    console.log('DEBUG: addComment called with:', { text, imageFile, parentId, user: user?.email, reportId });

    if ((!text?.trim() && !imageFile) || !user?.emailVerified) {
      console.log('DEBUG: addComment early return - validation failed');
      return;
    }

    try {
      console.log('DEBUG: addComment starting process');
      let imageUrl = null;
      if (imageFile) {
        console.log('DEBUG: Uploading image file');
        const filename = `comment-images/${currentUserUid}/${uuidv4()}`;
        const fileRef = ref(storage, filename);
        await uploadBytes(fileRef, imageFile);
        imageUrl = await getDownloadURL(fileRef);
        console.log('DEBUG: Image uploaded successfully:', imageUrl);
      }

      const reportRef = doc(db, "reports", reportId);
      const newComment = {
        id: uuidv4(),
        text: text?.trim() || '',
        author: user.email,
        authorName: user.displayName || user.email,
        timestamp: new Date().toISOString(),
        userId: currentUserUid,
        imageUrl,
        parentId,
        replies: []
      };

      console.log('DEBUG: Created new comment:', newComment);

      // Fetch latest comments from database to avoid stale state
      console.log('DEBUG: Fetching current comments from database');
      const reportDoc = await getDoc(reportRef);
      const currentComments = reportDoc.exists() ? reportDoc.data().comments || [] : [];
      console.log('DEBUG: Current comments from DB:', currentComments);

      const updatedComments = updateCommentsWithNewComment(currentComments, newComment, parentId);
      console.log('DEBUG: Updated comments:', updatedComments);

      console.log('DEBUG: Updating document in Firestore');
      await updateDoc(reportRef, { comments: updatedComments });
      console.log('DEBUG: Document updated successfully');

      setComments(updatedComments);
      console.log('DEBUG: Local state updated');
    } catch (error) {
      console.error("DEBUG: Error adding comment:", error);
    }
  }, [reportId, currentUserUid, updateCommentsWithNewComment]);

  const deleteComment = useCallback(async (commentId) => {
    console.log('DEBUG: deleteComment called with commentId:', commentId, 'reportId:', reportId);

    try {
      const deleteCommentById = (existingComments) => {
        return existingComments.filter(comment => {
          if (comment.id === commentId) {
            console.log('DEBUG: Found comment to delete:', comment);
            return false;
          }
          if (comment.replies) {
            comment.replies = deleteCommentById(comment.replies);
          }
          return true;
        });
      };

      // Fetch latest comments from database to avoid stale state
      console.log('DEBUG: Fetching current comments from database for deletion');
      const reportRef = doc(db, "reports", reportId);
      const reportDoc = await getDoc(reportRef);
      const currentComments = reportDoc.exists() ? reportDoc.data().comments || [] : [];
      console.log('DEBUG: Current comments from DB for deletion:', currentComments);

      const updatedComments = deleteCommentById(currentComments);
      console.log('DEBUG: Comments after deletion:', updatedComments);

      console.log('DEBUG: Updating document in Firestore for deletion');
      await updateDoc(reportRef, { comments: updatedComments });
      console.log('DEBUG: Document updated successfully for deletion');

      setComments(updatedComments);
      console.log('DEBUG: Local state updated for deletion');
    } catch (error) {
      console.error("DEBUG: Error deleting comment:", error);
    }
  }, [reportId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    addComment,
    deleteComment,
    setComments,
    refetch: fetchComments
  };
};

// Hook for file upload with compression
export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const currentUserUid = auth.currentUser?.uid;

  const uploadToStorage = useCallback(async (file, pathPrefix) => {
    console.log('DEBUG: Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    const filename = `${pathPrefix}/${currentUserUid}/${uuidv4()}`;
    console.log('DEBUG: Upload path:', filename);
    const fileRef = ref(storage, filename);

    try {
      console.log('DEBUG: Calling uploadBytes...');
      const uploadTask = uploadBytes(fileRef, file);
      await uploadTask;
      console.log('DEBUG: uploadBytes completed, getting download URL...');
      const url = await getDownloadURL(fileRef);
      console.log('DEBUG: Upload successful, URL:', url);
      return url;
    } catch (error) {
      console.error('DEBUG: Upload failed:', error);
      throw error;
    }
  }, [currentUserUid]);

  const processFile = useCallback(async (file) => {
    if (!file) return { file: null, previewUrl: null };

    console.log('DEBUG: File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

    try {
      const { validateFileSize, validateVideoDuration, validateAndCompressFile } = await import('../lib/mediaUtils');

      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        alert(sizeValidation.error);
        return { file: null, previewUrl: null };
      }

      if (file.type.startsWith('video/')) {
        try {
          const durationValidation = await validateVideoDuration(file);
          if (!durationValidation.valid) {
            alert(durationValidation.error);
            return { file: null, previewUrl: null };
          }
        } catch (error) {
          alert('Could not validate video duration. Please try again.');
          return { file: null, previewUrl: null };
        }
      }

      setIsCompressing(true);
      setCompressionProgress(0);

      let processedFile;
      try {
        processedFile = await validateAndCompressFile(file, (progress) => {
          console.log(`DEBUG: Compression progress: ${progress}%`);
          setCompressionProgress(progress);
        });
        setIsCompressing(false);
        setCompressionProgress(100);
      } catch (error) {
        setIsCompressing(false);
        setCompressionProgress(0);
        throw error;
      }

      console.log('DEBUG: File processed, new size:', processedFile.size);
      const previewUrl = URL.createObjectURL(processedFile);

      return { file: processedFile, previewUrl };
    } catch (error) {
      console.log('DEBUG: File processing failed:', error.message);
      alert(error.message);
      return { file: null, previewUrl: null };
    }
  }, []);

  return {
    uploading,
    setUploading,
    compressionProgress,
    isCompressing,
    uploadToStorage,
    processFile
  };
};