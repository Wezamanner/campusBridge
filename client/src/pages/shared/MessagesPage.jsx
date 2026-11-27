/**
 * MessagesPage — Shared across instructor, coordinator, and admin roles.
 * Uses the same messagesService as StudentMessagesPage.
 * Role-specific rendering is not needed — the backend scopes threads to the
 * authenticated user regardless of role.
 *
 * Responsive layout:
 *   - Mobile (<640px): conversation list and thread panel stack vertically;
 *     a "Back" button returns from the thread to the list.
 *   - Desktop (≥640px): side-by-side two-column layout as before.
 */
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { messagesService } from '../../services/phase11.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  MessageSquare,
  Send,
  User,
  Search,
  AlertCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Mobile: show thread panel when a conversation is active
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      setError(null);
      const res = await messagesService.getConversations();
      if (res.success) {
        const convos = res.data || [];
        setConversations(convos);
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (partner) => {
    if (!partner?._id) return;
    setActivePartnerId(partner._id);
    setActivePartner(partner);
    setMobileShowThread(true);
    try {
      setLoadingThread(true);
      const res = await messagesService.getThread(partner._id);
      if (res.success) {
        setMessages(res.data?.messages || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load thread.');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activePartnerId) return;
    try {
      setSending(true);
      const res = await messagesService.send(activePartnerId, messageText.trim());
      if (res.success) {
        setMessageText('');
        const threadRes = await messagesService.getThread(activePartnerId);
        if (threadRes.success) setMessages(threadRes.data?.messages || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    !searchTerm ||
    c.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Shared sub-components ────────────────────────────────────────────────

  const ConversationList = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#1C2948]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-xs focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <LoadingState count={3} />
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">No conversations yet.</div>
        ) : (
          filteredConversations.map(c => (
            <button
              key={c.user?._id}
              onClick={() => selectConversation(c.user)}
              className={`w-full text-left p-3 border-b border-[#1C2948]/50 hover:bg-[#1C2948]/60 transition-colors ${
                activePartnerId === c.user?._id ? 'bg-[#1C2948]/80' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#00C8FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{c.user?.name || 'User'}</p>
                  <p className="text-[10px] text-gray-400 truncate capitalize">{c.user?.role || ''}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-[#00C8FF] text-[#101735] text-[10px] font-bold flex items-center justify-center">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              {c.lastMessage && (
                <p className="text-[10px] text-gray-500 mt-1 truncate pl-10">{c.lastMessage.body}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  const ThreadPanel = (
    <div className="flex flex-col h-full">
      {!activePartner ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Select a Conversation"
            description="Choose a conversation from the left panel to start messaging."
          />
        </div>
      ) : (
        <>
          {/* Thread header */}
          <div className="p-3 sm:p-4 border-b border-[#1C2948] flex items-center gap-3">
            {/* Back button — mobile only */}
            <button
              onClick={() => setMobileShowThread(false)}
              className="sm:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2948]/60 transition-colors flex-shrink-0"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/30 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[#00C8FF]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{activePartner.name}</p>
              <p className="text-xs text-gray-400 capitalize">{activePartner.role}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {loadingThread ? (
              <LoadingState count={3} />
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8">No messages yet. Send the first one!</div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                return (
                  <div key={msg._id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm ${
                      isOwn
                        ? 'bg-[#00C8FF]/20 text-white border border-[#00C8FF]/30'
                        : 'bg-[#1C2948] text-gray-200 border border-[#1C2948]'
                    }`}>
                      <p className="leading-relaxed break-words">{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <Clock className="w-2.5 h-2.5 text-gray-500" />
                        <span className="text-[10px] text-gray-500">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose */}
          <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-[#1C2948] flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
            />
            <Button type="submit" size="sm" disabled={sending || !messageText.trim()} className="flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Messages</h1>
          <p className="text-sm text-gray-400 mt-1">Direct messaging with platform users</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Desktop layout (sm+): side-by-side ── */}
        <div className="hidden sm:flex gap-4 h-[70vh] min-h-[400px]">
          {/* Conversation list */}
          <div className="w-64 md:w-72 flex-shrink-0 rounded-2xl border border-[#1C2948] bg-[#101735]/60 overflow-hidden">
            {ConversationList}
          </div>
          {/* Thread panel */}
          <div className="flex-1 rounded-2xl border border-[#1C2948] bg-[#101735]/60 overflow-hidden">
            {ThreadPanel}
          </div>
        </div>

        {/* ── Mobile layout (<sm): single panel with back button ── */}
        <div className="sm:hidden rounded-2xl border border-[#1C2948] bg-[#101735]/60 overflow-hidden" style={{ height: '70vh', minHeight: '360px' }}>
          {mobileShowThread ? ThreadPanel : ConversationList}
        </div>
      </div>
    </AppLayout>
  );
}
