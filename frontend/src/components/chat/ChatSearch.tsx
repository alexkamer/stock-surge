import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

interface ChatSearchProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ id: string; content: string; role: string }>;
  onJumpToMessage?: (messageId: string) => void;
}

interface SearchResult {
  messageId: string;
  content: string;
  role: string;
  matchIndex: number;
}

export function ChatSearch({ isOpen, onClose, messages, onJumpToMessage }: ChatSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const searchTerm = query.toLowerCase();
    const foundResults: SearchResult[] = [];

    messages.forEach((message) => {
      const content = message.content.toLowerCase();
      let index = content.indexOf(searchTerm);

      while (index !== -1) {
        foundResults.push({
          messageId: message.id,
          content: message.content,
          role: message.role,
          matchIndex: index,
        });
        index = content.indexOf(searchTerm, index + 1);
      }
    });

    setResults(foundResults);
    setCurrentIndex(0);
  }, [query, messages]);

  const handleNext = () => {
    if (results.length === 0) return;
    const nextIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIndex);
    jumpToResult(results[nextIndex]);
  };

  const handlePrevious = () => {
    if (results.length === 0) return;
    const prevIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    jumpToResult(results[prevIndex]);
  };

  const jumpToResult = (result: SearchResult) => {
    if (onJumpToMessage) {
      onJumpToMessage(result.messageId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl">
        <div className="flex items-center gap-2 p-3">
          {/* Search icon */}
          <Search size={18} className="text-slate-400 flex-shrink-0" />

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500"
          />

          {/* Results counter */}
          {results.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
              <span>
                {currentIndex + 1} / {results.length}
              </span>

              {/* Navigation buttons */}
              <button
                onClick={handlePrevious}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
                title="Previous (Shift+Enter)"
                disabled={results.length === 0}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={handleNext}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
                title="Next (Enter)"
                disabled={results.length === 0}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {/* No results indicator */}
          {query && results.length === 0 && (
            <span className="text-xs text-slate-500 flex-shrink-0">No results</span>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 transition-colors flex-shrink-0"
            title="Close (Esc)"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-3 pb-2 flex items-center gap-3 text-xs text-slate-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Enter</kbd> Next
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Shift+Enter</kbd>{" "}
            Previous
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to highlight search matches in text
 */
export function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-400/30 text-yellow-400 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
