"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, X, Loader2 } from "lucide-react";
import { getPresignedUrl, isS3Url, isPresignedUrl } from '@/lib/s3Utils';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  autoplay?: boolean;
  mustWatch?: boolean;
  displayMode?: "inline" | "modal";
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number, percentage: number) => void;
  onClose?: () => void;
  className?: string;
  enablePeriodicSave?: boolean;
  onPeriodicSave?: (currentTime: number, duration: number, percentage: number, completed: boolean) => void;
  initialPosition?: number;
}

export default function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  autoplay = false,
  mustWatch = false,
  displayMode = "inline",
  onComplete,
  onTimeUpdate,
  onClose,
  className = "",
  enablePeriodicSave = false,
  onPeriodicSave,
  initialPosition = 0,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [presignedVideoUrl, setPresignedVideoUrl] = useState<string | null>(null);
  const [presignedThumbnailUrl, setPresignedThumbnailUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const lastTimeRef = useRef(0);
  const autoplayAttemptedRef = useRef(false);

  // Get presigned URL for S3 thumbnail
  useEffect(() => {
    async function fetchPresignedThumbnailUrl() {
      if (!thumbnailUrl) {
        setPresignedThumbnailUrl(null);
        return;
      }
      
      // If it's already a presigned URL or not an S3 URL, use it directly
      const alreadyPresigned = isPresignedUrl(thumbnailUrl);
      const isS3 = isS3Url(thumbnailUrl);
      
      if (alreadyPresigned || !isS3) {
        setPresignedThumbnailUrl(thumbnailUrl);
        return;
      }
      
      try {
        console.log('[VideoPlayer] Fetching presigned URL for thumbnail...');
        const presigned = await getPresignedUrl(thumbnailUrl);
        console.log('[VideoPlayer] Got presigned thumbnail URL');
        setPresignedThumbnailUrl(presigned || thumbnailUrl);
      } catch (err) {
        console.error('[VideoPlayer] Failed to get presigned thumbnail URL:', err);
        setPresignedThumbnailUrl(thumbnailUrl); // Fallback to original URL
      }
    }
    
    fetchPresignedThumbnailUrl();
  }, [thumbnailUrl]);

  // Get presigned URL for S3 videos
  useEffect(() => {
    async function fetchPresignedUrl() {
      console.log('[VideoPlayer] fetchPresignedUrl called with:', videoUrl);
      
      if (!videoUrl) {
        console.log('[VideoPlayer] No videoUrl, setting null');
        setPresignedVideoUrl(null);
        setLoadingUrl(false);
        return;
      }
      
      setLoadingUrl(true);
      
      // If it's already a presigned URL or not an S3 URL, use it directly
      const alreadyPresigned = isPresignedUrl(videoUrl);
      const isS3 = isS3Url(videoUrl);
      console.log('[VideoPlayer] URL check:', { alreadyPresigned, isS3 });
      
      if (alreadyPresigned || !isS3) {
        console.log('[VideoPlayer] Using URL directly (already presigned or not S3)');
        setPresignedVideoUrl(videoUrl);
        setLoadingUrl(false);
        return;
      }
      
      try {
        console.log('[VideoPlayer] Fetching presigned URL from API...');
        const presigned = await getPresignedUrl(videoUrl);
        console.log('[VideoPlayer] Got presigned URL:', presigned?.substring(0, 100));
        setPresignedVideoUrl(presigned || videoUrl);
      } catch (err) {
        console.error('[VideoPlayer] Failed to get presigned URL:', err);
        setPresignedVideoUrl(videoUrl); // Fallback to original URL
      } finally {
        console.log('[VideoPlayer] Setting loadingUrl to false');
        setLoadingUrl(false);
      }
    }
    
    fetchPresignedUrl();
  }, [videoUrl]);

  // Seek to initial position if resuming
  useEffect(() => {
    if (initialPosition > 0 && videoRef.current && videoRef.current.readyState >= 2) {
      videoRef.current.currentTime = initialPosition;
      lastTimeRef.current = initialPosition;
    }
  }, [initialPosition, videoRef.current?.readyState]);

  // Periodic auto-save (every 30 seconds)
  useEffect(() => {
    if (!enablePeriodicSave || !onPeriodicSave) return;

    const interval = setInterval(() => {
      if (isPlaying && videoRef.current) {
        const current = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        const percentage = dur > 0 ? (current / dur) * 100 : 0;
        const completed = percentage >= 90;
        
        try {
          onPeriodicSave(current, dur, percentage, completed);
        } catch (err) {
          console.error('[VideoPlayer] Periodic save failed:', err);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isPlaying, enablePeriodicSave, onPeriodicSave]);

  // Page unload handler - save progress before leaving
  useEffect(() => {
    if (!enablePeriodicSave || !onPeriodicSave) return;

    const handleBeforeUnload = () => {
      if (videoRef.current) {
        const current = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        const percentage = dur > 0 ? (current / dur) * 100 : 0;
        const completed = percentage >= 90;
        
        try {
          // Use sendBeacon for guaranteed delivery on page unload
          // Note: sendBeacon would need proper URL configuration in production
          onPeriodicSave(current, dur, percentage, completed);
        } catch (err) {
          console.error('[VideoPlayer] Unload save failed:', err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) {
        // Page is being hidden, save current progress
        const current = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        const percentage = dur > 0 ? (current / dur) * 100 : 0;
        const completed = percentage >= 90;
        
        try {
          onPeriodicSave(current, dur, percentage, completed);
        } catch (err) {
          console.error('[VideoPlayer] Visibility save failed:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enablePeriodicSave, onPeriodicSave]);

  const handlePlay = () => {
    console.log('[VideoPlayer] handlePlay clicked, videoRef:', !!videoRef.current);
    if (videoRef.current) {
      console.log('[VideoPlayer] Video element found, calling play()');
      console.log('[VideoPlayer] Video src:', videoRef.current.src?.substring(0, 100));
      console.log('[VideoPlayer] Video readyState:', videoRef.current.readyState);
      
      videoRef.current.play()
        .then(() => {
          console.log('[VideoPlayer] Play started successfully');
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('[VideoPlayer] Play failed:', err.name, err.message);
          // Try playing muted if autoplay policy blocks unmuted playback
          if (err.name === 'NotAllowedError') {
            console.log('[VideoPlayer] Trying muted playback...');
            videoRef.current!.muted = true;
            setIsMuted(true);
            videoRef.current!.play()
              .then(() => {
                console.log('[VideoPlayer] Muted play started');
                setIsPlaying(true);
              })
              .catch(e => console.error('[VideoPlayer] Muted play also failed:', e));
          }
        });
    } else {
      console.error('[VideoPlayer] No video ref available!');
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration;

      setCurrentTime(current);
      setDuration(dur);

      // Track watched time (avoid duplicates)
      if (current > lastTimeRef.current) {
        setWatchedSeconds((prev) => prev + (current - lastTimeRef.current));
      }
      lastTimeRef.current = current;

      // Calculate percentage
      const percentage = dur > 0 ? (current / dur) * 100 : 0;

      // Call onTimeUpdate callback
      if (onTimeUpdate) {
        onTimeUpdate(current, dur, percentage);
      }

      // Check if completed (90% threshold)
      if (percentage >= 90 && !hasCompleted) {
        setHasCompleted(true);
        if (onComplete) {
          onComplete();
        }
      }
    }
  };

  const handleEnded = () => {
    setHasCompleted(true);
    setIsPlaying(false);
    if (onComplete) {
      onComplete();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    if (onClose) {
      onClose();
    }
  };

  // Debug render state
  console.log('[VideoPlayer RENDER]', { 
    loadingUrl, 
    presignedVideoUrl: presignedVideoUrl?.substring(0, 80), 
    videoUrl: videoUrl?.substring(0, 80) 
  });

  // Show loading state while fetching presigned URL
  if (loadingUrl) {
    console.log('[VideoPlayer] Showing loading spinner');
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
        <div className="w-full h-64 flex items-center justify-center">
          <div className="text-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no presigned URL available
  if (!presignedVideoUrl) {
    console.log('[VideoPlayer] No presigned URL, showing error');
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Unable to load video. Please try refreshing the page.
        </p>
      </div>
    );
  }

  // Video content JSX (defined as a variable to avoid re-creating function on each render)
  const videoContentJsx = (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={presignedVideoUrl!}
        poster={presignedThumbnailUrl || undefined}
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => {
          const video = e.target as HTMLVideoElement;
          console.error('[VideoPlayer] Video error:', {
            error: video.error?.message,
            code: video.error?.code,
            src: video.src?.substring(0, 100)
          });
        }}
        onLoadedMetadata={() => {
          console.log('[VideoPlayer] Video metadata loaded, duration:', videoRef.current?.duration);
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            
            // Handle autoplay once metadata is loaded - muted autoplay is allowed by browsers
            if (autoplay && !autoplayAttemptedRef.current) {
              autoplayAttemptedRef.current = true;
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().catch(err => {
                console.log('[VideoPlayer] Autoplay blocked by browser:', err.message);
              });
            }
          }
        }}
        onCanPlay={() => console.log('[VideoPlayer] Video can play')}
        className="w-full max-h-[500px] object-contain"
      >
        Your browser does not support the video tag.
      </video>

      {/* Custom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 mb-3 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              (currentTime / duration) * 100
            }%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
          }}
        />

        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Pause className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Play className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Must Watch Warning */}
      {mustWatch && !hasCompleted && (
        <div className="absolute top-4 left-4 px-3 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg shadow-lg">
          Please watch this video to continue
        </div>
      )}

      {/* Completion Badge */}
      {hasCompleted && (
        <div className="absolute top-4 right-4 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg">
          ✓ Video Completed
        </div>
      )}
    </div>
  );

  if (displayMode === "modal") {
    return (
      <>
        {/* Thumbnail with Play Button */}
        {!showModal && (
          <div
            onClick={openModal}
            className="relative cursor-pointer group rounded-lg overflow-hidden"
          >
            {presignedThumbnailUrl ? (
              <img
                src={presignedThumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-64 object-cover group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
                <Play className="w-16 h-16 text-white opacity-80" />
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
              <div className="p-4 bg-white rounded-full group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl mx-4">
              <button
                onClick={closeModal}
                className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {videoContentJsx}
            </div>
          </div>
        )}
      </>
    );
  }

  // Inline mode
  return videoContentJsx;
}
