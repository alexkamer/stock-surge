import { useState } from "react";
import { X, Download, FileText, Code, File } from "lucide-react";
import { exportChat } from "../../lib/chatExport";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  sessionTitle?: string;
}

type ExportFormat = "markdown" | "json" | "text";

export function ExportChatModal({
  isOpen,
  onClose,
  messages,
  sessionTitle,
}: ExportChatModalProps) {
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    exportChat(messages, {
      format,
      includeTimestamps,
    });
    onClose();
  };

  const formatOptions = [
    {
      value: "markdown" as ExportFormat,
      label: "Markdown",
      icon: FileText,
      description: "Formatted text with headings",
      extension: ".md",
    },
    {
      value: "json" as ExportFormat,
      label: "JSON",
      icon: Code,
      description: "Structured data format",
      extension: ".json",
    },
    {
      value: "text" as ExportFormat,
      label: "Plain Text",
      icon: File,
      description: "Simple text file",
      extension: ".txt",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold">Export Conversation</h2>
            {sessionTitle && <p className="text-sm text-slate-400 mt-0.5">{sessionTitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <div className="space-y-2">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = format === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/50"
                        : "border-slate-700 hover:bg-slate-700/50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded ${
                        isSelected ? "bg-blue-500/20" : "bg-slate-700"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={isSelected ? "text-blue-400" : "text-slate-400"}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{option.label}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {option.extension}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium mb-2">Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm">Include timestamps</span>
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <Download size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Export Details</p>
                <p className="text-slate-400">
                  Exporting {messages.length} message{messages.length !== 1 ? "s" : ""} from this
                  conversation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={messages.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
