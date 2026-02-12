"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerWithTrackingProps {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  isMandatory: boolean;
  playMode: 'inline' | 'new_tab';
  responseId: string;
  participantId?: string;
  activityId: string;
  questionId: string;
  onCompletionChange?: (completed: boolean) => void;
}

export default function VideoPlayerWithTracking({
  videoUrl,
  thumbnailUrl,
  duration,
  isMandatory,
  playMode,
  responseId,
  participantId,
  activityId,
  questionId,
  onCompletionChange,
}: VideoPlayerWithTrackingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [plays, setPlays] = useState(0);
  const [pauses, setPauses] = useState(0);
  const [seeks, setSeeks] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const lastTrackedTime = useRef(0);
  const trackingInterval = useRef<NodeJS.Timeout | null>(null);

  // Load existing progress on mount
  useEffect(() => {
    loadProgress();
    
    return () => {
      // Cleanup: Track final progress before unmount
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
      if (videoRef.current && !videoRef.current.paused) {
        trackProgress();
      }
    };
  }, []);

  // Track progress every 10 seconds while playing
  useEffect(() => {
    if (isPlaying) {
      trackingInterval.current = setInterval(() => {
        trackProgress();
      }, 10000); // Every 10 seconds
    } else {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    }

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, [isPlaying, watchTime]);

  async function loadProgress() {
    try {
      const payload: any = {
        question_id: questionId,
      };

      // Add response_id if available, otherwise use participant_id + activity_id
      if (responseId) {
        payload.response_id = responseId;
      } else {
        payload.participant_id = participantId || null;
        payload.activity_id = activityId;
      }

      const response = await fetch('/api/public/videos/question/get-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.status === 'success' && data.data) {
        const savedWatchTime = data.data.watch_time_seconds || 0;
        setWatchTime(savedWatchTime);
        setCompleted(data.data.completed_watch || false);
        setPlays(data.data.total_plays || 0);
        setPauses(data.data.total_pauses || 0);
        setSeeks(data.data.total_seeks || 0);
        
        // Resume from saved position
        if (videoRef.current && savedWatchTime > 0) {
          videoRef.current.currentTime = Math.min(savedWatchTime, duration);
        }

        if (data.data.completed_watch && onCompletionChange) {
          onCompletionChange(true);
        }
      }
    } catch (error) {
      console.error('Failed to load video progress:', error);
    }
  }

  async function trackProgress() {
    if (!videoRef.current) return;

    const currentWatchTime = Math.floor(videoRef.current.currentTime);
    const isComplete = currentWatchTime >= duration * 0.95; // 95% completion threshold

    // Only track if time has actually progressed
    if (currentWatchTime === lastTrackedTime.current && !isComplete) {
      return;
    }

    lastTrackedTime.current = currentWatchTime;

    try {
      const payload: any = {
        response_id: responseId || null,
        participant_id: participantId || null,
        activity_id: activityId,
        question_id: questionId,
        watch_time_seconds: currentWatchTime,
        completed_watch: isComplete,
        total_plays: plays,
        total_pauses: pauses,
        total_seeks: seeks,
      };

      const response = await fetch('/api/public/videos/question/track-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setWatchTime(currentWatchTime);
        
        if (isComplete && !completed) {
          setCompleted(true);
          if (onCompletionChange) {
            onCompletionChange(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to track video progress:', error);
    }
  }

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
      setPlays(prev => prev + 1);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      setPauses(prev => prev + 1);
      trackProgress(); // Track when paused
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeeked = () => {
    setSeeks(prev => prev + 1);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCompleted(true);
    trackProgress(); // Final tracking
    if (onCompletionChange) {
      onCompletionChange(true);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (playMode === 'new_tab') {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Play className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-700 mb-4">
            This video will open in a new tab
          </p>
          <button
            onClick={() => window.open(videoUrl, '_blank')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Video in New Tab
          </button>
          {isMandatory && !completed && (
            <p className="mt-3 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
              ⚠️ You must watch the full video before submitting
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div 
        className="relative rounded-lg overflow-hidden bg-black group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="w-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleSeeked}
          onEnded={handleEnded}
          playsInline
        />

        {/* Custom Controls Overlay */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Play/Pause Button Center */}
          {!isPlaying && (
            <button
              onClick={handlePlay}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all hover:scale-110"
            >
              <Play className="w-8 h-8 text-gray-900 ml-1" />
            </button>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div className="w-full bg-gray-600 rounded-full h-1 cursor-pointer">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="hover:text-blue-400 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={toggleMute}
                  className="hover:text-blue-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <span className="text-xs font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="hover:text-blue-400 transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-600">
          <span>
            Watched: <span className="font-semibold text-gray-900">{formatTime(watchTime)}</span>
          </span>
          <span>
            Progress: <span className="font-semibold text-gray-900">{Math.min(100, Math.round((watchTime / duration) * 100))}%</span>
          </span>
        </div>
        {completed && (
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Completed
          </span>
        )}
      </div>

      {/* Mandatory Warning */}
      {isMandatory && !completed && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>You must watch at least 95% of this video before you can submit your response.</span>
          </p>
        </div>
      )}
    </div>
  );
}
