"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { fetchWithAuth } from "@/lib/api";

interface BulkImageUploadProps {
  value?: string[]; // Array of existing image URLs
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  placeholder?: string;
  showUniversalSizeHelper?: boolean;
}

// Universal image size recommendation (16:9 aspect ratio)
const UNIVERSAL_IMAGE_WIDTH = 1200;
const UNIVERSAL_IMAGE_HEIGHT = 675;

export default function BulkImageUpload({
  value = [],
  onChange,
  maxFiles = 20,
  maxSize = 5,
  placeholder = "Upload sequence images",
  showUniversalSizeHelper = false
}: BulkImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with value prop
  useEffect(() => {
    setPreviews(value);
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validation
    if (files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "error",
      });
      return;
    }

    // Check file sizes
    const oversizedFiles = files.filter(f => f.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `Maximum ${maxSize}MB per file`,
        variant: "error",
      });
      return;
    }

    // Check file types
    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed",
        variant: "error",
      });
      return;
    }

    try {
      setUploading(true);

      // Create FormData
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files[]', file);
      });

      // Upload to bulk API using fetchWithAuth
      const result = await fetchWithAuth('/uploads/s3/bulk', {
        method: 'POST',
        body: formData,
      });

      console.log('🖼️ [BULK UPLOAD] Response:', result);

      // Check for both response formats: {success: true, files: [...]} or {status: 'success', data: {files: [...]}}
      let uploadedFiles = null;
      
      if (result.status === 'success' && result.data && result.data.files) {
        uploadedFiles = result.data.files;
      } else if (result.success && result.files) {
        uploadedFiles = result.files;
      }

      if (uploadedFiles && Array.isArray(uploadedFiles)) {
        // Extract URLs from response (sorted by index)
        const uploadedUrls = uploadedFiles
          .sort((a: any, b: any) => a.index - b.index)
          .map((file: any) => file.url);
        
        console.log('🖼️ [BULK UPLOAD] Uploaded URLs:', uploadedUrls);
        
        // Update previews and notify parent
        setPreviews(uploadedUrls);
        onChange(uploadedUrls);

        toast({
          title: "Success!",
          description: `${uploadedUrls.length} images uploaded successfully`,
          variant: "success",
        });
      } else {
        console.error('🖼️ [BULK UPLOAD] Invalid response:', result);
        toast({
          title: "Upload issue",
          description: "Images may have uploaded but response was unexpected",
          variant: "warning",
        });
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "error",
      });
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newPreviews);
  };

  const handleClearAll = () => {
    setPreviews([]);
    onChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {placeholder}
            </>
          )}
        </Button>
        {previews.length > 0 && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Info Text */}
      <div className="flex items-start gap-2 text-xs text-gray-500">
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>Upload {maxFiles} images max, {maxSize}MB each. Order matters: seq0, seq1, seq2...</span>
      </div>

      {/* Universal Size Helper */}
      {showUniversalSizeHelper && previews.length === 0 && !uploading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs font-medium text-blue-900 mb-1">📐 Recommended Universal Size:</p>
          <p className="text-xs text-blue-700">
            <strong>{UNIVERSAL_IMAGE_WIDTH} × {UNIVERSAL_IMAGE_HEIGHT} pixels (16:9 ratio)</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            All images will maintain this aspect ratio across Desktop, Tablet, and Mobile.
          </p>
        </div>
      )}

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {previews.map((url, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
              style={{ aspectRatio: '16 / 9' }}
            >
              <img
                src={url}
                alt={`Sequence ${index}`}
                className="w-full h-full"
                style={{ objectFit: 'contain' }}
              />
              {/* Overlay with index */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">#{index}</div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    className="mt-2 h-6 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              {/* Index badge (always visible) */}
              <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                {index}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {previews.length === 0 && !uploading && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No sequence images uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Click the button above to upload</p>
        </div>
      )}
    </div>
  );
}
