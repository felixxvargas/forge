import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setFailed(false);
    setMetadata(null);

    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(json => {
        if (!mounted) return;
        if (json.status !== 'success') { setFailed(true); return; }
        const d = json.data ?? {};
        setMetadata({
          title: d.title ?? undefined,
          description: d.description ?? undefined,
          image: d.image?.url ?? d.screenshot?.url ?? undefined,
          siteName: d.publisher ?? new URL(url).hostname,
        });
      })
      .catch(() => { if (mounted) setFailed(true); })
      .finally(() => { if (mounted) setIsLoading(false); });

    return () => { mounted = false; };
  }, [url]);

  if (isLoading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="mt-2 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm text-muted-foreground hover:bg-secondary transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{new URL(url).hostname}</span>
      </a>
    );
  }

  if (failed || !metadata) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="mt-2 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm text-accent hover:bg-secondary transition-colors group"
      >
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate group-hover:underline">{url}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="mt-2 mb-3 block rounded-xl border border-border overflow-hidden hover:border-accent/50 transition-colors group"
    >
      {metadata.image && (
        <div className="aspect-video bg-secondary relative overflow-hidden">
          <img
            src={metadata.image}
            alt={metadata.title || 'Link preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.currentTarget.parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3 bg-secondary/30">
        {metadata.siteName && (
          <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide truncate">
            {metadata.siteName}
          </p>
        )}
        {metadata.title && (
          <p className="font-medium text-sm line-clamp-2 group-hover:text-accent transition-colors">
            {metadata.title}
          </p>
        )}
        {metadata.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  );
}
