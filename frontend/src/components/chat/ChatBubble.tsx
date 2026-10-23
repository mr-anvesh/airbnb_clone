'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  markConversationRead,
  getChatWsUrl,
} from '@/lib/api';
import type { ConversationResponse, ChatMessage } from '@/types';

export default function ChatBubble() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations when panel opens
  useEffect(() => {
    if (!open || !currentUser) return;
    setLoading(true);
    getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, currentUser]);

  // Listen for "open-chat" events from ContactHostButton or Header
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setOpen(true);
      if (!detail?.listingId) return;
      try {
        const convs = await getConversations();
        setConversations(convs);
        const target = convs.find((c) => c.listing_id === detail.listingId);
        if (target) openConversation(target);
      } catch {}
    };
    window.addEventListener('open-chat', handler);
    return () => window.removeEventListener('open-chat', handler);
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket connection
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
                ? {
                    ...c,
                    last_message: msg.content,
                    last_message_at: msg.created_at,
                    unread_count:
                      msg.sender_id !== currentUser.id
                        ? c.unread_count + 1
                        : c.unread_count,
                  }
                : c
            )
          );
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [currentUser]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const openConversation = async (conv: ConversationResponse) => {
    setActiveConv(conv);
    setMessages([]);
    setLoading(true);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      if (conv.unread_count > 0) {
        await markConversationRead(conv.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch {}
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    if (!activeConv || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            conversation_id: activeConv.id,
            content,
          })
        );
      } else {
        const msg = await sendMessageApi(activeConv.id, content);
        setMessages((prev) => [...prev, msg]);
      }
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-active text-white flex items-center justify-center shadow-lg transition-all hover:scale-105"
        aria-label="Open chat"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-ink text-canvas text-[11px] font-bold rounded-full flex items-center justify-center px-1">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-canvas border border-hairline rounded-[16px] flex flex-col overflow-hidden"
          style={{ boxShadow: 'rgba(0,0,0,0.15) 0 8px 40px' }}
        >
          {activeConv ? (
            /* Message view */
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline shrink-0">
                <button
                  onClick={() => setActiveConv(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-soft transition-colors text-ink"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                    {activeConv.other_user_avatar ? (
                      <img
                        src={activeConv.other_user_avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      activeConv.other_user_name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {activeConv.other_user_name}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      {activeConv.listing_title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-hairline border-t-primary rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-sm text-muted">
                      No messages yet. Say hello!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-3.5 py-2 rounded-[18px] text-sm leading-relaxed ${
                            isMe
                              ? 'bg-primary text-white rounded-br-[4px]'
                              : 'bg-surface-soft text-ink rounded-bl-[4px]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isMe ? 'text-white/70' : 'text-muted'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 py-3 border-t border-hairline shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none border border-hairline rounded-[20px] px-4 py-2.5 text-sm text-ink bg-canvas outline-none focus:border-ink transition-colors placeholder:text-muted"
                    style={{ maxHeight: '80px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="w-10 h-10 rounded-full bg-primary hover:bg-primary-active disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Conversation list */
            <>
              <div className="px-4 py-4 border-b border-hairline shrink-0">
                <h2 className="text-lg font-semibold text-ink">Messages</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-hairline border-t-primary rounded-full animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <MessageCircle size={40} className="text-muted mb-3 opacity-40" />
                    <p className="text-sm font-medium text-ink mb-1">No messages yet</p>
                    <p className="text-xs text-muted">
                      Start a conversation by contacting a host from a listing page.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors text-left border-b border-hairline last:border-0"
                    >
                      <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden">
                        {conv.other_user_avatar ? (
                          <img
                            src={conv.other_user_avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          conv.other_user_name[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              conv.unread_count > 0
                                ? 'font-semibold text-ink'
                                : 'font-medium text-ink'
                            }`}
                          >
                            {conv.other_user_name}
                          </p>
                          {conv.last_message_at && (
                            <span className="text-[10px] text-muted shrink-0">
                              {formatTime(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate mt-0.5">
                          {conv.listing_title}
                        </p>
                        {conv.last_message && (
                          <p
                            className={`text-xs truncate mt-0.5 ${
                              conv.unread_count > 0
                                ? 'text-ink font-medium'
                                : 'text-muted'
                            }`}
                          >
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
            </>
          )}
        </div>
      )}
    </>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
