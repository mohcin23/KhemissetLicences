import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, X, MessageCircle, Loader2, Plus, Trash2, MessageSquare, ChevronLeft, Pencil, User, Sparkles } from 'lucide-react';
import { aiAPI } from '../../services/api';
import { t } from '../../i18n/translations';

const STORAGE_KEY = 'citizen_ai_conversations';

function getConversations(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(userId, convos) {
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(convos));
}

function generateId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createConversation(lang) {
  return {
    id: generateId(),
    title: '',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function generateTitle(text, lang) {
  if (!text) return lang === 'ar' ? 'محادثة جديدة' : 'Nouvelle conversation';
  const clean = text.replace(/\n/g, ' ').trim();
  return clean.length > 42 ? clean.slice(0, 42).trimEnd() + '...' : clean;
}

export default function CitizenAiChat({ lang, authUser, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; });

  const isRtl = lang === 'ar';
  const userId = authUser?.id || 'guest';

  const activeConvo = conversations.find(c => c.id === activeConvoId);
  const messages = activeConvo?.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    const saved = getConversations(userId);
    if (saved.length > 0) {
      // Fix: generate titles for conversations that have messages but no title
      const fixed = saved.map(c => {
        if (!c.title && c.messages?.length) {
          const firstUser = c.messages.find(m => m.role === 'user');
          if (firstUser) return { ...c, title: generateTitle(firstUser.content, lang) };
        }
        return c;
      });
      setConversations(fixed);
      setActiveConvoId(fixed[0].id);
      saveConversations(userId, fixed);
    }
  }, [userId, lang]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const persist = useCallback((updater) => {
    setConversations(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveConversations(userId, next);
      return next;
    });
  }, [userId]);

  const handleNewConversation = () => {
    const c = createConversation(lang);
    persist(prev => [c, ...prev]);
    setActiveConvoId(c.id);
    setShowSidebar(false);
  };

  const handleSelectConversation = (id) => {
    setActiveConvoId(id);
    setShowSidebar(false);
  };

  const handleDeleteConversation = (id, e) => {
    e?.stopPropagation();
    persist(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (activeConvoId === id) setActiveConvoId(updated[0]?.id || null);
      return updated;
    });
  };

  const handleStartEdit = (id, title, e) => {
    e?.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editTitle.trim()) { setEditingId(null); return; }
    persist(prev => prev.map(c => c.id === editingId ? { ...c, title: editTitle.trim() } : c));
    setEditingId(null);
  };

  const updateMessages = useCallback((convoId, newMessages, isNewConvo = false) => {
    persist(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      const hasUserMsg = newMessages.some(m => m.role === 'user');
      const needsTitle = !c.title && hasUserMsg;
      const title = needsTitle ? generateTitle(newMessages.find(m => m.role === 'user')?.content, lang) : c.title;
      return { ...c, title, messages: newMessages, updatedAt: Date.now() };
    }));
  }, [persist, lang]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const convos = conversationsRef.current;
    const isNewConvo = !activeConvoId;
    let targetConvoId = activeConvoId;
    if (!targetConvoId) {
      const c = createConversation(lang);
      persist(prev => [c, ...prev]);
      targetConvoId = c.id;
      setActiveConvoId(c.id);
    }

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const currentConvo = convos.find(c => c.id === targetConvoId) || { messages: [] };
    const newMessages = [...currentConvo.messages, userMsg];
    updateMessages(targetConvoId, newMessages, isNewConvo);

    setInputValue('');
    setIsLoading(true);
    setStreamingText('');

    try {
      const history = currentConvo.messages.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      let acc = '';
      const result = await aiAPI.chatStream(text, history, (_, full) => { acc = full; setStreamingText(full); });
      if (!acc && result) acc = result;

      if (acc) {
        const assistantMsg = { role: 'assistant', content: acc, timestamp: Date.now() };
        updateMessages(targetConvoId, [...newMessages, assistantMsg]);
      }
      setStreamingText('');
    } catch {
      const err = { role: 'assistant', content: t(lang, 'aiChatConnectionError'), timestamp: Date.now() };
      updateMessages(targetConvoId, [...newMessages, err]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { hour: '2-digit', minute: '2-digit' }) : '';

  const preview = (convo) => {
    if (!convo.messages?.length) return t(lang, 'aiChatNoMessages');
    const last = convo.messages[convo.messages.length - 1];
    const txt = last.content || '';
    return txt.length > 45 ? txt.slice(0, 45) + '...' : txt;
  };

  /* ── Render ── */
  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`group fixed bottom-6 z-50 w-14 h-14 bg-gradient-to-br from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-emerald-500/40 ${isRtl ? 'left-6' : 'right-6'}`}
          aria-label={t(lang, 'aiChatOpen')}
        >
          <MessageCircle className="w-6 h-6 transition-transform group-hover:scale-110" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 ${isRtl ? 'font-[Cairo] left-6' : 'right-6'}`}
          style={{ width: 'min(440px, calc(100vw - 48px))', height: 'min(640px, calc(100vh - 100px))' }}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* ─── Header ─── */}
          <div className="bg-gradient-to-r from-[#10B981] to-[#059669] px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(s => !s)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                {showSidebar
                  ? <ChevronLeft className={`w-4 h-4 text-white ${isRtl ? 'rotate-180' : ''}`} />
                  : <MessageSquare className="w-4 h-4 text-white" />
                }
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[13px] leading-tight">{t(lang, 'aiChatTitle')}</h3>
                  <p className="text-emerald-100 text-[10px]">{t(lang, 'aiChatSubtitle')}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleNewConversation}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                title={t(lang, 'aiChatNewConversation')}
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => { setIsOpen(false); onClose?.(); }}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* ─── Sidebar ─── */}
            <div
              className={`bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${showSidebar ? 'w-56 border-r' : 'w-0 border-r-0'} ${isRtl ? 'border-r-0 border-l' : ''}`}
            >
              <div className="p-2.5">
                <button
                  onClick={handleNewConversation}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t(lang, 'aiChatNewConversation')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
                {!conversations.length && (
                  <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-10">{t(lang, 'aiChatNoConversations')}</p>
                )}
                {conversations.map(convo => (
                  <div key={convo.id} onClick={() => handleSelectConversation(convo.id)} className="relative group cursor-pointer">
                    {editingId === convo.id ? (
                      <div className="px-1.5 py-1">
                        <input
                          ref={editInputRef}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                          onBlur={handleSaveEdit}
                          className="w-full px-2.5 py-1.5 text-[13px] bg-white dark:bg-slate-800 border border-[#10B981] rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] transition-all ${
                        activeConvoId === convo.id
                          ? 'bg-[#10B981]/10 text-[#059669] dark:text-[#10B981] font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}>
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                        <span className="flex-1 truncate">{convo.title || t(lang, 'aiChatNewConversation')}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={e => handleStartEdit(convo.id, convo.title, e)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Pencil className="w-3 h-3 text-slate-400" />
                          </button>
                          <button onClick={e => handleDeleteConversation(convo.id, e)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Chat Area ─── */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                {/* Welcome */}
                {!messages.length && !streamingText && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-[fadeIn_0.3s_ease]">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                      {lang === 'ar' ? 'مرحباً!' : 'Bonjour !'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">
                      {t(lang, 'aiChatWelcome')}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[300px]">
                      {(lang === 'ar'
                        ? ['ما هي الرخص المتوفرة؟', 'كيف أودع طلباً؟', 'أي وثائق مطلوبة؟']
                        : ['Quelles licences existent ?', 'Comment déposer une demande ?', 'Quels documents sont requis ?']
                      ).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setInputValue(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                          className="px-3 py-1.5 text-xs font-medium text-[#059669] dark:text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 rounded-full transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages list */}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[slideUp_0.2s_ease]`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[78%] px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white rounded-2xl rounded-tr-md shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-md'
                    }`}>
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      {msg.timestamp && (
                        <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {fmtTime(msg.timestamp)}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming */}
                {isLoading && streamingText && (
                  <div className="flex gap-3 justify-start animate-[slideUp_0.2s_ease]">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="max-w-[78%] px-4 py-2.5 text-[13px] leading-relaxed bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-md">
                      <div className="whitespace-pre-wrap break-words">
                        {streamingText}
                        <span className="inline-block w-[2px] h-4 bg-[#10B981] ml-0.5 align-middle animate-pulse rounded-full" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading dots */}
                {isLoading && !streamingText && (
                  <div className="flex gap-3 justify-start animate-[slideUp_0.2s_ease]">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ─── Input ─── */}
              <div className="px-4 pb-4 pt-2 shrink-0">
                <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 border border-slate-200 dark:border-slate-700 focus-within:border-[#10B981] focus-within:ring-2 focus-within:ring-[#10B981]/20 transition-all">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t(lang, 'aiChatPlaceholder')}
                    rows={1}
                    className="flex-1 resize-none bg-transparent border-none text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none py-1.5 max-h-20"
                    style={{ minHeight: '24px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-8 h-8 bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-all shrink-0 disabled:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                  {t(lang, 'aiChatPoweredBy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
