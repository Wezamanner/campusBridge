import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { messagesService } from '../../services/phase11.js';
import {
  MessageSquare,
  Send,
  User,
  ShieldAlert,
  Clock,
  Search,
} from 'lucide-react';

export default function StudentMessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      setError(null);
      const res = await messagesService.getConversations();
      if (res.success) {
        setConversations(res.data || []);
        if (res.data?.length > 0 && !activePartnerId) {
          selectConversation(res.data[0].user);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (partner) => {
    if (!partner || !partner._id) return;
    setActivePartnerId(partner._id);
    setActivePartner(partner);
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activePartnerId || !messageText.trim()) return;

    try {
      setSending(true);
      const res = await messagesService.send(activePartnerId, messageText.trim());
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setMessageText('');
        // Refresh conversations list to update snippet
        fetchConversations();
      }
    } catch (err) {
      setError(err.message || 'Failed to send message. Note: Students may only message instructors and coordinators.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout title="Direct Messaging">
      <div className="space-y-6">
        {/* Info Banner per ASM-05 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3 text-sm text-blue-800">
          <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">Academic & Career Communication (ASM-05)</p>
            <p>
              Students can direct-message course instructors and internship coordinators. Peer-to-peer messaging
              is restricted to protect academic integrity and maintain safe channels.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}

        {/* Messaging Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[600px]">
          {/* Conversation List */}
          <div className="border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-800">Conversations</h2>
              <p className="text-xs text-gray-500 mt-0.5">Instructors & Coordinators</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loadingConversations ? (
                <div className="p-6">
                  <LoadingState message="Loading conversations..." />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p>No active conversations yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Messages from instructors will appear here.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const partner = conv.user;
                  const isSelected = activePartnerId === partner?._id;
                  return (
                    <button
                      key={partner?._id || Math.random()}
                      onClick={() => selectConversation(partner)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start space-x-3 ${
                        isSelected ? 'bg-primary-50/50 border-l-4 border-primary-600' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 font-semibold text-sm">
                        {partner?.firstName?.[0] || 'U'}
                        {partner?.lastName?.[0] || ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {partner?.firstName} {partner?.lastName}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1 capitalize">
                          {partner?.role || 'Staff'}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {conv.lastMessage?.body || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 flex flex-col bg-white">
            {activePartner ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {activePartner?.firstName?.[0]}
                      {activePartner?.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {activePartner.firstName} {activePartner.lastName}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize">{activePartner.role} • {activePartner.email}</p>
                    </div>
                  </div>
                  <Badge variant="info">Verified Staff</Badge>
                </div>

                {/* Message Thread */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/30">
                  {loadingThread ? (
                    <LoadingState message="Loading messages..." />
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm">
                      <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p>Start a conversation with {activePartner.firstName}.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === 'me' || m.senderId?._id !== activePartner._id && m.senderId !== activePartner._id;
                      return (
                        <div
                          key={m._id || Math.random()}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isMe
                                ? 'bg-primary-600 text-white rounded-br-none'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <div
                              className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${
                                isMe ? 'text-primary-100' : 'text-gray-400'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${activePartner.firstName}...`}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={sending}
                  />
                  <Button type="submit" disabled={sending || !messageText.trim()}>
                    <Send className="w-4 h-4 mr-1" />
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <MessageSquare className="w-16 h-16 text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-700">Select a conversation</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-1">
                  Choose an instructor or coordinator from the list on the left to view messages.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
