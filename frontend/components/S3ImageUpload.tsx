"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api";

// Global cache for S3 config to prevent multiple API calls across components
let s3ConfigCache: { configured: boolean; checkedAt: number } | null = null;
const S3_CONFIG_CACHE_TTL = 60000; // 1 minute cache

interface S3ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  questionnaireId?: number;
  questionId?: string;
  maxSize?: number; // in MB
  accept?: string;
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
  showUniversalSizeHelper?: boolean;
}

// Universal image size recommendation (16:9 aspect ratio)
const UNIVERSAL_IMAGE_WIDTH = 1200;
const UNIVERSAL_IMAGE_HEIGHT = 675;
const UNIVERSAL_ASPECT_RATIO = UNIVERSAL_IMAGE_WIDTH / UNIVERSAL_IMAGE_HEIGHT;
const ASPECT_RATIO_TOLERANCE = 0.1;

export default function S3ImageUpload({
  value,
  onChange,
  onRemove,
  folder = "questionnaire-images",
  questionnaireId,
  questionId,
  maxSize = 15,
  accept = "image/png,image/jpeg,image/gif,image/svg+xml,image/webp",
  className = "",
  placeholder = "Click to upload or drag and drop",
  showPreview = true,
  showUniversalSizeHelper = false,
}: S3ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [aspectRatioWarning, setAspectRatioWarning] = useState<string | null>(null);
  const [s3Configured, setS3Configured] = useState<boolean | null>(
    s3ConfigCache && Date.now() - s3ConfigCache.checkedAt < S3_CONFIG_CACHE_TTL 
      ? s3ConfigCache.configured 
      : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkingRef = useRef(false); // Prevent concurrent checks

  // Check S3 configuration on first interaction (with global caching)
  const checkS3Config = useCallback(async () => {
    // Return cached value if available and recent
    if (s3ConfigCache && Date.now() - s3ConfigCache.checkedAt < S3_CONFIG_CACHE_TTL) {
      if (!s3ConfigCache.configured) {
        setError("S3 storage is not configured. Please configure AWS S3 in System Settings.");
      }
      setS3Configured(s3ConfigCache.configured);
      return s3ConfigCache.configured;
    }
    
    if (s3Configured !== null) return s3Configured;
    
    // Prevent concurrent API calls
    if (checkingRef.current) return s3Configured;
    checkingRef.current = true;
    
    try {
      const result = await fetchWithAuth("/uploads/s3/config", { method: "GET" });
      s3ConfigCache = { configured: result.configured, checkedAt: Date.now() };
      setS3Configured(result.configured);
      if (!result.configured) {
        setError("S3 storage is not configured. Please configure AWS S3 in System Settings.");
      }
      return result.configured;
    } catch (err) {
      s3ConfigCache = { configured: false, checkedAt: Date.now() };
      setS3Configured(false);
      setError("Failed to check S3 configuration");
      return false;
    } finally {
      checkingRef.current = false;
    }
  }, [s3Configured]);

  const handleFile = async (file: File) => {
    setError(null);
    setAspectRatioWarning(null);

    // Check S3 config
    const isConfigured = await checkS3Config();
    if (!isConfigured) return;

    // Validate file type
    const validTypes = accept.split(",").map(t => t.trim());
    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${accept}`);
      return;
    }

    // Soft validation: Check aspect ratio (warning only)
    if (showUniversalSizeHelper && file.type.startsWith('image/')) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const deviation = Math.abs(aspectRatio - UNIVERSAL_ASPECT_RATIO) / UNIVERSAL_ASPECT_RATIO;
        
        if (deviation > ASPECT_RATIO_TOLERANCE) {
          setAspectRatioWarning(
            `⚠️ Image aspect ratio is ${img.width}×${img.height} (${aspectRatio.toFixed(2)}:1). ` +
            `Recommended ratio is 16:9 (1.78:1) for best cross-device display.`
          );
        }
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    }

    // Validate file size
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File too large. Maximum size: ${maxSize}MB`);
      return;
    }

    // Upload to S3
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      if (questionnaireId) formData.append("questionnaire_id", String(questionnaireId));
      if (questionId) formData.append("question_id", questionId);

      const result = await fetchWithAuth("/uploads/s3", {
        method: "POST",
        body: formData,
      });

      console.log("S3 Upload response:", result);

      if (result.status === "success" && result.data?.url) {
        console.log("Setting image URL:", result.data.url);
        onChange(result.data.url);
        setError(null);
      } else {
        console.error("Upload failed - result:", result);
        setError(result.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
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

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange("");
    if (onRemove) onRemove();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClick = () => {
    // Don't await - open file picker immediately to maintain user activation
    // S3 config will be checked when file is selected
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Upload Area */}
      {!value ? (
        <>
          <div
            onClick={handleClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors duration-200
              ${dragActive 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }
              ${uploading ? "pointer-events-none opacity-60" : ""}
              ${error ? "border-red-300 bg-red-50" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleInputChange}
              className="hidden"
              disabled={uploading}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">{placeholder}</span>
                <span className="text-xs text-gray-400">
                  PNG, JPG, GIF, SVG, WebP up to {maxSize}MB
                </span>
              </div>
            )}
          </div>
          
          {/* Universal Size Helper */}
          {showUniversalSizeHelper && !error && !uploading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs font-medium text-blue-900 mb-1">📐 Recommended Universal Size:</p>
              <p className="text-xs text-blue-700">
                <strong>{UNIVERSAL_IMAGE_WIDTH} × {UNIVERSAL_IMAGE_HEIGHT} pixels (16:9 ratio)</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This size works across Desktop, Tablet, and Mobile. Keep important visuals centered for best results.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Preview */
        <>
          {aspectRatioWarning && (
            <div className="p-3 border border-yellow-300 rounded-lg bg-yellow-50">
              <div className="flex items-start gap-2 text-yellow-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-xs">{aspectRatioWarning}</span>
              </div>
            </div>
          )}
          
          {showPreview && (
            <div className="relative rounded-lg border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {value.endsWith(".svg") ? (
                  <object
                    data={value}
                    type="image/svg+xml"
                    className="max-w-full max-h-48"
                    style={{ objectFit: 'contain' }}
                  >
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </object>
                ) : (
                  <img
                    src={value}
                    alt="Uploaded image"
                    className="max-w-full max-h-48"
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-2 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-600 truncate flex-1">
                    {value.split("/").pop()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* URL Input for manual entry */}
      {!showPreview && value && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-xs text-green-700 truncate flex-1">{value}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
}
