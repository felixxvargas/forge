import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Flame, Users, Gamepad2, Clock, Loader2,
  Check, X, Send, MessageCircle, Lock, UserPlus,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { lfgFlares as flaresAPI, groupThreads as threadAPI, supabase } from '../utils/supabase';
import type { LFGFlare } from '../utils/supabase';
import { formatTimeAgo } from '../utils/formatTimeAgo';

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: any;
}

export function FlareDetail() {
  const { flareId } = useParams<{ flareId: string }>();
  const navigate = useNavigate();
  const { session, currentUser } = useAppData();
  const userId = session?.user?.id;

  const [flare, setFlare] = useState<LFGFlare | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);

  // Chat state
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isExpired = flare ? new Date(flare.expires_at) < new Date() : false;
  const isCreator = flare?.user_id === userId;

  // Load flare + members
  useEffect(() => {
    if (!flareId) return;
    window.scrollTo(0, 0);
    setLoading(true);
    Promise.all([
      flaresAPI.getById(flareId),
      flaresAPI.getMembers(flareId),
      flaresAPI.getPendingRequests(flareId),
      userId ? flaresAPI.isMember(flareId, userId) : Promise.resolve(false),
    ]).then(([f, m, p, member]) => {
      setFlare(f);
      setMembers(m);
      setPending(p);
      setIsMember(member);
      if (f?.thread_id) setThreadId(f.thread_id);
    }).finally(() => setLoading(false));
  }, [flareId, userId]);

  // Load chat messages when thread is known and user is a member
  useEffect(() => {
    if (!threadId || !isMember) return;
    setLoadingThread(true);
    threadAPI.getMessages(threadId)
      .then(msgs => setMessages(msgs as ChatMessage[]))
      .catch(() => {})
      .finally(() => setLoadingThread(false));
  }, [threadId, isMember]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time chat
  useEffect(() => {
    if (!threadId || !isMember) return;
    const channel = supabase
      .channel(`flare-chat-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.sender_id !== userId) setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, isMember, userId]);

  const handleRequestJoin = async () => {
    if (!flareId || !userId || joining) return;
    setJoining(true);
    try {
      await flaresAPI.requestJoin(flareId, userId);
      setJoinRequested(true);
    } catch (e: any) {
      alert(e.message || 'Failed to send request.');
    } finally {
      setJoining(false);
    }
  };

  const handleApprove = async (memberId: string) => {
    if (!flareId) return;
    setActionUserId(memberId);
    try {
      await flaresAPI.approveRequest(flareId, memberId, threadId ?? undefined);
      const approved = pending.find(p => p.id === memberId);
      if (approved) {
        setPending(prev => prev.filter(p => p.id !== memberId));
        setMembers(prev => [...prev, approved]);
        // Add to thread participants if thread exists
        if (threadId) {
          const { data: thread } = await supabase.from('group_threads').select('participant_ids').eq('id', threadId).maybeSingle();
          if (thread) {
            const updated = [...new Set([...(thread.participant_ids ?? []), memberId])];
            await supabase.from('group_threads').update({ participant_ids: updated }).eq('id', threadId);
          }
        }
      }
    } catch (e: any) {
      alert(e.message || 'Failed to approve.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleReject = async (memberId: string) => {
    if (!flareId) return;
    setActionUserId(memberId);
    try {
      await flaresAPI.rejectRequest(flareId, memberId);
      setPending(prev => prev.filter(p => p.id !== memberId));
    } catch (e: any) {
      alert(e.message || 'Failed to reject.');
    } finally {
      setActionUserId(null);
    }
  };

  const handleOpenChat = async () => {
    if (!flare || !userId) return;
    if (threadId) return; // already open
    try {
      const tid = await flaresAPI.getOrCreateThread(flare);
      setThreadId(tid);
    } catch (e: any) {
      alert(e.message || 'Failed to open chat.');
    }
  };

  const handleSendMessage = async () => {
    if (!threadId || !userId || !messageInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    const content = messageInput.trim();
    setMessageInput('');
    try {
      const msg = await threadAPI.sendMessage(threadId, userId, content);
      setMessages(prev => [...prev, msg as ChatMessage]);
    } catch {
      setMessageInput(content);
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flare) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold">Flare not found</h2>
          <p className="text-muted-foreground mt-2">This flare may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const typeLabel = flare.flare_type === 'lfg' ? 'Looking for Group' : 'Looking for More';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{flare.game_title}</h1>
              <p className="text-xs text-muted-foreground">{typeLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Flare info card */}
        <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold">{flare.game_title}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white`}>
                <Flame className="w-3 h-3" />
                {typeLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 shrink-0" />
              <span>{flare.players_needed} player{flare.players_needed !== 1 ? 's' : ''} needed
                {flare.group_size ? ` · Group of ${flare.group_size}` : ''}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span className={isExpired ? 'text-destructive' : ''}>{isExpired ? 'Expired' : `Expires in ${timeUntil(flare.expires_at)}`}</span>
            </div>
          </div>

          {flare.game_mode && (
            <div className="px-3 py-2 bg-secondary rounded-lg text-sm">
              <span className="text-muted-foreground">Mode: </span>
              <span className="font-medium">{flare.game_mode}</span>
            </div>
          )}

          {/* Posted by */}
          {flare.user && (
            <button
              onClick={() => navigate(`/profile/${flare.user.id}`)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <ProfileAvatar
                username={flare.user.display_name || flare.user.handle || '?'}
                profilePicture={flare.user.profile_picture}
                userId={flare.user.id}
                size="sm"
              />
              <div className="text-sm">
                <span className="text-muted-foreground">Posted by </span>
                <span className="font-semibold">{flare.user.display_name || flare.user.handle}</span>
              </div>
            </button>
          )}
        </div>

        {/* Join button for non-members */}
        {!isMember && !isCreator && !isExpired && userId && (
          <button
            onClick={joinRequested ? undefined : handleRequestJoin}
            disabled={joining || joinRequested}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              joinRequested
                ? 'bg-secondary text-muted-foreground cursor-default'
                : 'bg-gradient-to-br from-orange-500 to-red-500 text-white hover:from-orange-500/90 hover:to-red-500/90 shadow-lg shadow-orange-500/20'
            }`}
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {joinRequested ? 'Request Sent' : 'Request to Join'}
          </button>
        )}

        {/* Members */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-400" />
              Members · {members.length}
            </h2>
          </div>
          {members.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No members yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => navigate(`/profile/${member.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors text-left"
                >
                  <ProfileAvatar
                    username={member.display_name || member.handle || '?'}
                    profilePicture={member.profile_picture}
                    userId={member.id}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.display_name || member.handle}</p>
                    <p className="text-xs text-muted-foreground">@{(member.handle || '').replace(/^@/, '')}</p>
                  </div>
                  {member.id === flare.user_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium shrink-0">Host</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests — admin only */}
        {isCreator && pending.length > 0 && (
          <div className="bg-card rounded-2xl border border-orange-500/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 bg-orange-500/5">
              <h2 className="font-semibold flex items-center gap-2 text-orange-400">
                <Flame className="w-4 h-4" />
                Join Requests · {pending.length}
              </h2>
            </div>
            <div className="divide-y divide-border/50">
              {pending.map(req => {
                const busy = actionUserId === req.id;
                return (
                  <div key={req.id} className="flex items-center gap-3 px-5 py-3.5">
                    <button onClick={() => navigate(`/profile/${req.id}`)} className="hover:opacity-80 transition-opacity">
                      <ProfileAvatar
                        username={req.display_name || req.handle || '?'}
                        profilePicture={req.profile_picture}
                        userId={req.id}
                        size="md"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{req.display_name || req.handle}</p>
                      <p className="text-xs text-muted-foreground">{req.requestedAt ? formatTimeAgo(req.requestedAt) : ''}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={busy}
                        className="p-2 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent transition-colors"
                        title="Approve"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={busy}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Private chat */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-orange-400" />
              Flare Chat
            </h2>
            {isMember && !threadId && (
              <button
                onClick={handleOpenChat}
                className="text-xs text-accent hover:underline"
              >
                Open chat
              </button>
            )}
          </div>

          {!isMember ? (
            <div className="px-5 py-8 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">Chat is only visible to flare members</p>
            </div>
          ) : loadingThread ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="px-4 py-3 max-h-64 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No messages yet — say hi!</p>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === userId;
                    const sender = msg.sender || members.find(m => m.id === msg.sender_id);
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <ProfileAvatar
                            username={sender?.display_name || sender?.handle || '?'}
                            profilePicture={sender?.profile_picture ?? null}
                            size="sm"
                            userId={msg.sender_id}
                          />
                        )}
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isMe && sender && (
                            <p className="text-xs text-muted-foreground mb-0.5">{sender.display_name || sender.handle}</p>
                          )}
                          <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2">
                  <input
                    type="text"
                    placeholder="Message the group…"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 bg-transparent focus:outline-none text-sm"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendingMsg}
                    className="p-1.5 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {sendingMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
