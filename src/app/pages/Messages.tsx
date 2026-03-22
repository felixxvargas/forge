import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { MessageCircle, ArrowLeft, Send, Plus, Search, X, Loader2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { directMessages as dmAPI, groupThreads as groupAPI, profiles, supabase } from '../utils/supabase';

interface DmMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender?: any;
}

interface GroupMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: any;
}

export function Messages() {
  const { currentUser } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // DM state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partner, setPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);

  // Group thread state
  const [groupThreadList, setGroupThreadList] = useState<any[]>([]);
  const [selectedGroupThread, setSelectedGroupThread] = useState<any | null>(null);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Shared
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(false);

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'dm' | 'group'>('dm');
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedComposeUsers, setSelectedComposeUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const composeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle ?to=userId deep-link
  useEffect(() => {
    const toUserId = searchParams.get('to');
    if (!toUserId || !currentUser?.id) return;
    profiles.getById(toUserId)
      .then(profile => {
        if (profile) { setPartner(profile); setSelectedPartnerId(toUserId); }
      })
      .catch(() => {});
  }, [searchParams, currentUser?.id]);

  // Load conversations + group threads on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoadingConvos(true);
    Promise.all([
      dmAPI.getConversations(currentUser.id).catch(() => []),
      groupAPI.getForUser(currentUser.id).catch(() => []),
    ]).then(([dms, groups]) => {
      setConversations(dms);
      setGroupThreadList(groups);
    }).finally(() => setLoadingConvos(false));
  }, [currentUser?.id]);

  // Load DM messages when conversation selected
  useEffect(() => {
    if (!currentUser?.id || !selectedPartnerId) return;
    dmAPI.getMessages(currentUser.id, selectedPartnerId).then(setMessages).catch(() => {});
  }, [currentUser?.id, selectedPartnerId]);

  // Load group thread messages + participants when group selected
  useEffect(() => {
    if (!selectedGroupThread) return;
    groupAPI.getMessages(selectedGroupThread.id).then(setGroupMessages).catch(() => {});
    groupAPI.getParticipants(selectedGroupThread.participant_ids ?? []).then(setGroupParticipants).catch(() => {});
  }, [selectedGroupThread?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages]);

  // Real-time DM updates
  useEffect(() => {
    if (!currentUser?.id || !selectedPartnerId) return;
    const channel = supabase
      .channel(`dm-${currentUser.id}-${selectedPartnerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, (payload) => {
        const msg = payload.new as DmMessage;
        if (msg.sender_id === selectedPartnerId) setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, selectedPartnerId]);

  // Real-time group message updates
  useEffect(() => {
    if (!selectedGroupThread) return;
    const channel = supabase
      .channel(`group-${selectedGroupThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `thread_id=eq.${selectedGroupThread.id}`,
      }, (payload) => {
        const msg = payload.new as GroupMessage;
        if (msg.sender_id !== currentUser?.id) setGroupMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroupThread?.id, currentUser?.id]);

  // Debounced user search
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
    setSelectedGroupThread(null);
    closeCompose();
  };

  const openGroupThread = (thread: any) => {
    setSelectedGroupThread(thread);
    setGroupMessages([]);
    setGroupParticipants([]);
    setSelectedPartnerId(null);
    setPartner(null);
    closeCompose();
  };

  const closeCompose = () => {
    setShowCompose(false);
    setComposeQuery('');
    setComposeResults([]);
    setSelectedComposeUsers([]);
    setGroupName('');
    setComposeMode('dm');
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !currentUser?.id || !selectedPartnerId || isSending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    try {
      const msg = await dmAPI.send(currentUser.id, selectedPartnerId, content);
      setMessages(prev => [...prev, msg]);
      dmAPI.getConversations(currentUser.id).then(setConversations).catch(() => {});
    } catch { setMessageInput(content); }
    finally { setIsSending(false); }
  };

  const handleSendGroupMessage = async () => {
    if (!messageInput.trim() || !currentUser?.id || !selectedGroupThread || isSending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    try {
      const msg = await groupAPI.sendMessage(selectedGroupThread.id, currentUser.id, content);
      setGroupMessages(prev => [...prev, msg]);
      groupAPI.getForUser(currentUser.id).then(setGroupThreadList).catch(() => {});
    } catch { setMessageInput(content); }
    finally { setIsSending(false); }
  };

  const handleCreateGroup = async () => {
    if (!currentUser?.id || !groupName.trim() || selectedComposeUsers.length < 1 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const thread = await groupAPI.create(
        currentUser.id,
        groupName.trim(),
        selectedComposeUsers.map(u => u.id)
      );
      setGroupThreadList(prev => [thread, ...prev]);
      openGroupThread(thread);
    } catch (err) {
      console.error('Failed to create group thread:', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleComposeUser = (user: any) => {
    setSelectedComposeUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      return exists ? prev.filter(u => u.id !== user.id) : [...prev, user];
    });
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

  // ── GROUP THREAD CHAT VIEW ────────────────────────────────────
  if (selectedGroupThread) {
    const othersInGroup = groupParticipants.filter(p => p.id !== currentUser?.id);
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => { setSelectedGroupThread(null); setGroupMessages([]); setShowGroupInfo(false); }}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex -space-x-2 shrink-0">
              {groupParticipants.slice(0, 3).map(p => (
                <ProfileAvatar
                  key={p.id}
                  username={p.display_name || p.handle || '?'}
                  profilePicture={p.profile_picture ?? null}
                  size="sm"
                  userId={p.id}
                  className="border-2 border-card"
                />
              ))}
            </div>
            <button
              className="flex-1 text-left"
              onClick={() => setShowGroupInfo(v => !v)}
            >
              <p className="font-semibold leading-tight">{selectedGroupThread.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {groupParticipants.length} participants
                {showGroupInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </p>
            </button>
          </div>
          {/* Participant list */}
          {showGroupInfo && (
            <div className="w-full max-w-2xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
              {groupParticipants.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(p.id === currentUser?.id ? '/profile' : `/profile/${p.id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-full text-xs hover:bg-secondary/80 transition-colors"
                >
                  <ProfileAvatar
                    username={p.display_name || p.handle || '?'}
                    profilePicture={p.profile_picture ?? null}
                    size="sm"
                    userId={p.id}
                  />
                  <span>{p.display_name || p.handle}</span>
                  {p.id === currentUser?.id && <span className="text-muted-foreground">(you)</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-3">
          {groupMessages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Start the conversation!</p>
          )}
          {groupMessages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const sender = msg.sender || groupParticipants.find(p => p.id === msg.sender_id);
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <button
                    onClick={() => navigate(`/profile/${msg.sender_id}`)}
                    className="shrink-0 self-end"
                  >
                    <ProfileAvatar
                      username={sender?.display_name || sender?.handle || '?'}
                      profilePicture={sender?.profile_picture ?? null}
                      size="sm"
                      userId={msg.sender_id}
                    />
                  </button>
                )}
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && sender && (
                    <button
                      onClick={() => navigate(`/profile/${msg.sender_id}`)}
                      className="text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors"
                    >
                      {sender.display_name || sender.handle}
                    </button>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${isMe ? 'bg-accent text-accent-foreground' : 'bg-card border border-border'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
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
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendGroupMessage()}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
            <button
              onClick={handleSendGroupMessage}
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

  // ── DM CHAT VIEW ─────────────────────────────────────────────
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
            <button
              onClick={() => navigate(partner.id === currentUser?.id ? '/profile' : `/profile/${partner.id}`)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
            >
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
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Start the conversation!</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-accent text-accent-foreground' : 'bg-card border border-border'}`}>
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

  // ── CONVERSATION LIST ─────────────────────────────────────────
  // Merge DMs and group threads, sorted by most recent
  const allConvos = [
    ...conversations.map(c => ({ ...c, _type: 'dm' as const })),
    ...groupThreadList.map(g => ({ ...g, _type: 'group' as const })),
  ].sort((a, b) =>
    new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
  );

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
        ) : allConvos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Start a conversation or create a group thread.
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
            {allConvos.map((item) => {
              if (item._type === 'dm') {
                const partnerId = item.sender_id === currentUser?.id ? item.recipient_id : item.sender_id;
                const partnerProfile = item.sender_id === currentUser?.id ? item.recipient : item.sender;
                if (!partnerProfile) return null;
                return (
                  <button
                    key={`dm-${item.id}`}
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
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(item.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{item.content}</p>
                    </div>
                  </button>
                );
              } else {
                // Group thread
                return (
                  <button
                    key={`group-${item.id}`}
                    onClick={() => openGroupThread(item)}
                    className="w-full bg-card p-4 rounded-xl hover:bg-card/80 transition-colors flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold truncate">{item.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(item.updated_at || item.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(item.participant_ids?.length ?? 0)} participants
                      </p>
                    </div>
                  </button>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={closeCompose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">New Message</h2>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 px-4 pt-4 pb-2">
            <button
              onClick={() => { setComposeMode('dm'); setSelectedComposeUsers([]); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                composeMode === 'dm' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              Direct Message
            </button>
            <button
              onClick={() => setComposeMode('group')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                composeMode === 'group' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              Group Thread
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {/* Group name input */}
            {composeMode === 'group' && (
              <input
                type="text"
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2.5 mb-3 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors text-sm"
              />
            )}

            {/* Selected users chips (group mode) */}
            {composeMode === 'group' && selectedComposeUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedComposeUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => toggleComposeUser(u)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 text-accent rounded-full text-sm hover:bg-accent/25 transition-colors"
                  >
                    <span>{u.display_name || u.handle}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
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
              {composeResults.map((user) => {
                const isSelected = selectedComposeUsers.some(u => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (composeMode === 'dm') {
                        openConversation(user.id, user);
                      } else {
                        toggleComposeUser(user);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isSelected ? 'bg-accent/15' : 'hover:bg-secondary'
                    }`}
                  >
                    <ProfileAvatar
                      username={user.display_name || user.handle || '?'}
                      profilePicture={user.profile_picture ?? null}
                      size="sm"
                      userId={user.id}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{user.display_name || user.handle}</p>
                      <p className="text-sm text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
                    </div>
                    {composeMode === 'group' && isSelected && (
                      <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-accent-foreground">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
              {composeQuery.trim() && !searchingUsers && composeResults.length === 0 && (
                <p className="text-center py-6 text-muted-foreground text-sm">No users found</p>
              )}
            </div>
          </div>

          {/* Create group button */}
          {composeMode === 'group' && (
            <div className="px-4 pb-6 pt-2 border-t border-border">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedComposeUsers.length < 1 || creatingGroup}
                className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Create Group Thread
                {selectedComposeUsers.length > 0 && ` (${selectedComposeUsers.length + 1})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
