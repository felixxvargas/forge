'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Sparkles, Send, X, Pencil, Check, Gamepad2 } from 'lucide-react';
import { GlowBorder } from './GlowBorder';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { gamesAPI } from '../utils/api';
import { useNavigate } from '@/compat/router';

type SearchState = 'idle' | 'loading' | 'result' | 'submitting' | 'submitted';

interface SelectedGame {
  id: string;
  title: string;
  coverUrl?: string;
}

interface GeminiResult {
  answer: string;
  title?: string;
  remaining: number;
}

const CLAMP_STYLE: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 8,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

export function FeedInsightSearch({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const { isAuthenticated } = useAppData() as any;
  const navigate = useNavigate();

  const [state, setState] = useState<SearchState>('idle');
  const [query, setQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(null);
  const [result, setResult] = useState<GeminiResult | null>(null);
  const [insightId, setInsightId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user'|'assistant'; content: string; timestamp: string}>>([]);
  const [editingResponse, setEditingResponse] = useState(false);
  const [editResponseText, setEditResponseText] = useState('');
  const [tagSearchActive, setTagSearchActive] = useState(false);

  const [showGameSearch, setShowGameSearch] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<any[]>([]);
  const [gameSearching, setGameSearching] = useState(false);
  const [atGameQuery, setAtGameQuery] = useState('');
  const [atMode, setAtMode] = useState(false);

  const answerRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gameSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameSearchContainerRef = useRef<HTMLDivElement>(null);
  const mentionStartRef = useRef<number>(-1);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxHeight = 24 * 4 + 16;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px';
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gameSearchContainerRef.current && !gameSearchContainerRef.current.contains(e.target as Node)) {
        setShowGameSearch(false);
        setGameQuery('');
        setGameResults([]);
        setTagSearchActive(false);
        if (mentionStartRef.current >= 0) {
          mentionStartRef.current = -1;
          setAtMode(false);
          setAtGameQuery('');
        }
      }
    };
    if (showGameSearch) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showGameSearch]);

  useEffect(() => {
    onActiveChange?.(state !== 'idle');
  }, [state, onActiveChange]);

  useEffect(() => {
    if (expanded) return;
    const el = answerRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight);
  }, [result?.answer, expanded]);

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
    if (gameSearchTimerRef.current) clearTimeout(gameSearchTimerRef.current);
    gameSearchTimerRef.current = setTimeout(() => searchGames(val), 300);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuery(val);

    const cursorPos = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursorPos);
    const mentionMatch = before.match(/@([\w\s\-']*)$/);

    if (mentionMatch) {
      const startIdx = before.lastIndexOf('@');
      mentionStartRef.current = startIdx;
      const q = mentionMatch[1];
      setAtGameQuery(q);
      setAtMode(true);
      setShowGameSearch(true);
      if (gameSearchTimerRef.current) clearTimeout(gameSearchTimerRef.current);
      gameSearchTimerRef.current = setTimeout(() => searchGames(q), 300);
    } else if (mentionStartRef.current >= 0) {
      mentionStartRef.current = -1;
      setAtMode(false);
      setAtGameQuery('');
      setShowGameSearch(false);
      setGameResults([]);
    }
  };

  const selectGame = (game: any) => {
    if (mentionStartRef.current >= 0) {
      const atStart = mentionStartRef.current;
      const afterAt = query.slice(atStart + 1);
      const mentionText = afterAt.match(/^([\w\s\-']*)/)?.[1] ?? '';
      const atEnd = atStart + 1 + mentionText.length;
      const cleaned = query.slice(0, atStart) + query.slice(atEnd);
      setQuery(cleaned.trimEnd());
      mentionStartRef.current = -1;
      setAtMode(false);
      setAtGameQuery('');
    }
    const cover = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url;
    setSelectedGame({ id: String(game.id), title: game.title, coverUrl: cover });
    setShowGameSearch(false);
    setGameQuery('');
    setGameResults([]);
    setTagSearchActive(false);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        const end = ta.value.length;
        ta.setSelectionRange(end, end);
      }
    }, 0);
  };

  const askGemini = async (q: string, game: SelectedGame) => {
    setState('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/gemini/game-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q.trim(), gameId: game.id, gameTitle: game.title }),
      });

      if (res.status === 429) {
        const data = await res.json();
        toast.error(data.error || 'Daily query limit reached');
        setState('idle');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get answer');
      }

      const data = await res.json();
      setResult({ answer: data.answer, title: data.title, remaining: data.remaining });
      setState('result');
    } catch (err: any) {
      toast.error(err.message || 'Failed to get answer');
      setState('idle');
    }
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    if (!selectedGame) { toast.error('Tag a game before asking'); return; }
    if (!isAuthenticated) { toast.error('Sign in to use Forge AI Insights'); return; }
    askGemini(query, selectedGame);
  };

  const handleTagButtonClick = () => {
    const ta = textareaRef.current;
    const cursorPos = ta?.selectionStart ?? query.length;
    const prefix = query.slice(0, cursorPos);
    const suffix = query.slice(cursorPos);
    const needsSpace = prefix.length > 0 && !prefix.endsWith(' ');
    const insertion = needsSpace ? ' @' : '@';
    const newQuery = prefix + insertion + suffix;
    const atIndex = prefix.length + (needsSpace ? 1 : 0);

    setQuery(newQuery);
    mentionStartRef.current = atIndex;
    setAtMode(true);
    setAtGameQuery('');
    setShowGameSearch(true);
    setGameResults([]);

    setTimeout(() => {
      if (ta) {
        ta.focus();
        const pos = atIndex + 1;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmitInsight = async () => {
    if (!result || !selectedGame) return;
    setState('submitting');

    const finalAnswer = editingResponse ? editResponseText : result.answer;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/insights/game-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameId: selectedGame.id,
          gameTitle: selectedGame.title,
          query: query.trim(),
          content: finalAnswer,
          title: result?.title || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit insight');
      }

      const insight = await res.json();
      setInsightId(insight.id);
      setState('submitted');
      toast.success('Insight submitted for community review!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit insight');
      setState('result');
    }
  };

  const handleShareAsPost = () => {
    if (!selectedGame) return;
    navigate(
      `/new-post?gameId=${selectedGame.id}&gameTitle=${encodeURIComponent(selectedGame.title)}${insightId ? `&insightId=${insightId}` : ''}`
    );
    reset();
  };

  const reset = () => {
    setState('idle');
    setQuery('');
    setSelectedGame(null);
    setResult(null);
    setInsightId(null);
    setEditingResponse(false);
    setExpanded(false);
    setFollowUp('');
    setFollowUpLoading(false);
    setConversationHistory([]);
  };

  const saveEditResponse = () => {
    if (result) setResult({ ...result, answer: editResponseText });
    setEditingResponse(false);
    setExpanded(false);
  };

  const sendFollowUp = async () => {
    if (!followUp.trim() || !selectedGame || followUpLoading || !result) return;
    const followUpText = followUp.trim();
    setFollowUp('');
    setFollowUpLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const baseHistory = conversationHistory.length === 0 ? [
        { role: 'user' as const, content: query, timestamp: now },
        { role: 'assistant' as const, content: result.answer, timestamp: now },
      ] : conversationHistory;
      const messages = [...baseHistory, { role: 'user' as const, content: followUpText, timestamp: now }];

      const res = await fetch('/api/gemini/game-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: followUpText, gameId: selectedGame.id, gameTitle: selectedGame.title, messages }),
      });

      if (res.status === 429) { toast.error((await res.json()).error || 'Daily limit reached'); return; }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to get answer');

      const data = await res.json();
      setConversationHistory([...messages, { role: 'assistant' as const, content: data.answer, timestamp: new Date().toISOString() }]);
      setResult(prev => prev ? { ...prev, answer: data.answer, remaining: data.remaining } : prev);
      setIsClamped(false);
      setExpanded(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get follow-up answer');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const isDisabled = !query.trim();
  const isResultActive = state === 'result' || state === 'submitting' || state === 'submitted';

  return (
    <div className="mb-4">
      {/* Input area — idle only */}
      {state === 'idle' && (
        <div
          ref={gameSearchContainerRef}
          className="relative bg-card border border-border rounded-xl overflow-visible hover:border-accent/30 transition-colors"
        >
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder={selectedGame ? `Ask Forge about ${selectedGame.title}` : 'Ask Forge about any game'}
              rows={1}
              className="w-full bg-transparent text-sm placeholder-muted-foreground resize-none focus:outline-none leading-6"
              style={{ minHeight: '1.5rem', maxHeight: 'calc(1.5rem * 4 + 1rem)', overflowY: 'hidden' }}
            />
          </div>

          <div className="flex items-center justify-between px-4 pb-3 gap-2">
            <div className="flex-1 min-w-0">
              {selectedGame ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 rounded-full text-xs font-medium text-accent">
                  {selectedGame.coverUrl
                    ? <img src={selectedGame.coverUrl} alt="" className="w-4 h-[22px] rounded object-cover shrink-0" />
                    : <Gamepad2 className="w-3 h-3 shrink-0" />}
                  <span className="truncate max-w-[160px]">{selectedGame.title}</span>
                  <button onClick={() => setSelectedGame(null)} className="shrink-0 hover:text-accent/70 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : tagSearchActive ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-accent/40 rounded-full text-xs">
                  <Gamepad2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={gameQuery}
                    onChange={e => { handleGameQueryChange(e.target.value); setShowGameSearch(true); }}
                    onKeyDown={e => { if (e.key === 'Escape') { setTagSearchActive(false); setShowGameSearch(false); setGameQuery(''); setGameResults([]); } }}
                    placeholder="Search for a game..."
                    className="bg-transparent text-xs placeholder-muted-foreground focus:outline-none w-44"
                    style={{ fontSize: '12px' }}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setTagSearchActive(true); setShowGameSearch(true); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-border rounded-full text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Gamepad2 className="w-3 h-3" />
                  Tag a game
                </button>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className={isDisabled
                ? 'shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-transparent border border-muted-foreground/35 transition-colors'
                : 'shrink-0 group flex items-center justify-center w-8 h-8 rounded-xl bg-transparent border border-accent hover:bg-accent/15 transition-colors'
              }
            >
              <Send className={`w-3.5 h-3.5 transition-colors ${isDisabled ? 'text-muted-foreground/50' : 'text-[var(--accent)] group-hover:text-[var(--accent)]'}`} />
            </button>
          </div>

          {/* Game search dropdown — downward, full card width */}
          {!selectedGame && showGameSearch && (atMode ? !!atGameQuery : (tagSearchActive ? gameQuery.trim().length > 0 : true)) && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-sidebar border border-border rounded-xl shadow-xl z-50">
              {atMode ? (
                atGameQuery && (
                  <p className="px-3 pt-2.5 pb-1 text-xs text-muted-foreground">
                    Searching for &ldquo;{atGameQuery}&rdquo;
                  </p>
                )
              ) : !tagSearchActive ? (
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search for a game..."
                      value={gameQuery}
                      onChange={e => handleGameQueryChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs placeholder-muted-foreground focus:outline-none focus:border-accent"
                      style={{ fontSize: '12px' }}
                      autoFocus
                    />
                  </div>
                </div>
              ) : null}

              {gameSearching && (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {gameResults.length > 0 && (
                <div className="max-h-72 overflow-y-auto pb-2">
                  {gameResults.map(game => {
                    const cover = game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url;
                    return (
                      <button
                        key={game.id}
                        onClick={() => selectGame(game)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/80 transition-colors text-left"
                      >
                        {cover ? (
                          <img src={cover} alt={game.title} className="w-10 h-[52px] rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-[52px] rounded bg-secondary flex items-center justify-center shrink-0">
                            <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{game.title}</p>
                          {game.year && <p className="text-xs text-muted-foreground">{game.year}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {(atMode ? atGameQuery : gameQuery).trim() && !gameSearching && gameResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3 pb-4">No games found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {state === 'loading' && (
        <GlowBorder active={true}>
          <div className="bg-card rounded-xl p-6 flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Asking Forge...</span>
          </div>
        </GlowBorder>
      )}

      {/* Result cards */}
      {isResultActive && result && (
        <div className="space-y-3">
          {/* Query card */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-semibold leading-snug">{query}</p>
          </div>

          {/* Response card */}
          <div className="bg-card border rounded-xl p-4" style={{ borderColor: 'rgba(139,92,246,0.25)' }}>
            {result.title && (
              <p className="text-sm font-semibold leading-snug mb-3">{result.title}</p>
            )}

            {editingResponse ? (
              <div className="space-y-2">
                <textarea
                  value={editResponseText}
                  onChange={e => setEditResponseText(e.target.value)}
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                  rows={6}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEditResponse}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button onClick={() => setEditingResponse(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    ref={answerRef}
                    className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90"
                    style={expanded ? undefined : CLAMP_STYLE}
                  >
                    {result.answer}
                  </p>
                  {(isClamped || expanded) && (
                    <button
                      onClick={() => setExpanded(e => !e)}
                      className="mt-1 text-xs text-white/70 hover:text-white/90 transition-colors"
                    >
                      {expanded ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>
                {state === 'result' && (
                  <button
                    onClick={() => { setEditResponseText(result.answer); setEditingResponse(true); }}
                    className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Actions — result */}
            {state === 'result' && !editingResponse && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50 flex-wrap">
                {selectedGame && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent">
                    {selectedGame.coverUrl
                      ? <img src={selectedGame.coverUrl} alt="" className="w-4 h-[22px] rounded object-cover shrink-0" />
                      : <Gamepad2 className="w-3 h-3 shrink-0" />}
                    <span className="truncate max-w-[130px]">{selectedGame.title}</span>
                  </div>
                )}
                <button
                  onClick={handleSubmitInsight}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent/15 text-accent rounded-lg hover:bg-accent/25 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Submit to Insights
                </button>
                <button
                  onClick={reset}
                  className="ml-auto p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Actions — submitting */}
            {state === 'submitting' && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Submitting to community...</span>
              </div>
            )}

            {/* Actions — submitted */}
            {state === 'submitted' && (
              <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-xs font-medium">Submitted for community review</span>
                </div>
                <p className="text-xs text-muted-foreground">Would you like to share this to the feed?</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleShareAsPost}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-accent/15 text-accent rounded-lg hover:bg-accent/25 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Add commentary + Post
                  </button>
                  {selectedGame && insightId && (
                    <button
                      onClick={() => { navigate(`/game/${selectedGame.id}`); reset(); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      View pending insight
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-up input */}
      {state === 'result' && result && !editingResponse && (
        <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
          <input
            type="text"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendFollowUp(); } }}
            placeholder="Ask a follow-up..."
            className="flex-1 bg-transparent text-sm placeholder-muted-foreground focus:outline-none"
            disabled={followUpLoading}
          />
          <button
            onClick={sendFollowUp}
            disabled={!followUp.trim() || followUpLoading}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border border-accent/50 hover:bg-accent/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {followUpLoading
              ? <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              : <Send className="w-3.5 h-3.5 text-accent" />}
          </button>
        </div>
      )}

      {/* Divider — separates search results from feed below */}
      {isResultActive && <hr className="mt-6 border-border" />}
    </div>
  );
}
