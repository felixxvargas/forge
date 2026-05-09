import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadAPI } from '../utils/api';

interface UploadMeta {
  blurred?: boolean;
  reason?: string;
}

interface ImageUploadProps {
  onUpload: (url: string, meta?: UploadMeta) => void;
  onRemove?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  existingUrl?: string;
  className?: string;
  accept?: string; // Allow customization of accepted file types
  maxSizeMB?: number; // Allow customization of max file size
  bucketType?: 'avatar' | 'post' | 'community-icon' | 'community-banner'; // Specify which bucket to upload to
}

export function ImageUpload({
  onUpload,
  onRemove,
  onUploadingChange,
  existingUrl,
  className = '',
  accept = 'image/*,video/*',
  maxSizeMB = 5,
  bucketType = 'avatar'
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(existingUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const processFile = useCallback(async (file: File) => {
    if (uploadingRef.current) return;

    const isImageOnly = accept === 'image/*';
    if (isImageOnly && !file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    } else if (!isImageOnly && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file');
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setError('');
    uploadingRef.current = true;
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const result = await uploadAPI.uploadFile(file, bucketType) as { url: string; blurred?: boolean; reason?: string };

      if (result.url) {
        onUpload(result.url, { blurred: result.blurred ?? false, reason: result.reason });
        setPreviewUrl(result.url);
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file. Please try again.');
      setPreviewUrl('');
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }, [bucketType, maxSizeMB, accept, onUpload, onUploadingChange]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (file) await processFile(file);
  }, [processFile]);

  const handleRemove = () => {
    setPreviewUrl('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) await processFile(file);
          }}
          disabled={isUploading}
          aria-label={isUploading ? 'Uploading image…' : `Upload ${accept === 'image/*' ? 'image' : 'image or video'}`}
          className={`w-full p-6 border-2 border-dashed rounded-lg transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50 ${
            isDragging
              ? 'border-accent bg-accent/10 scale-[1.01]'
              : 'border-border hover:border-accent hover:bg-accent/5'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : isDragging ? (
            <>
              <Upload className="w-8 h-8 text-accent" />
              <span className="text-sm font-medium text-accent">Drop to upload</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                Upload {accept === 'image/*' ? 'Image' : 'Image or Video'}
              </span>
              <span className="text-xs text-muted-foreground">Drop a file or click · Max {maxSizeMB}MB</span>
            </>
          )}
        </button>
      ) : (
        <div className="relative rounded-lg overflow-hidden">
          <img
            src={previewUrl}
            alt="Upload preview"
            className="w-full max-h-96 object-cover"
            onError={() => {
              setError('Failed to load image');
              setPreviewUrl('');
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove image"
            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}