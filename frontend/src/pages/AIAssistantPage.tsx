import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Send,
  User as UserIcon,
  Sparkles,
  Terminal,
  Cpu,
  CheckCircle2,
  Briefcase,
  HelpCircle,
  FileText,
  Square
} from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage } from '../types';

const API_BASE = (typeof window !== 'undefined' && window.location.port === '5173')
  ? `http://${window.location.hostname}:8000/api/v1`
  : '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('careerpilot_token');
}

export const AIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.checkAIHealth().then(setAiHealth).catch(() => null);

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hello! I am **CareerPilot AI**, your personal autonomous career agent. " +
          "I can search real vacancies in Kigali and remote feeds, evaluate your CV compatibility, " +
          "tailor documents, draft application pitches, or run mock interview simulations.\n\n" +
          "How can I assist your career search today?",
        metadata_json: {},
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || sending) return;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      metadata_json: {},
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setStreamingContent('');

    // Create abort controller for cancellation
    abortRef.current = new AbortController();

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content: text, session_id: sessionId }),
        signal: abortRef.current.signal
      });

      if (!response.ok || !response.body) {
        // Fallback to regular endpoint on error
        const responseMsg = await api.sendChatMessage(text, sessionId);
        setMessages(prev => [...prev, responseMsg]);
        setSending(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let msgId = `stream_${Date.now()}`;
      let finalSessionId = sessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (data.token) {
              accumulated += data.token;
              setStreamingContent(accumulated);
            }

            if (data.done) {
              if (data.session_id) finalSessionId = data.session_id;
              if (data.message_id) msgId = data.message_id;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Finalise: move streamed text into real message list
      const finalMsg: ChatMessage = {
        id: msgId,
        role: 'assistant',
        content: accumulated,
        metadata_json: {},
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, finalMsg]);
      setStreamingContent('');
      if (finalSessionId && finalSessionId !== sessionId) {
        setSessionId(finalSessionId);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — keep partial text as message
        if (streamingContent) {
          setMessages(prev => [...prev, {
            id: `cancelled_${Date.now()}`,
            role: 'assistant',
            content: streamingContent + ' _(stopped)_',
            metadata_json: {},
            created_at: new Date().toISOString()
          }]);
        }
        setStreamingContent('');
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Notice: ${err.message || 'Error communicating with agent engine.'}`,
            metadata_json: {},
            created_at: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [input, sending, sessionId, streamingContent]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const renderContent = (content: string) => {
    // Simple markdown-ish rendering: bold, bullets, line breaks
    return content
      .split('\n')
      .map((line, i) => {
        const boldLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
        const lineContent = isBullet ? boldLine.replace(/^[\s]*[-•]\s/, '') : boldLine;
        return (
          <span key={i}>
            {isBullet && <span className="mr-1 text-indigo-500">•</span>}
            <span dangerouslySetInnerHTML={{ __html: lineContent }} />
            {i < content.split('\n').length - 1 && <br />}
          </span>
        );
      });
  };

  const samplePrompts = [
    'What are my strongest professional skills?',
    'Find open software engineering jobs in Rwanda or Remote',
    'Prepare me for a technical interview using the STAR method',
    'Show me my highest-scoring compatibility matches'
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Title & AI Health Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Interactive AI Career Assistant</span>
          </h1>
          <p className="text-xs text-slate-500">
            Powered by LangGraph multi-agent orchestration · Streaming real-time responses.
          </p>
        </div>

        {aiHealth && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs shrink-0">
            <Cpu className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {aiHealth.provider === 'ollama' ? 'Ollama' : aiHealth.provider} ({aiHealth.configured_model})
            </span>
            {aiHealth.is_connected ? (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Online
              </span>
            ) : (
              <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium ml-1">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Offline
              </span>
            )}
          </div>
        )}
      </div>

      {/* Ollama Setup Instructions if offline */}
      {aiHealth && !aiHealth.is_connected && aiHealth.setup_instructions && (
        <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 shrink-0">
          <div className="flex items-center space-x-2 font-bold mb-1">
            <Terminal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>AI Setup Required</span>
          </div>
          <p className="text-[11px] leading-relaxed whitespace-pre-line">
            {aiHealth.setup_instructions}
          </p>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-1 ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
                <div className={`text-[10px] ${isUser ? 'text-indigo-200' : 'text-slate-400'} text-right pt-1`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live streaming bubble */}
        {sending && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800">
              {streamingContent ? (
                <>
                  <div className="whitespace-pre-wrap">{renderContent(streamingContent)}</div>
                  <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-0.5 animate-pulse rounded-sm" />
                </>
              ) : (
                <div className="flex items-center space-x-2 text-slate-400">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px]">Thinking...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={sending}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-40"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          placeholder="Ask a question or request an action from the career agent..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        {sending ? (
          <button
            type="button"
            onClick={handleStop}
            className="px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-1.5"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </div>
  );
};
