"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Video, X, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { getPresignedUrl, isS3Url, isPresignedUrl } from '@/lib/s3Utils';

interface S3VideoUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onRemove?: () => void;
  questionnaireId?: string | number;
  maxSize?: number; // in MB
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
  onMetadataChange?: (metadata: { duration: number }) => void;
  onUploadComplete?: (url: string, thumbnailUrl?: string, duration?: number) => void;
  existingVideoUrl?: string;
  accept?: string;
  maxSizeInMB?: number;
  label?: string;
}

export default function S3VideoUpload({
  value,
  onChange,
  onRemove,
  questionnaireId,
  maxSize = 100,
  className = "",
  placeholder = "Click to upload video or drag and drop",
  showPreview = true,
  onMetadataChange,
  onUploadComplete,
  existingVideoUrl,
  accept,
  maxSizeInMB,
  label,
}: S3VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [presignedVideoUrl, setPresignedVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use existingVideoUrl if provided, otherwise use value
  const videoUrl = existingVideoUrl || value;
  // Use maxSizeInMB if provided, otherwise use maxSize
  const maxSizeValue = maxSizeInMB || maxSize;

  // Get presigned URL for S3 videos
  useEffect(() => {
    async function fetchPresignedUrl() {
      if (!videoUrl) {
        setPresignedVideoUrl(null);
        return;
      }
      
      // If it's already a presigned URL or not an S3 URL, use it directly
      if (isPresignedUrl(videoUrl) || !isS3Url(videoUrl)) {
        setPresignedVideoUrl(videoUrl);
        return;
      }
      
      try {
        const presigned = await getPresignedUrl(videoUrl);
        setPresignedVideoUrl(presigned || videoUrl);
      } catch (err) {
        console.error('[S3VideoUpload] Failed to get presigned URL:', err);
        setPresignedVideoUrl(videoUrl); // Fallback to original URL
      }
    }
    
    fetchPresignedUrl();
  }, [videoUrl]);

  const handleFile = async (file: File) => {
    setError(null);
    setUploadProgress(0);

    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid video format. Only MP4, MOV, and WEBM are allowed.");
      return;
    }

    // Validate file size
    const maxBytes = maxSizeValue * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File too large. Maximum size: ${maxSizeValue}MB`);
      return;
    }

    // Get video duration and upload
    const video = document.createElement("video");
    video.preload = "metadata";
    
    video.onloadedmetadata = async () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      
      if (onMetadataChange) {
        onMetadataChange({ duration });
      }

      // Upload to S3
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (questionnaireId) {
          formData.append("questionnaire_id", String(questionnaireId));
        }

        const result = await fetchWithAuth("/videos/upload", {
          method: "POST",
          body: formData,
        });

        if (result.status === "success" && result.data?.video_url) {
          const videoUrl = result.data.video_url;
          const thumbnailUrl = result.data.thumbnail_url;
          
          // Call onUploadComplete if provided (new interface)
          if (onUploadComplete) {
            onUploadComplete(videoUrl, thumbnailUrl, duration);
          }
          
          // Call onChange for backward compatibility
          if (onChange) {
            onChange(videoUrl);
          }
          
          setError(null);
        } else {
          setError(result.message || "Upload failed");
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError(err instanceof Error ? err.message : "Failed to upload video");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      setError("Failed to load video metadata");
    };
    
    video.src = URL.createObjectURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
    if (onChange) {
      onChange("");
    }
    if (onUploadComplete) {
      onUploadComplete("", "", 0);
    }
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Upload Area */}
      {!videoUrl ? (
        <>
          <div
            onClick={handleClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors
              ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
              ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-gray-700">Uploading video...</p>
                {uploadProgress > 0 && (
                  <div className="w-full max-w-xs">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Video className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {placeholder}
                </p>
                <p className="text-xs text-gray-500">
                  MP4, MOV, WEBM up to {maxSizeValue}MB
                </p>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={accept || "video/mp4,video/webm,video/quicktime"}
              onChange={handleInputChange}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Video Preview */}
          {showPreview && (
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-black">
              {presignedVideoUrl ? (
                <video
                  src={presignedVideoUrl}
                  controls
                  className="w-full max-h-64 object-contain"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              )}
              
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                title="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {!showPreview && (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Video className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Video uploaded</p>
                  <p className="text-xs text-gray-500">Click to preview or remove</p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove video"
              >
                <X className="w-5 h-5 text-red-600" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
