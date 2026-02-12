"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, X } from "lucide-react";

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
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (autoplay && videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [autoplay]);

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
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
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

  const VideoContent = () => (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
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
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
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
              <VideoContent />
            </div>
          </div>
        )}
      </>
    );
  }

  // Inline mode
  return <VideoContent />;
}
