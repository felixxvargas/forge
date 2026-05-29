'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Sparkles, Send, ThumbsUp, ThumbsDown, Gamepad2, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { gamesAPI } from '../utils/api';
import { useNavigate } from '@/compat/router';

interface GameInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedGame?: { id: string; title: string; coverUrl?: string } | null;
}

type Step = 'game-select' | 'question' | 'result' | 'submit' | 'submitted';

interface GeminiResult {
  answer: string;
  used: number;
  remaining: number;
  limit: number;
}

interface SelectedGame {
  id: string;
  title: string;
  coverUrl?: string;
}

export function GameInsightModal({ isOpen, onClose, preselectedGame }: GameInsightModalProps) {
  const { currentUser, session, isAuthenticated } = useAppData() as any;
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(preselectedGame ? 'question' : 'game-select');
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(preselectedGame ?? null);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [gameSearching, setGameSearching] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeminiResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [insightId, setInsightId] = useState<string | null>(null);
  const gameSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (preselectedGame) {
        setSelectedGame(preselectedGame);
        setStep('question');
      } else {
        setStep('game-select');
        setSelectedGame(null);
      }
      setGameQuery('');
      setGameResults([]);
      setQuestion('');
      setResult(null);
      setInsightId(null);
    }
  }, [isOpen, preselectedGame]);

  // Auto-focus question input when on question step
  useEffect(() => {
    if (step === 'question' && questionRef.current) {
      setTimeout(() => questionRef.current?.focus(), 100);
    }
  }, [step]);

  const searchGames = useCallback(async (q: string) => {
    if (!q.trim()) { setGameResults([]); return; }
    setGameSearching(true);
    try {
      const res = await gamesAPI.searchGames(q, 8);
      const games: any[] = Array.isArray(res) ? res : res?.games ?? [];
      setGameResults(games);
    } catch {
      setGameResults([]);
    } finally {
      setGameSearching(false);
    }
  }, []);

  const handleGameQueryChange = (val: string) => {
    setGameQuery(val);
    if (gameSearchRef.current) clearTimeout(gameSearchRef.current);
    gameSearchRef.current = setTimeout(() => searchGames(val), 300);
  };

  const selectGame = (game: any) => {
    const coverUrl = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url;
    setSelectedGame({ id: String(game.id), title: game.title, coverUrl });
    setStep('question');
  };

  const handleAskGemini = async () => {
    if (!question.trim() || !selectedGame || loading) return;
    if (!isAuthenticated) {
      toast.error('Sign in to use Forge AI Insights');
      return;
    }

    setLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const token = s?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/gemini/game-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: question.trim(), gameId: selectedGame.id, gameTitle: selectedGame.title }),
      });

      if (res.status === 429) {
        const data = await res.json();
        toast.error(data.error || 'Daily query limit reached');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get answer');
      }

      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch (err: any) {
      toast.error(err.message || 'Failed to get answer from Gemini');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInsight = async () => {
    if (!result || !selectedGame || submitting) return;
    setSubmitting(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const token = s?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/insights/game-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameId: selectedGame.id,
          gameTitle: selectedGame.title,
          query: question.trim(),
          content: result.answer,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit insight');
      }

      const insight = await res.json();
      setInsightId(insight.id);
      setStep('submitted');
      toast.success('Insight submitted! The community will review it.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit insight');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareAsPost = () => {
    if (!result || !selectedGame) return;
    const text = `${question}\n\n${result.answer}`;
    navigate(`/create-post?prefill=${encodeURIComponent(text)}&gameId=${selectedGame.id}&gameTitle=${encodeURIComponent(selectedGame.title)}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full sm:max-w-lg bg-sidebar rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          style={{ border: '1px solid rgba(139,92,246,0.2)', maxHeight: '90dvh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">Forge AI Insights</h2>
                {result && (
                  <p className="text-xs text-muted-foreground">{result.remaining} queries remaining today</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90dvh - 64px)' }}>
            {/* Step: Game Select */}
            {step === 'game-select' && (
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Search for a game to generate AI-powered insights you can contribute to the Forge wiki.
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search for a game..."
                      value={gameQuery}
                      onChange={e => handleGameQueryChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm placeholder-muted-foreground focus:outline-none focus:border-accent"
                      autoFocus
                    />
                  </div>
                </div>

                {gameSearching && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {gameResults.length > 0 && (
                  <div className="space-y-1">
                    {gameResults.map(game => {
                      const cover = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url;
                      return (
                        <button
                          key={game.id}
                          onClick={() => selectGame(game)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors text-left"
                        >
                          {cover ? (
                            <img src={cover} alt={game.title} className="w-9 h-12 rounded-md object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-12 rounded-md bg-secondary flex items-center justify-center shrink-0">
                              <Gamepad2 className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{game.title}</p>
                            {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {gameQuery.trim() && !gameSearching && gameResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No games found</p>
                )}
              </div>
            )}

            {/* Step: Question */}
            {step === 'question' && selectedGame && (
              <div className="p-4 space-y-4">
                {/* Selected game chip */}
                <button
                  onClick={() => setStep('game-select')}
                  className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-xl text-sm hover:bg-accent/20 transition-colors"
                >
                  {selectedGame.coverUrl ? (
                    <img src={selectedGame.coverUrl} alt={selectedGame.title} className="w-6 h-8 rounded object-cover" />
                  ) : (
                    <Gamepad2 className="w-4 h-4 text-accent" />
                  )}
                  <span className="font-medium text-accent truncate max-w-[200px]">{selectedGame.title}</span>
                  <X className="w-3.5 h-3.5 text-accent/60 shrink-0" />
                </button>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ask anything about <strong>{selectedGame.title}</strong>
                  </p>
                  <textarea
                    ref={questionRef}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAskGemini(); }}
                    placeholder="e.g. How do I beat the final boss? What are the best build strategies?"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm placeholder-muted-foreground focus:outline-none focus:border-accent resize-none leading-relaxed"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter to submit</p>
                </div>

                <button
                  onClick={handleAskGemini}
                  disabled={!question.trim() || loading}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-50 transition-all hover:bg-accent/90"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {loading ? 'Generating insight...' : 'Generate Insight'}
                </button>

                {!isAuthenticated && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">Sign in to generate and save AI insights</p>
                  </div>
                )}
              </div>
            )}

            {/* Step: Result */}
            {step === 'result' && result && selectedGame && (
              <div className="p-4 space-y-4">
                {/* Game + question context */}
                <div className="flex items-start gap-3 p-3 bg-secondary/60 rounded-xl">
                  {selectedGame.coverUrl ? (
                    <img src={selectedGame.coverUrl} alt={selectedGame.title} className="w-8 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <Gamepad2 className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-accent">{selectedGame.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{question}</p>
                  </div>
                </div>

                {/* Gemini answer */}
                <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-xl p-4" style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-semibold text-accent uppercase tracking-wide">AI Insight</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300 leading-relaxed">
                    AI insights need community review before they're added to the wiki. Submit it for others to vote on.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleSubmitInsight}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-50 hover:bg-accent/90 transition-all"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit to {selectedGame.title} Wiki
                  </button>
                  <button
                    onClick={() => { setQuestion(''); setResult(null); setStep('question'); }}
                    className="w-full h-10 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
                  >
                    Ask another question
                  </button>
                </div>
              </div>
            )}

            {/* Step: Submitted */}
            {step === 'submitted' && selectedGame && (
              <div className="p-6 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Insight Submitted!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your insight is now pending community review. If 70% of voters approve it after 24 hours, it'll be added to the <strong>{selectedGame.title}</strong> wiki.
                  </p>
                </div>
                <div className="w-full space-y-2">
                  <button
                    onClick={handleShareAsPost}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-all"
                  >
                    Share as Post
                  </button>
                  <button
                    onClick={() => { navigate(`/game/${selectedGame.id}/insight/${insightId}`); onClose(); }}
                    className="w-full h-10 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
                  >
                    View in {selectedGame.title} Wiki
                  </button>
                  <button onClick={onClose} className="w-full h-10 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
