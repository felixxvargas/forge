import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { RELEASES } from '../components/WhatsNew';

export function WhatsNewPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  const [current, ...past] = RELEASES;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">What's New</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-10">
        {/* Current release — highlighted */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-base">{current.version}</h2>
            <span className="text-xs text-muted-foreground ml-1">{current.date}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-accent/15 text-accent">Current</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{current.summary}</p>
          <div className="bg-card rounded-xl px-4 py-3 space-y-2.5">
            {current.highlights.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Past releases */}
        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past Versions</h2>
            </div>
            <div className="space-y-8">
              {past.map((release) => (
                <div key={release.version}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base text-muted-foreground">{release.version}</h3>
                    <span className="text-xs text-muted-foreground ml-1">{release.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{release.summary}</p>
                  <div className="bg-card/60 rounded-xl px-4 py-3 space-y-2.5">
                    {release.highlights.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
