import { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { MessageCircle, ArrowLeft, Send, Plus, Search, X, Loader2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { directMessages as dmAPI, profiles, supabase } from '../utils/supabase';

interface DmMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender?: any;
}

export function Messages() {
  const { currentUser } = useAppData();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partner, setPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(false);

  // New DM compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const composeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoadingConvos(true);
    dmAPI.getConversations(currentUser.id)
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, [currentUser?.id]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!currentUser?.id || !selectedPartnerId) return;
    dmAPI.getMessages(currentUser.id, selectedPartnerId)
      .then(setMessages)
      .catch(() => {});
  }, [currentUser?.id, selectedPartnerId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time updates for open conversation
  useEffect(() => {
    if (!currentUser?.id || !selectedPartnerId) return;
    const channel = supabase
      .channel(`dm-${currentUser.id}-${selectedPartnerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, (payload) => {
        const msg = payload.new as DmMessage;
        if (msg.sender_id === selectedPartnerId) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, selectedPartnerId]);

  // Debounced user search in compose modal
  useEffect(() => {
    if (composeDebounce.current) clearTimeout(composeDebounce.current);
    if (!composeQuery.trim()) { setComposeResults([]); return; }
    composeDebounce.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await profiles.search(composeQuery);
        setComposeResults(results.filter((u: any) => u.id !== currentUser?.id));
      } catch { setComposeResults([]); }
      finally { setSearchingUsers(false); }
    }, 300);
    return () => { if (composeDebounce.current) clearTimeout(composeDebounce.current); };
  }, [composeQuery, currentUser?.id]);

  const openConversation = (partnerId: string, partnerProfile: any) => {
    setSelectedPartnerId(partnerId);
    setPartner(partnerProfile);
    setMessages([]);
    setShowCompose(false);
    setComposeQuery('');
    setComposeResults([]);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !currentUser?.id || !selectedPartnerId || isSending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    try {
      const msg = await dmAPI.send(currentUser.id, selectedPartnerId, content);
      setMessages(prev => [...prev, msg]);
      // Refresh conversation list
      dmAPI.getConversations(currentUser.id).then(setConversations).catch(() => {});
    } catch (err) {
      setMessageInput(content); // restore on failure
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // ── CHAT VIEW ────────────────────────────────────────────────
  if (selectedPartnerId && partner) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => { setSelectedPartnerId(null); setPartner(null); setMessages([]); }}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <ProfileAvatar
              username={partner.display_name || partner.handle || '?'}
              profilePicture={partner.profile_picture ?? null}
              size="sm"
              userId={partner.id}
            />
            <div>
              <p className="font-semibold leading-tight">{partner.display_name || partner.handle}</p>
              <p className="text-xs text-muted-foreground">@{(partner.handle || '').replace(/^@/, '')}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Start the conversation!
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card border border-border'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                    {formatMessageTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-20 w-full max-w-2xl mx-auto px-4 pb-4">
          <div className="bg-card border border-border rounded-full px-4 py-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!messageInput.trim() || isSending}
              className="p-2 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CONVERSATION LIST ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Messages</h2>
          <button
            onClick={() => setShowCompose(true)}
            className="p-2 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors"
            title="New message"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {loadingConvos ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Start a conversation with another gamer.
            </p>
            <button
              onClick={() => setShowCompose(true)}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-full font-medium hover:bg-accent/90 transition-colors"
            >
              New Message
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((convo) => {
              const partnerId = convo.sender_id === currentUser?.id ? convo.recipient_id : convo.sender_id;
              const partnerProfile = convo.sender_id === currentUser?.id ? convo.recipient : convo.sender;
              if (!partnerProfile) return null;
              return (
                <button
                  key={convo.id}
                  onClick={() => openConversation(partnerId, partnerProfile)}
                  className="w-full bg-card p-4 rounded-xl hover:bg-card/80 transition-colors flex items-center gap-3 text-left"
                >
                  <ProfileAvatar
                    username={partnerProfile.display_name || partnerProfile.handle || '?'}
                    profilePicture={partnerProfile.profile_picture ?? null}
                    size="md"
                    userId={partnerProfile.id}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold truncate">{partnerProfile.display_name || partnerProfile.handle}</p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(convo.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{convo.content}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={() => { setShowCompose(false); setComposeQuery(''); setComposeResults([]); }}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">New Message</h2>
          </div>
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Search people..."
                value={composeQuery}
                onChange={(e) => setComposeQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors"
              />
              {searchingUsers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {composeQuery.trim() === '' && (
              <p className="text-center py-10 text-muted-foreground text-sm">Type a name or handle to search</p>
            )}
            <div className="space-y-2">
              {composeResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => openConversation(user.id, user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <ProfileAvatar
                    username={user.display_name || user.handle || '?'}
                    profilePicture={user.profile_picture ?? null}
                    size="sm"
                    userId={user.id}
                  />
                  <div>
                    <p className="font-medium">{user.display_name || user.handle}</p>
                    <p className="text-sm text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
                  </div>
                </button>
              ))}
              {composeQuery.trim() && !searchingUsers && composeResults.length === 0 && (
                <p className="text-center py-6 text-muted-foreground text-sm">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
