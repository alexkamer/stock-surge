import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Plus, MessageSquare, TrendingUp, Trash2, Copy, Check, Search, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatApi } from "../api/endpoints/chat";
import type { ChatMessage as ChatMessageType } from "../api/endpoints/chat";
import { detectTickers, detectUrls, detectComparison } from "../lib/tickerParser";
import { TickerCard } from "../components/chat/TickerCard";
import { ArticleSummaryCard } from "../components/chat/ArticleSummaryCard";
import { StockComparison } from "../components/chat/StockComparison";
import { InlinePriceChart } from "../components/chat/InlinePriceChart";
import { MessageActions } from "../components/chat/MessageActions";
import { ChatSearch } from "../components/chat/ChatSearch";
import { ExportChatModal } from "../components/modals/ExportChatModal";
import { useChatKeyboardShortcuts } from "../hooks/useChatKeyboardShortcuts";

// Component to render message with enhanced features
const EnhancedMessageContent: React.FC<{
  content: string;
  role: "user" | "assistant";
}> = ({ content, role }) => {
  // Only process assistant messages for enhancements
  if (role === "user") {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  // Detect URLs for article summarization
  const urls = detectUrls(content);

  // Detect tickers
  const tickers = detectTickers(content);

  // Detect comparison intent
  const comparisonTickers = detectComparison(content);

  // Detect if user is asking for charts
  const wantsChart = /\b(chart|graph|plot|trend|visual|show me)\b/i.test(content);

  return (
    <div className="space-y-4">
      {/* Show comparison if detected */}
      {comparisonTickers && comparisonTickers.length >= 2 && (
        <StockComparison tickers={comparisonTickers} period="1mo" />
      )}

      {/* Render markdown content */}
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-text-primary mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-text-primary mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-text-primary mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-text-primary mb-3 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="text-sm text-text-primary mb-3 list-disc list-inside space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-sm text-text-primary mb-3 list-decimal list-inside space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-sm text-text-primary">{children}</li>,
          code: ({ inline, children }: any) => (
            <CodeBlock inline={inline}>{children}</CodeBlock>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-positive hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-positive pl-4 italic text-text-secondary mb-3">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-text-primary">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Show ticker cards for mentioned tickers (limit to 5) */}
      {tickers.length > 0 && !comparisonTickers && (
        <>
          <div className="flex flex-wrap gap-3">
            {tickers.slice(0, 5).map((match) => (
              <TickerCard key={match.ticker} ticker={match.ticker} compact />
            ))}
          </div>

          {/* Show chart if user asked for it or if few tickers (better visual) */}
          {(wantsChart || tickers.length <= 3) && (
            <div className="space-y-3">
              {tickers.slice(0, 3).map((match) => (
                <InlinePriceChart key={match.ticker} ticker={match.ticker} period="1mo" height={250} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Show article summaries for detected URLs */}
      {urls.length > 0 &&
        urls.slice(0, 2).map((url) => <ArticleSummaryCard key={url} url={url} />)}
    </div>
  );
};

// Code block component with copy functionality
const CodeBlock: React.FC<{ children: React.ReactNode; inline?: boolean }> = ({ children, inline }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono text-positive">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group mb-3">
      <code className="block bg-background p-3 rounded text-xs font-mono overflow-x-auto">
        {children}
      </code>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-slate-700 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
        title="Copy code"
      >
        {copied ? (
          <Check size={14} className="text-green-400" />
        ) : (
          <Copy size={14} className="text-slate-300" />
        )}
      </button>
    </div>
  );
};

export const Chat: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Fetch all sessions
  const { data: sessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: chatApi.getSessions,
    retry: false,
  });

  // Detect anonymous mode (when sessions fail to load due to auth)
  useEffect(() => {
    if (sessionsError) {
      setIsAnonymousMode(true);
    }
  }, [sessionsError]);

  // Fetch current session messages
  const { data: currentSession } = useQuery({
    queryKey: ["chat-session", currentSessionId],
    queryFn: () => chatApi.getSession(currentSessionId!),
    enabled: !!currentSessionId,
  });

  // Update messages when session loads
  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages);
    }
  }, [currentSession]);

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (newSession) => {
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: chatApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (sessions.length > 0) {
        // Switch to first session
        const firstSession = sessions[0];
        if (firstSession.id !== currentSessionId) {
          setCurrentSessionId(firstSession.id);
        } else if (sessions.length > 1) {
          setCurrentSessionId(sessions[1].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
  });

  const handleNewChat = () => {
    createSessionMutation.mutate(undefined);
  };

  // Keyboard shortcuts
  useChatKeyboardShortcuts({
    onNewChat: handleNewChat,
    onSearch: () => setIsSearchOpen(true),
    onExport: () => setIsExportModalOpen(true),
    onFocusInput: () => inputRef.current?.focus(),
  });

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // If anonymous mode, use anonymous endpoint
    if (isAnonymousMode) {
      sendAnonymousMessage(userMessage);
      return;
    }

    // Create session if none exists
    if (!currentSessionId) {
      createSessionMutation.mutate(undefined, {
        onSuccess: (newSession) => {
          sendMessageToSession(newSession.id, userMessage);
        },
      });
      return;
    }

    sendMessageToSession(currentSessionId, userMessage);
  };

  const sendAnonymousMessage = (content: string) => {
    // Add user message immediately
    const userMsg: ChatMessageType = {
      id: `temp-${Date.now()}`,
      session_id: "anonymous",
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent("");

    let fullResponse = "";

    // Start streaming
    streamRef.current = chatApi.sendAnonymousMessage(
      content,
      (chunk) => {
        fullResponse += chunk;
        setStreamingContent(fullResponse);
      },
      (error) => {
        console.error("Streaming error:", error);
        setStreamingContent(
          `Error: ${error}. Make sure Ollama is running with: ollama serve`
        );
        setIsLoading(false);
      },
      () => {
        // On complete - save the assistant message locally
        const assistantMsg: ChatMessageType = {
          id: `temp-${Date.now()}`,
          session_id: "anonymous",
          role: "assistant",
          content: fullResponse,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsLoading(false);
        setStreamingContent("");
      }
    );
  };

  const sendMessageToSession = (sessionId: string, content: string) => {
    // Add user message immediately
    const userMsg: ChatMessageType = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent("");

    // Start streaming
    streamRef.current = chatApi.sendMessage(
      sessionId,
      content,
      (chunk) => {
        setStreamingContent((prev) => prev + chunk);
      },
      (error) => {
        console.error("Streaming error:", error);
        setStreamingContent(
          `Error: ${error}. Make sure Ollama is running with: ollama serve`
        );
        setIsLoading(false);
      },
      () => {
        // On complete
        setIsLoading(false);

        // Refresh session to get saved messages with IDs
        queryClient.invalidateQueries({
          queryKey: ["chat-session", sessionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["chat-sessions"],
        });

        setStreamingContent("");
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const suggestedQuestions = [
    "How is the tech sector performing today?",
    "Compare AAPL and MSFT",
    "What are the top gainers today?",
    "Explain what P/E ratio means",
  ];

  // If no session, show welcome screen
  const showWelcome = !currentSessionId && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-73px)] bg-background">
      {/* Sidebar - Conversation History */}
      <div className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <button
            onClick={handleNewChat}
            disabled={createSessionMutation.isPending || isAnonymousMode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-positive text-background rounded-lg hover:bg-positive/90 transition font-medium text-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isAnonymousMode ? (
            <div className="text-center text-text-secondary text-xs mt-4 px-2">
              <p className="font-medium text-text-primary mb-2">Anonymous Mode</p>
              <p>Your messages won't be saved. Log in to save conversations.</p>
            </div>
          ) : sessionsLoading ? (
            <div className="text-center text-text-secondary text-xs mt-4 px-2">
              Loading conversations...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-text-secondary text-xs mt-4 px-2">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition group relative ${
                  session.id === currentSessionId
                    ? "bg-background border border-positive/50"
                    : "bg-surface border border-border/50 hover:bg-background"
                }`}
                onClick={() => setCurrentSessionId(session.id)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-sm text-text-primary truncate">
                      {session.title || "New Conversation"}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {session.message_count || 0} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-negative/20 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-negative" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-text-secondary">
            <p className="font-medium mb-1">Need help?</p>
            <p>Try asking about stocks, sectors, or market analysis.</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {messages.length > 0 && `${messages.length} messages`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background rounded transition-colors"
              title="Search (Cmd/Ctrl+K)"
            >
              <Search size={14} />
              Search
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export (Cmd/Ctrl+E)"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {showWelcome && (
              <div className="text-center mb-8">
                <MessageSquare className="w-16 h-16 text-positive mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Welcome to Stock Surge Chat
                </h2>
                <p className="text-text-secondary">
                  I'm your AI assistant. Ask me about stocks, compare companies, or
                  get market insights.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={message.role === "user" ? "flex justify-end" : "w-full"}
              >
                {message.role === "user" ? (
                  <div className="max-w-[80%] rounded-lg p-4 bg-positive text-background relative group">
                    <EnhancedMessageContent content={message.content} role="user" />
                    <MessageActions content={message.content} isAssistantMessage={false} />
                  </div>
                ) : (
                  <div className="w-full py-6 px-4 bg-surface/30 relative group">
                    <div className="max-w-3xl mx-auto prose prose-invert prose-sm max-w-none">
                      <EnhancedMessageContent content={message.content} role="assistant" />
                    </div>
                    <MessageActions content={message.content} isAssistantMessage={true} />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {isLoading && streamingContent && (
              <div className="w-full py-6 px-4 bg-surface/30">
                <div className="max-w-3xl mx-auto prose prose-invert prose-sm max-w-none">
                  <EnhancedMessageContent content={streamingContent} role="assistant" />
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !streamingContent && (
              <div className="w-full py-6 px-4 bg-surface/30">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-xs text-text-secondary">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {showWelcome && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-positive" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    Suggested Questions
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(question)}
                      className="text-left p-3 bg-surface border border-border rounded-lg hover:border-positive hover:bg-background transition text-sm text-text-primary"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-surface">
          <div className="max-w-3xl mx-auto p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about stocks, compare companies, or analyze markets..."
                  rows={1}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-positive resize-none text-sm disabled:opacity-50"
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 bg-positive text-background rounded-lg hover:bg-positive/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <ChatSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        messages={messages}
      />

      {/* Export Modal */}
      <ExportChatModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        messages={messages.filter((m) => m.role !== "system") as any}
        sessionTitle={currentSession?.title || undefined}
      />
    </div>
  );
};
