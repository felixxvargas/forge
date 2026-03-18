import { useState } from 'react';
import { Header } from '../components/Header';
import { MessageCircle, ArrowLeft, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
  messages: ChatMessage[];
}

const mockChats: Chat[] = [];

export function Messages() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m`;
    }
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;
    
    // In a real app, this would send the message to the backend
    console.log('Sending message:', messageInput);
    setMessageInput('');
  };

  if (selectedChat) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
        {/* Chat Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setSelectedChat(null)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img
              src={selectedChat.userAvatar}
              alt={selectedChat.userName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <h1 className="text-xl font-semibold">{selectedChat.userName}</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
          {selectedChat.messages.map((message) => {
            const isCurrentUser = message.senderId === 'current-user';
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isCurrentUser
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card border border-border'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className={`text-xs mt-1 ${isCurrentUser ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="sticky bottom-20 w-full max-w-2xl mx-auto px-4 pb-4">
          <div className="bg-card border border-border rounded-full px-4 py-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="p-2 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-6">Messages</h2>
        
        {/* Empty State */}
        {mockChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground max-w-md">
              Start a conversation with other gamers by visiting their profile and sending them a message.
            </p>
          </div>
        ) : (
          /* Chat List */
          <div className="space-y-2">
            {mockChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className="w-full bg-card p-4 rounded-xl hover:bg-card/80 transition-colors flex items-start gap-3"
              >
                <div className="relative">
                  <img
                    src={chat.userAvatar}
                    alt={chat.userName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold ${chat.unread ? 'text-foreground' : 'text-foreground/90'}`}>
                      {chat.userName}
                    </h3>
                    <div className="flex items-center gap-2">
                      {chat.unread && (
                        <span className="w-2 h-2 bg-accent rounded-full" />
                      )}
                      <span className="text-xs text-muted-foreground">{formatTime(chat.timestamp)}</span>
                    </div>
                  </div>
                  <p className={`text-sm truncate ${chat.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}