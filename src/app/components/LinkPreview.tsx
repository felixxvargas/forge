import { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
}

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // For now, we'll show a simple link preview without fetching metadata
    // In a production app, you would call a backend endpoint that fetches
    // the og:meta tags from the URL
    
    // Extract domain from URL for display
    try {
      const urlObj = new URL(url);
      setMetadata({
        title: urlObj.hostname,
        description: url,
        siteName: urlObj.hostname
      });
      setIsLoading(false);
    } catch {
      setError(true);
      setIsLoading(false);
    }
  }, [url]);

  if (isLoading) {
    return (
      <div className="mt-3 border border-border rounded-lg p-4 flex items-center justify-center bg-secondary/20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block border border-border rounded-lg p-3 hover:bg-secondary/20 transition-colors group"
      >
        <div className="flex items-center gap-2 text-accent">
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm truncate group-hover:underline">{url}</span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors group"
    >
      {metadata.image && (
        <div className="aspect-video bg-secondary relative overflow-hidden">
          <img
            src={metadata.image}
            alt={metadata.title || 'Link preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        {metadata.siteName && (
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
            {metadata.siteName}
          </p>
        )}
        {metadata.title && (
          <h4 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-accent transition-colors">
            {metadata.title}
          </h4>
        )}
        {metadata.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2 text-accent">
          <ExternalLink className="w-3 h-3" />
          <span className="text-xs truncate">{url}</span>
        </div>
      </div>
    </a>
  );
}
