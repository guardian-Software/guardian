/**
 * Media compression and optimization utilities
 */

// Image compression using Canvas API with progress callback and quality settings
export const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8, onProgress) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Quality presets
    const qualityPresets = {
      low: 0.6,
      medium: 0.8,
      high: 0.9,
      ultra: 0.95
    };

    // Use quality preset if string, otherwise use numeric value
    const finalQuality = typeof quality === 'string' ? qualityPresets[quality] || 0.8 : quality;

    img.onload = () => {
      onProgress?.(10); // Image loaded

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      onProgress?.(30); // Dimensions calculated

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      onProgress?.(70); // Image drawn to canvas

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            onProgress?.(100); // Compression complete
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        'image/jpeg',
        finalQuality
      );
    };

    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
};

// Video compression using MediaRecorder API with progress callback and optimizations
export const compressVideo = (file, targetSizeMB = 10, onProgress, quality = 'medium') => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Quality settings
    const qualitySettings = {
      low: { maxWidth: 640, fps: 15, bitrateMultiplier: 0.5 },
      medium: { maxWidth: 1280, fps: 24, bitrateMultiplier: 0.8 },
      high: { maxWidth: 1920, fps: 30, bitrateMultiplier: 1.0 }
    };

    const settings = qualitySettings[quality] || qualitySettings.medium;

    // Preload the entire video to ensure full buffering
    video.preload = 'auto';

    let metadataLoaded = false;
    let canPlayThrough = false;

    const tryStartCompression = () => {
      if (metadataLoaded && canPlayThrough) {
        onProgress?.(10); // Metadata loaded

        // Optimize canvas dimensions based on quality
        canvas.width = Math.min(video.videoWidth, settings.maxWidth);
        canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;

        onProgress?.(20); // Canvas dimensions set

        const stream = canvas.captureStream(settings.fps);
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: Math.min(
            targetSizeMB * 1024 * 1024 * 8 / video.duration * settings.bitrateMultiplier,
            8000000 // Cap at 8Mbps for quality
          )
        });

        const chunks = [];
        let progressInterval;

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          clearInterval(progressInterval);
          onProgress?.(95); // Recording stopped

          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
            type: 'video/webm',
            lastModified: Date.now(),
          });

          onProgress?.(100); // Compression complete
          resolve(compressedFile);
        };

        recorder.onerror = () => {
          clearInterval(progressInterval);
          reject(new Error('Video compression failed'));
        };

        video.onplay = () => {
          onProgress?.(30); // Video started playing

          const drawFrame = () => {
            if (!video.paused && !video.ended) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              requestAnimationFrame(drawFrame);
            }
          };
          drawFrame();

          // Progress tracking during recording with time-based estimation
          progressInterval = setInterval(() => {
            const progress = 30 + (video.currentTime / video.duration) * 60; // 30-90% range
            onProgress?.(Math.min(progress, 90));
          }, 200);
        };

        video.onended = () => {
          clearInterval(progressInterval);
          recorder.stop();
        };

        recorder.start();
        video.play().catch(reject);
      }
    };

    video.onloadedmetadata = () => {
      metadataLoaded = true;
      tryStartCompression();
    };

    video.oncanplaythrough = () => {
      canPlayThrough = true;
      tryStartCompression();
    };

    video.onerror = () => reject(new Error('Video loading failed'));
    video.src = URL.createObjectURL(file);
  });
};

// Progressive image loading with blur placeholder
export const createProgressiveImage = (src, placeholderSrc = null) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    if (placeholderSrc) {
      img.style.filter = 'blur(10px)';
      img.src = placeholderSrc;
    }

    const fullImg = new Image();
    fullImg.onload = () => {
      img.src = src;
      img.style.filter = 'none';
      img.style.transition = 'filter 0.3s ease-in-out';
      resolve(img);
    };

    fullImg.onerror = reject;
    fullImg.src = src;
  });
};

// Lazy loading utility
export const lazyLoadImage = (imgElement, src) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    },
    { rootMargin: '50px' }
  );

  observer.observe(imgElement);
};

// Cache management
const CACHE_NAME = 'guardian-media-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const cacheMedia = async (url, response) => {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    const cacheResponse = new Response(response.clone().body, {
      headers: {
        ...response.headers,
        'sw-cache-timestamp': Date.now().toString()
      }
    });
    await cache.put(url, cacheResponse);
  }
};

export const getCachedMedia = async (url) => {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (timestamp && (Date.now() - parseInt(timestamp)) < CACHE_DURATION) {
        return cachedResponse;
      } else {
        // Cache expired, remove it
        await cache.delete(url);
      }
    }
  }
  return null;
};

// File validation and size limits with progress callback and quality settings
export const validateAndCompressFile = async (file, onProgress, qualitySettings = {}) => {
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB for videos
  const MAX_IMAGE_SIZE_COMPRESSED = 2 * 1024 * 1024; // 2MB after compression

  // Pre-validation: Check file size before processing
  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image file size exceeds ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`);
    }
  } else if (file.type.startsWith('video/')) {
    // Validate video duration for videos (no size limit, compression will handle it)
    const durationValidation = await validateVideoDuration(file);
    if (!durationValidation.valid) {
      throw new Error(durationValidation.error);
    }
  }

  if (file.type.startsWith('image/')) {
    // Compress if larger than 2MB
    if (file.size > MAX_IMAGE_SIZE_COMPRESSED) {
      console.log('Compressing image...');
      return await compressImage(
        file,
        qualitySettings.maxWidth || 1920,
        qualitySettings.maxHeight || 1080,
        qualitySettings.imageQuality || 'medium',
        onProgress
      );
    }

    return file;
  } else if (file.type.startsWith('video/')) {
    // Always compress videos to ensure they meet duration and size limits
    console.log('Compressing video...');
    try {
      let compressedFile = await compressVideo(
        file,
        qualitySettings.targetSizeMB || 200,
        onProgress,
        qualitySettings.videoQuality || 'medium'
      );

      // If compressed file still exceeds 200MB, re-compress with lower quality until it fits
      while (compressedFile.size > 200 * 1024 * 1024) {
        console.log('Re-compressing video with lower quality to fit 200MB limit...');
        const currentQuality = qualitySettings.videoQuality || 'medium';
        let nextQuality = 'low';
        if (currentQuality === 'high') nextQuality = 'medium';
        else if (currentQuality === 'medium') nextQuality = 'low';

        compressedFile = await compressVideo(
          file,
          200,
          onProgress,
          nextQuality
        );
        qualitySettings.videoQuality = nextQuality;
      }

      return compressedFile;
    } catch (error) {
      console.warn('Video compression failed, using original:', error);
      return file;
    }
  }

  return file;
};

// Pre-validation function for immediate feedback
export const validateFileSize = (file) => {
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
  const MAX_VIDEO_DURATION = 10 * 60; // 10 minutes in seconds

  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image file size exceeds ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit` };
    }
  } else if (file.type.startsWith('video/')) {
    // No size limit for videos, compression will handle it
    // Check video duration (this will be validated during compression)
    // We'll add duration validation in the compression function
  }

  return { valid: true };
};

// Validate video duration
export const validateVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const MAX_VIDEO_DURATION = 10 * 60; // 10 minutes in seconds
      if (video.duration > MAX_VIDEO_DURATION) {
        resolve({ valid: false, error: `Video duration exceeds 10 minutes limit (${Math.round(video.duration / 60)} minutes)` });
      } else {
        resolve({ valid: true });
      }
    };

    video.onerror = () => reject(new Error('Could not load video metadata'));
    video.src = URL.createObjectURL(file);
  });
};