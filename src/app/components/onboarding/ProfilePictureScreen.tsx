'use client';
import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, ArrowLeft, User } from 'lucide-react';
import { uploadAPI } from '../../utils/api';
import { toast } from 'sonner';

interface ProfilePictureScreenProps {
  onComplete: (avatarUrl: string | null) => void;
  onBack?: () => void;
}

export function ProfilePictureScreen({ onComplete, onBack }: ProfilePictureScreenProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { url } = await uploadAPI.uploadFile(file, 'avatar');
      setPreview(url);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      {onBack && (
        <button onClick={onBack} className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <div className="min-h-screen px-6 py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8">
          <motion.div
            className="flex flex-col items-center gap-2 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold">Add a photo</h1>
            <p className="text-muted-foreground">Help other gamers recognise you</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-32 h-32 rounded-full bg-secondary border-2 border-dashed border-accent/40 flex items-center justify-center overflow-hidden hover:border-accent transition-colors group"
          >
            {preview ? (
              <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-accent transition-colors">
                <User className="w-10 h-10" />
                <Camera className="w-5 h-5" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <motion.div
            className="w-full space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {preview ? 'Change photo' : 'Upload photo'}
            </button>
            <button
              onClick={() => onComplete(preview)}
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {preview ? 'Continue' : 'Continue'}
            </button>
            <button
              onClick={() => onComplete(null)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
