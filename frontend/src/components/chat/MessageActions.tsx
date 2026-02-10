import { useState } from "react";
import { Copy, Check, FileText, RotateCcw } from "lucide-react";

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  isAssistantMessage?: boolean;
}

export function MessageActions({
  content,
  onRegenerate,
  isAssistantMessage = false,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [copiedAsMarkdown, setCopiedAsMarkdown] = useState(false);

  const handleCopyPlain = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMarkdown = () => {
    // For assistant messages, preserve markdown formatting
    const markdownContent = isAssistantMessage
      ? content
      : `> ${content.split("\n").join("\n> ")}`;

    navigator.clipboard.writeText(markdownContent);
    setCopiedAsMarkdown(true);
    setTimeout(() => setCopiedAsMarkdown(false), 2000);
  };

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 p-1">
      {/* Copy as plain text */}
      <button
        onClick={handleCopyPlain}
        className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
        title="Copy text"
        aria-label="Copy text"
      >
        {copied ? (
          <Check size={14} className="text-green-400" />
        ) : (
          <Copy size={14} />
        )}
      </button>

      {/* Copy as markdown */}
      {isAssistantMessage && (
        <button
          onClick={handleCopyMarkdown}
          className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
          title="Copy as markdown"
          aria-label="Copy as markdown"
        >
          {copiedAsMarkdown ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <FileText size={14} />
          )}
        </button>
      )}

      {/* Regenerate (only for assistant messages) */}
      {isAssistantMessage && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
          title="Regenerate response"
          aria-label="Regenerate response"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}
