import { useState } from 'react';
import { Eye } from 'lucide-react';

interface BlurredImageProps {
  src: string;
  alt?: string;
  isBlurred?: boolean;
  className?: string;
}

export function BlurredImage({ src, alt = 'Post image', isBlurred = false, className = '' }: BlurredImageProps) {
  const [revealed, setRevealed] = useState(false);

  const showBlur = isBlurred && !revealed;

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover max-h-80 transition-all duration-300 ${showBlur ? 'blur-xl scale-105 pointer-events-none select-none' : ''}`}
      />
      {showBlur && (
        <button
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="flex flex-col items-center gap-1.5 text-white drop-shadow">
            <Eye className="w-7 h-7" />
            <span className="text-sm font-semibold">Sensitive content</span>
            <span className="text-xs opacity-80">Tap to view</span>
          </div>
        </button>
      )}
    </div>
  );
}
