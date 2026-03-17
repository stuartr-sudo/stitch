/**
 * Frame Extractor — Extract the last frame from a video as a data URL.
 * Used for scene chaining in Storyboard Planner: last frame of scene N
 * becomes the start frame for scene N+1.
 */

/**
 * Extract the last frame from a video URL.
 * @param {string} videoUrl - URL of the video
 * @param {number} [offsetFromEnd=0.1] - Seconds before the end to capture (avoids black frames)
 * @returns {Promise<string>} Base64 data URL of the captured frame (image/jpeg)
 */
export async function extractLastFrame(videoUrl, offsetFromEnd = 0.1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Frame extraction timed out'));
    }, 30000);

    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      video.load();
    }

    function onError() {
      cleanup();
      reject(new Error('Failed to load video for frame extraction'));
    }

    function onSeeked() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    }

    function onMetadata() {
      if (!video.duration || !isFinite(video.duration)) {
        cleanup();
        reject(new Error('Could not determine video duration'));
        return;
      }
      const seekTime = Math.max(0, video.duration - offsetFromEnd);
      video.currentTime = seekTime;
    }

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.src = videoUrl;
  });
}
