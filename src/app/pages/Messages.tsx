import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { MessageCircle, ArrowLeft, Send, Plus, Search, X, Loader2, Users, ChevronDown, ChevronUp, Trash2, UserPlus, LogOut, Flame } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { directMessages as dmAPI, groupThreads as groupAPI, profiles, supabase } from '../utils/supabase';
import { initEncryptionKeys, getMyPublicKeyJwk, encryptMessage, decryptMessage } from '../utils/crypto';

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

  // Add people to group
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [addPeopleQuery, setAddPeopleQuery] = useState('');
  const [addPeopleResults, setAddPeopleResults] = useState<any[]>([]);
  const [selectedAddUsers, setSelectedAddUsers] = useState<any[]>([]);
  const [searchingAdd, setSearchingAdd] = useState(false);
  const [addingPeople, setAddingPeople] = useState(false);

  // Leave / delete confirmation
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);

  // Shared
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(false);

  // Compose modal — unified: select people first, then confirm
  const [showCompose, setShowCompose] = useState(false);
  const [composeStep, setComposeStep] = useState<'search' | 'confirm'>('search');
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedComposeUsers, setSelectedComposeUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const composeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addPeopleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // E2E encryption: partner's public key JWK (fetched when a DM conversation opens)
  const partnerPublicKeyRef = useRef<JsonWebKey | null>(null);
  // Cache of decrypted message content keyed by message id
  const decryptedCache = useRef<Record<string, string>>({});

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

  // Initialise E2E encryption: generate keypair if needed and publish public key to profile
  useEffect(() => {
    if (!currentUser?.id) return;
    initEncryptionKeys().then(pubKeyJwk => {
      if (!pubKeyJwk) return;
      // Save public key to profile so partners can fetch it when encrypting
      const stored = JSON.stringify(pubKeyJwk);
      // Only update if the profile doesn't already have this key (avoid thrashing)
      profiles.getPublicKey(currentUser.id).then(existing => {
        if (existing !== stored) {
          profiles.update(currentUser.id, { public_key: stored }).catch(() => {});
        }
      }).catch(() => {});
    });
  }, [currentUser?.id]);

  // Fetch partner's public key when a DM conversation is opened
  useEffect(() => {
    partnerPublicKeyRef.current = null;
    if (!selectedPartnerId) return;
    profiles.getPublicKey(selectedPartnerId).then(raw => {
      if (raw) {
        try { partnerPublicKeyRef.current = JSON.parse(raw); } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, [selectedPartnerId]);

  // Load conversations + group threads
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

  // Load DM messages, decrypting any E2E-encrypted ones
  useEffect(() => {
    if (!currentUser?.id || !selectedPartnerId) return;
    dmAPI.getMessages(currentUser.id, selectedPartnerId).then(async rawMsgs => {
      const decrypted = await Promise.all(rawMsgs.map(async (msg: any) => {
        if (!msg.encrypted || !msg.iv) return msg;
        // Need the *sender's* public key to derive the shared secret
        const senderKey = msg.sender_id === currentUser.id
          ? partnerPublicKeyRef.current  // I sent it: I used partner's key
          : partnerPublicKeyRef.current; // I received it: sender is partner
        if (!senderKey) return msg;
        const plain = await decryptMessage(msg.content, msg.iv, senderKey);
        return plain !== null ? { ...msg, _plaintext: plain } : msg;
      }));
      setMessages(decrypted);
    }).catch(() => {});
  }, [currentUser?.id, selectedPartnerId]);

  // Load group messages + participants
  useEffect(() => {
    if (!selectedGroupThread) return;
    groupAPI.getMessages(selectedGroupThread.id).then(setGroupMessages).catch(() => {});
    groupAPI.getParticipants(selectedGroupThread.participant_ids ?? []).then(setGroupParticipants).catch(() => {});
  }, [selectedGroupThread?.id]);

  // Scroll to bottom only for new messages, not on initial load
  const hasInitialScrolledRef = useRef(false);
  const prevConversationKeyRef = useRef<string | null>(null);
  const conversationKey = selectedPartnerId ?? selectedGroupThread?.id ?? null;

  useEffect(() => {
    if (conversationKey !== prevConversationKeyRef.current) {
      // Conversation changed — reset flag so we don't auto-scroll
      prevConversationKeyRef.current = conversationKey;
      hasInitialScrolledRef.current = false;
      return;
    }
    if (!hasInitialScrolledRef.current) {
      // First render of messages — mark as loaded but don't scroll
      hasInitialScrolledRef.current = true;
      return;
    }
    // Subsequent updates — a new message arrived, scroll to it
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages, conversationKey]);

  // Real-time DM
  useEffect(() => {
    if (!currentUser?.id || !selectedPartnerId) return;
    const channel = supabase
      .channel(`dm-${currentUser.id}-${selectedPartnerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, async (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== selectedPartnerId) return;
        if (msg.encrypted && msg.iv && partnerPublicKeyRef.current) {
          const plain = await decryptMessage(msg.content, msg.iv, partnerPublicKeyRef.current);
          setMessages(prev => [...prev, { ...msg, _plaintext: plain ?? undefined }]);
        } else {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, selectedPartnerId]);

  // Real-time group messages
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

  // Debounced compose search
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

  // Debounced add-people search
  useEffect(() => {
    if (addPeopleDebounce.current) clearTimeout(addPeopleDebounce.current);
    if (!addPeopleQuery.trim()) { setAddPeopleResults([]); return; }
    addPeopleDebounce.current = setTimeout(async () => {
      setSearchingAdd(true);
      try {
        const results = await profiles.search(addPeopleQuery);
        const existing = new Set(selectedGroupThread?.participant_ids ?? []);
        setAddPeopleResults(results.filter((u: any) => u.id !== currentUser?.id && !existing.has(u.id)));
      } catch { setAddPeopleResults([]); }
      finally { setSearchingAdd(false); }
    }, 300);
    return () => { if (addPeopleDebounce.current) clearTimeout(addPeopleDebounce.current); };
  }, [addPeopleQuery, currentUser?.id, selectedGroupThread?.participant_ids]);

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
    setShowGroupInfo(false);
    closeCompose();
  };

  const closeCompose = () => {
    setShowCompose(false);
    setComposeStep('search');
    setComposeQuery('');
    setComposeResults([]);
    setSelectedComposeUsers([]);
    setGroupName('');
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !currentUser?.id || !selectedPartnerId || isSending) return;
    const plaintext = messageInput.trim();
    setMessageInput('');
    setIsSending(true);
    try {
      const partnerKey = partnerPublicKeyRef.current;
      const myKey = getMyPublicKeyJwk();

      let content = plaintext;
      let opts: { encrypted?: boolean; iv?: string } | undefined;

      if (partnerKey && myKey) {
        const encrypted = await encryptMessage(plaintext, partnerKey);
        if (encrypted) {
          content = encrypted.ciphertext;
          opts = { encrypted: true, iv: encrypted.iv };
          // Cache the plaintext locally so the sender sees it immediately
          // (will be overwritten by decryption once the message round-trips)
        }
      }

      const msg = await dmAPI.send(currentUser.id, selectedPartnerId, content, opts);
      // For the sender's own view, display the original plaintext
      setMessages(prev => [...prev, { ...msg, _plaintext: plaintext }]);
      dmAPI.getConversations(currentUser.id).then(setConversations).catch(() => {});
    } catch { setMessageInput(plaintext); }
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

  const handleOpenDm = () => {
    if (selectedComposeUsers.length !== 1) return;
    openConversation(selectedComposeUsers[0].id, selectedComposeUsers[0]);
  };

  const handleCreateGroup = async () => {
    if (!currentUser?.id || !groupName.trim() || selectedComposeUsers.length < 1 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const thread = await groupAPI.create(currentUser.id, groupName.trim(), selectedComposeUsers.map(u => u.id));
      setGroupThreadList(prev => [thread, ...prev]);
      openGroupThread(thread);
    } catch (err) {
      console.error('Failed to create group thread:', err);
    } finally { setCreatingGroup(false); }
  };

  const handleAddPeople = async () => {
    if (!selectedGroupThread || selectedAddUsers.length === 0 || addingPeople) return;
    setAddingPeople(true);
    try {
      const updated = await groupAPI.addParticipants(selectedGroupThread.id, selectedAddUsers.map(u => u.id));
      setSelectedGroupThread(updated);
      setGroupThreadList(prev => prev.map(t => t.id === updated.id ? updated : t));
      groupAPI.getParticipants(updated.participant_ids).then(setGroupParticipants).catch(() => {});
      setShowAddPeople(false);
      setAddPeopleQuery('');
      setAddPeopleResults([]);
      setSelectedAddUsers([]);
    } catch (err) {
      console.error('Failed to add people:', err);
    } finally { setAddingPeople(false); }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupThread || !currentUser?.id || leavingGroup) return;
    setLeavingGroup(true);
    try {
      await groupAPI.leave(selectedGroupThread.id, currentUser.id);
      setGroupThreadList(prev => prev.filter(t => t.id !== selectedGroupThread.id));
      setSelectedGroupThread(null);
      setGroupMessages([]);
      setShowLeaveConfirm(false);
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally { setLeavingGroup(false); }
  };

  const handleDeleteConvo = async (item: any) => {
    if (deletingThread) return;
    setDeletingThread(true);
    try {
      if (item._type === 'dm') {
        const partnerId = item.sender_id === currentUser?.id ? item.recipient_id : item.sender_id;
        await dmAPI.deleteConversation(currentUser!.id, partnerId);
        setConversations(prev => prev.filter(c => c.id !== item.id));
      } else {
        await groupAPI.leave(item.id, currentUser!.id);
        setGroupThreadList(prev => prev.filter(t => t.id !== item.id));
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
    } finally {
      setDeletingThread(false);
      setDeleteConfirmId(null);
    }
  };

  const toggleComposeUser = (user: any) => {
    setSelectedComposeUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (!exists) {
        setComposeQuery('');
        setComposeResults([]);
      }
      return exists ? prev.filter(u => u.id !== user.id) : [...prev, user];
    });
  };

  const toggleAddUser = (user: any) => {
    setSelectedAddUsers(prev => {
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

  // ── GROUP THREAD CHAT VIEW ──────────────────────────────────────
  if (selectedGroupThread) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => { setSelectedGroupThread(null); setGroupMessages([]); setShowGroupInfo(false); }}
              className="p-2 hover:bg-secondary rounded-full transition-colors shrink-0"
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
            <button className="flex-1 text-left min-w-0" onClick={() => setShowGroupInfo(v => !v)}>
              <p className="font-semibold leading-tight truncate">{selectedGroupThread.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {groupParticipants.length} participants
                {showGroupInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </p>
            </button>
          </div>

          {/* Group info panel */}
          {showGroupInfo && (
            <div className="w-full max-w-2xl mx-auto px-4 pb-3 border-t border-border pt-3">
              <div className="space-y-1 mb-3">
                {groupParticipants.map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(p.id === currentUser?.id ? '/profile' : `/profile/${p.id}`)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <ProfileAvatar
                      username={p.display_name || p.handle || '?'}
                      profilePicture={p.profile_picture ?? null}
                      size="sm"
                      userId={p.id}
                    />
                    <span className="text-sm font-medium">{p.display_name || p.handle}</span>
                    {p.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-auto">You</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddPeople(true); setShowGroupInfo(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add People
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Leave Group
                </button>
              </div>
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
                  <button onClick={() => navigate(`/profile/${msg.sender_id}`)} className="shrink-0 self-end">
                    <ProfileAvatar
                      username={sender?.display_name || sender?.handle || '?'}
                      profilePicture={sender?.profile_picture ?? null}
                      size="sm"
                      userId={msg.sender_id}
                    />
                  </button>
                )}
                <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && sender && (
                    <button
                      onClick={() => navigate(`/profile/${msg.sender_id}`)}
                      className="text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors"
                    >
                      {sender.display_name || sender.handle}
                    </button>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${isMe ? 'bg-accent text-accent-foreground' : 'bg-card border border-border'}`}>
                    <p className="text-sm">{(msg as any)._plaintext ?? msg.content}</p>
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

        {/* Add People overlay */}
        {showAddPeople && (
          <div className="fixed inset-0 bg-background z-50 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <button onClick={() => { setShowAddPeople(false); setAddPeopleQuery(''); setAddPeopleResults([]); setSelectedAddUsers([]); }}
                className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold flex-1">Add People</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {selectedAddUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAddUsers.map(u => (
                    <button key={u.id} onClick={() => toggleAddUser(u)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 text-accent rounded-full text-sm hover:bg-accent/25 transition-colors">
                      <span>{u.display_name || u.handle}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search people..."
                  value={addPeopleQuery}
                  onChange={(e) => setAddPeopleQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors"
                />
                {searchingAdd && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              {addPeopleQuery.trim() === '' && <p className="text-center py-10 text-muted-foreground text-sm">Search for people to add</p>}
              <div className="space-y-2">
                {addPeopleResults.map(user => {
                  const isSelected = selectedAddUsers.some(u => u.id === user.id);
                  return (
                    <button key={user.id} onClick={() => toggleAddUser(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${isSelected ? 'bg-accent/15' : 'hover:bg-secondary'}`}>
                      <ProfileAvatar username={user.display_name || user.handle || '?'} profilePicture={user.profile_picture ?? null} size="sm" userId={user.id} />
                      <div className="flex-1">
                        <p className="font-medium">{user.display_name || user.handle}</p>
                        <p className="text-sm text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-accent-foreground">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
                {addPeopleQuery.trim() && !searchingAdd && addPeopleResults.length === 0 && (
                  <p className="text-center py-6 text-muted-foreground text-sm">No users found</p>
                )}
              </div>
            </div>
            <div className="px-4 pb-6 pt-2 border-t border-border">
              <button
                onClick={handleAddPeople}
                disabled={selectedAddUsers.length === 0 || addingPeople}
                className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingPeople ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add {selectedAddUsers.length > 0 ? `${selectedAddUsers.length} Person${selectedAddUsers.length > 1 ? 's' : ''}` : 'People'}
              </button>
            </div>
          </div>
        )}

        {/* Leave confirmation */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold">Leave Group?</h2>
              <p className="text-sm text-muted-foreground">You'll no longer receive messages from "{selectedGroupThread.name}".</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">
                  Cancel
                </button>
                <button onClick={handleLeaveGroup} disabled={leavingGroup}
                  className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {leavingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DM CHAT VIEW ──────────────────────────────────────────────
  if (selectedPartnerId && partner) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
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

        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Start the conversation!</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-accent text-accent-foreground' : 'bg-card border border-border'}`}>
                  <p className="text-sm">{(msg as any)._plaintext ?? msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                    {formatMessageTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

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
            <p className="text-muted-foreground max-w-md mb-6">Start a conversation or create a group thread.</p>
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
              const isDeleteConfirm = deleteConfirmId === item.id;
              if (item._type === 'dm') {
                const partnerId = item.sender_id === currentUser?.id ? item.recipient_id : item.sender_id;
                const partnerProfile = item.sender_id === currentUser?.id ? item.recipient : item.sender;
                if (!partnerProfile) return null;
                return (
                  <div key={`dm-${item.id}`} className="relative">
                    {isDeleteConfirm ? (
                      <div className="bg-card rounded-xl p-4 flex items-center gap-3">
                        <p className="flex-1 text-sm text-muted-foreground">Delete this conversation?</p>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-sm bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">Cancel</button>
                        <button onClick={() => handleDeleteConvo(item)} disabled={deletingThread}
                          className="px-3 py-1.5 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-1">
                          {deletingThread ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Delete
                        </button>
                      </div>
                    ) : (
                      <div className="bg-card rounded-xl flex items-center overflow-hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(partnerProfile.id === currentUser?.id ? '/profile' : `/profile/${partnerProfile.id}`); }}
                          className="p-4 pr-0 hover:opacity-80 transition-opacity shrink-0"
                          title={`View ${partnerProfile.display_name || partnerProfile.handle}'s profile`}
                        >
                          <ProfileAvatar
                            username={partnerProfile.display_name || partnerProfile.handle || '?'}
                            profilePicture={partnerProfile.profile_picture ?? null}
                            size="md"
                            userId={partnerProfile.id}
                          />
                        </button>
                        <button
                          onClick={() => openConversation(partnerId, partnerProfile)}
                          className="flex-1 p-4 hover:bg-card/80 transition-colors flex items-center gap-3 text-left min-w-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(partnerProfile.id === currentUser?.id ? '/profile' : `/profile/${partnerProfile.id}`); }}
                                className="font-semibold truncate hover:underline text-left"
                              >
                                {partnerProfile.display_name || partnerProfile.handle}
                              </button>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(item.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{(item as any).encrypted ? '🔒 Encrypted message' : item.content}</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-4 hover:bg-destructive/10 transition-colors shrink-0"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={`group-${item.id}`} className="relative">
                    {isDeleteConfirm ? (
                      <div className="bg-card rounded-xl p-4 flex items-center gap-3">
                        <p className="flex-1 text-sm text-muted-foreground">Leave "{item.name}"?</p>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-sm bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">Cancel</button>
                        <button onClick={() => handleDeleteConvo(item)} disabled={deletingThread}
                          className="px-3 py-1.5 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-1">
                          {deletingThread ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Leave
                        </button>
                      </div>
                    ) : (
                      <div className="bg-card rounded-xl flex items-center overflow-hidden">
                        <button
                          onClick={() => item.flare_id ? navigate(`/flare/${item.flare_id}`) : openGroupThread(item)}
                          className="flex-1 p-4 hover:bg-card/80 transition-colors flex items-center gap-3 text-left min-w-0"
                        >
                          {item.flare_id ? (
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shrink-0">
                              <Flame className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="font-semibold truncate">{item.name}</p>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(item.updated_at || item.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.flare_id ? 'LFG Flare · Tap to view' : `${(item.participant_ids?.length ?? 0)} participants`}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-4 hover:bg-destructive/10 transition-colors shrink-0"
                          title="Leave group"
                        >
                          <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    )}
                  </div>
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
              onClick={composeStep === 'confirm' ? () => setComposeStep('search') : closeCompose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              {composeStep === 'confirm' ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <h2 className="text-lg font-semibold">
              {composeStep === 'confirm'
                ? selectedComposeUsers.length === 1 ? 'New Message' : 'New Group Thread'
                : 'New Message'}
            </h2>
          </div>

          {composeStep === 'search' ? (
            <>
              <div className="p-4 flex-1 overflow-y-auto">
                {/* Selected chips */}
                {selectedComposeUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedComposeUsers.map(u => (
                      <button key={u.id} onClick={() => toggleComposeUser(u)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 text-accent rounded-full text-sm hover:bg-accent/25 transition-colors">
                        <span>{u.display_name || u.handle}</span>
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

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
                  {searchingUsers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>

                {composeQuery.trim() === '' && (
                  <p className="text-center py-10 text-muted-foreground text-sm">
                    {selectedComposeUsers.length === 0 ? 'Search for someone to message' : 'Add more people or tap Next'}
                  </p>
                )}

                <div className="space-y-2">
                  {composeResults.map((user) => {
                    const isSelected = selectedComposeUsers.some(u => u.id === user.id);
                    return (
                      <button key={user.id} onClick={() => toggleComposeUser(user)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${isSelected ? 'bg-accent/15' : 'hover:bg-secondary'}`}>
                        <ProfileAvatar username={user.display_name || user.handle || '?'} profilePicture={user.profile_picture ?? null} size="sm" userId={user.id} />
                        <div className="flex-1">
                          <p className="font-medium">{user.display_name || user.handle}</p>
                          <p className="text-sm text-muted-foreground">@{(user.handle || '').replace(/^@/, '')}</p>
                        </div>
                        {isSelected && (
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

              {selectedComposeUsers.length > 0 && (
                <div className="px-4 pb-6 pt-2 border-t border-border">
                  <button
                    onClick={() => setComposeStep('confirm')}
                    className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors"
                  >
                    Next → {selectedComposeUsers.length} {selectedComposeUsers.length === 1 ? 'person' : 'people'} selected
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Confirm step — scroll area + sticky footer so button is always visible on mobile */
            <>
              <div className="p-4 flex-1 overflow-y-auto">
                {selectedComposeUsers.length === 1 ? (
                  /* 1 person → direct message */
                  <div className="flex flex-col items-center py-10 gap-4">
                    <ProfileAvatar
                      username={selectedComposeUsers[0].display_name || selectedComposeUsers[0].handle || '?'}
                      profilePicture={selectedComposeUsers[0].profile_picture ?? null}
                      size="xl"
                      userId={selectedComposeUsers[0].id}
                    />
                    <div className="text-center">
                      <p className="text-xl font-semibold">{selectedComposeUsers[0].display_name || selectedComposeUsers[0].handle}</p>
                      <p className="text-muted-foreground">@{(selectedComposeUsers[0].handle || '').replace(/^@/, '')}</p>
                    </div>
                    <button
                      onClick={handleOpenDm}
                      className="mt-4 px-8 py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors"
                    >
                      Open Chat
                    </button>
                  </div>
                ) : (
                  /* 2+ people → group thread (button lives in footer below) */
                  <div className="space-y-4">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Group name..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors text-sm"
                    />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Participants ({selectedComposeUsers.length + 1})</p>
                      <div className="space-y-2">
                        {/* Current user */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-secondary rounded-lg">
                          <ProfileAvatar
                            username={currentUser?.display_name || currentUser?.handle || '?'}
                            profilePicture={(currentUser as any)?.profile_picture ?? null}
                            size="sm"
                            userId={currentUser?.id ?? ''}
                          />
                          <span className="text-sm font-medium">{currentUser?.display_name || currentUser?.handle}</span>
                          <span className="ml-auto text-xs text-muted-foreground">You</span>
                        </div>
                        {selectedComposeUsers.map(u => (
                          <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-secondary rounded-lg">
                            <ProfileAvatar username={u.display_name || u.handle || '?'} profilePicture={u.profile_picture ?? null} size="sm" userId={u.id} />
                            <span className="text-sm font-medium">{u.display_name || u.handle}</span>
                            <button onClick={() => toggleComposeUser(u)} className="ml-auto p-1 hover:bg-secondary/80 rounded transition-colors">
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky footer: Create Group button — always visible above the keyboard */}
              {selectedComposeUsers.length > 1 && (
                <div className="px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-border shrink-0">
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || creatingGroup}
                    className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    Create Group Thread
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-center">
              {allConvos.find(c => c.id === deleteConfirmId)?._type === 'group' ? 'Leave group thread?' : 'Delete conversation?'}
            </p>
            <p className="text-sm text-muted-foreground text-center">This can't be undone.</p>
            <button
              onClick={() => { const item = allConvos.find(c => c.id === deleteConfirmId); if (item) handleDeleteConvo(item); }}
              disabled={deletingThread}
              className="w-full py-2.5 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {deletingThread ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {allConvos.find(c => c.id === deleteConfirmId)?._type === 'group' ? 'Leave' : 'Delete'}
            </button>
            <button onClick={() => setDeleteConfirmId(null)}
              className="w-full py-2.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
