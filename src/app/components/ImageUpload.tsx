import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadAPI } from '../utils/api';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  onRemove?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  existingUrl?: string;
  className?: string;
  accept?: string; // Allow customization of accepted file types
  maxSizeMB?: number; // Allow customization of max file size
  bucketType?: 'avatar' | 'banner' | 'post' | 'community-icon' | 'community-banner'; // Specify which bucket to upload to
}

export function ImageUpload({
  onUpload,
  onRemove,
  onUploadingChange,
  existingUrl,
  className = '',
  accept = 'image/*,video/*',
  maxSizeMB = 50,
  bucketType = 'avatar'
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(existingUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadingRef.current) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input immediately so re-selecting the same file works
    // and stale change events can't re-fire
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate file type based on accept prop
    const isImageOnly = accept === 'image/*';
    if (isImageOnly && !file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    } else if (!isImageOnly && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file');
      return;
    }

    // Validate file size
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
      // Create local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Upload to backend (bucketType is the short key; api.ts maps it to the real bucket name)
      console.log('[ImageUpload] Starting upload, bucketType:', bucketType);
      const result = await uploadAPI.uploadFile(file, bucketType);

      console.log('[ImageUpload] Upload result:', result);

      if (result.url) {
        onUpload(result.url);
        setPreviewUrl(result.url);
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (err: any) {
      console.error('[ImageUpload] Upload error:', err);

      // Display user-friendly error message
      let errorMessage = 'Failed to upload file. Please try again.';

      if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setPreviewUrl('');
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }, [bucketType, maxSizeMB, accept, onUpload, onUploadingChange]);

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
          disabled={isUploading}
          className="w-full p-6 border-2 border-dashed border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                Click to upload {accept === 'image/*' ? 'image' : 'image or video'}
              </span>
              <span className="text-xs text-muted-foreground">Max {maxSizeMB}MB</span>
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
            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}