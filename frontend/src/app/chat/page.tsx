'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import Header from '@/components/navigation/Header';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  createConversation,
  markConversationRead,
  getChatWsUrl,
} from '@/lib/api';
import type { ConversationResponse, ChatMessage } from '@/types';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    getConversations()
      .then(async (convs) => {
        setConversations(convs);
        const listingId = searchParams.get('listing_id');
        if (listingId) {
          await createConversation(Number(listingId)).catch(() => {});
          const updated = await getConversations();
          setConversations(updated);
          const target = updated.find((c) => c.listing_id === Number(listingId));
          if (target) {
            setActiveConv(target);
            setShowSidebar(false);
            const msgs = await getMessages(target.id);
            setMessages(msgs);
            if (target.unread_count > 0) await markConversationRead(target.id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket
  useEffect(() => {
    if (!currentUser) return;
    const url = getChatWsUrl();
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
          const msg: ChatMessage = data.message;
          setMessages((prev) => {
            if (prev.length > 0 && prev[0].conversation_id === msg.conversation_id) {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            }
            return prev;
          });
          setConversations((prev) =>
            prev.map((c) =>
              c.id === msg.conversation_id
                ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread_count: msg.sender_id !== currentUser.id ? c.unread_count + 1 : c.unread_count }
                : c
            )
          );
        }
      } catch {}
    };
    return () => { ws.close(); wsRef.current = null; };
  }, [currentUser]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const openConversation = async (conv: ConversationResponse) => {
    setActiveConv(conv);
    setShowSidebar(false);
    setMessages([]);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      if (conv.unread_count > 0) {
        await markConversationRead(conv.id);
        setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)));
      }
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    if (!activeConv || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message', conversation_id: activeConv.id, content }));
      } else {
        const msg = await sendMessageApi(activeConv.id, content);
        setMessages((prev) => [...prev, msg]);
      }
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (authLoading) return <div className="min-h-screen bg-canvas" />;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-muted text-sm">Please log in to access messages.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex border-t border-hairline">
      {/* Sidebar */}
      <div className={`w-full md:w-[360px] md:border-r border-hairline flex flex-col bg-canvas shrink-0 ${!showSidebar ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-5 py-4 border-b border-hairline">
          <h1 className="text-xl font-semibold text-ink">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-hairline border-t-primary rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <MessageCircle size={48} className="text-muted mb-4 opacity-30" />
              <p className="text-sm font-medium text-ink mb-1">No messages yet</p>
              <p className="text-xs text-muted">Start a conversation by contacting a host from a listing page.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-soft transition-colors text-left border-b border-hairline ${activeConv?.id === conv.id ? 'bg-surface-soft' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden">
                  {conv.other_user_avatar ? (
                    <img src={conv.other_user_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    conv.other_user_name[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
                      {conv.other_user_name}
                    </p>
                    {conv.last_message_at && (
                      <span className="text-[11px] text-muted shrink-0">{formatTime(conv.last_message_at)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{conv.listing_title}</p>
                  {conv.last_message && (
                    <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-ink font-medium' : 'text-muted'}`}>
                      {conv.last_message}
                    </p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className="min-w-[20px] h-5 bg-primary text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message area */}
      <div className={`flex-1 flex flex-col bg-canvas ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-hairline shrink-0">
              <button onClick={() => { setShowSidebar(true); setActiveConv(null); }} className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-soft text-ink">
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0">
                {activeConv.other_user_avatar ? (
                  <img src={activeConv.other_user_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  activeConv.other_user_name[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{activeConv.other_user_name}</p>
                <p className="text-xs text-muted truncate">{activeConv.listing_title}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[65%] px-4 py-2.5 rounded-[20px] text-sm leading-relaxed ${isMe ? 'bg-primary text-white rounded-br-[4px]' : 'bg-surface-soft text-ink rounded-bl-[4px]'}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-muted'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-5 py-4 border-t border-hairline shrink-0">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border border-hairline rounded-[20px] px-4 py-3 text-sm text-ink bg-canvas outline-none focus:border-ink transition-colors placeholder:text-muted"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 rounded-full bg-primary hover:bg-primary-active disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center">
            <div>
              <MessageCircle size={48} className="text-muted mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <Suspense>
        <ChatPageContent />
      </Suspense>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
