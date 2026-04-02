import { useNavigate } from 'react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { RELEASES } from '../components/WhatsNew';

export function WhatsNewPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">What's New</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        {RELEASES.map((release) => (
          <div key={release.version}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="font-semibold text-base">{release.version}</h2>
              <span className="text-xs text-muted-foreground ml-1">{release.date}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
            <div className="bg-card rounded-xl px-4 py-3 space-y-2.5">
              {release.highlights.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
