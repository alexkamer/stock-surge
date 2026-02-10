import React, { useEffect } from "react";
import { X, ExternalLink, User, Calendar, FileText } from "lucide-react";
import type { ArticleContent } from "../../api/endpoints/stocks";

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArticleContent | null;
  isLoading: boolean;
  originalUrl: string;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  isOpen,
  onClose,
  article,
  isLoading,
  originalUrl,
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            Article Reader
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] px-6 py-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
              <p className="text-text-secondary">Loading article...</p>
            </div>
          )}

          {!isLoading && article && !article.success && (
            <div className="text-center py-12">
              <div className="bg-negative/10 border border-negative/30 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-negative font-semibold mb-2">
                  Failed to load article
                </p>
                <p className="text-text-secondary text-sm mb-4">
                  {article.error || "The article content could not be retrieved. This may be due to a paywall, anti-scraping protection, or the site being unavailable."}
                </p>
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-background rounded hover:bg-accent/90 transition-colors"
                >
                  <ExternalLink size={16} />
                  Open Original Article
                </a>
              </div>
            </div>
          )}

          {!isLoading && article && article.success && (
            <div className="space-y-6">
              {/* Article Title */}
              {article.title && (
                <h1 className="text-3xl font-bold text-text-primary leading-tight">
                  {article.title}
                </h1>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary pb-4 border-b border-border">
                {article.author && (
                  <div className="flex items-center gap-1.5">
                    <User size={14} />
                    <span>{article.author}</span>
                  </div>
                )}
                {article.publish_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{new Date(article.publish_date).toLocaleDateString()}</span>
                  </div>
                )}
                {article.word_count && (
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>{article.word_count} words · {Math.ceil(article.word_count / 200)} min read</span>
                  </div>
                )}
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-accent hover:underline ml-auto"
                >
                  <ExternalLink size={14} />
                  View Original
                </a>
              </div>

              {/* Article Content */}
              {article.content ? (
                <div className="prose prose-invert max-w-none">
                  <div className="text-text-primary leading-relaxed space-y-4 whitespace-pre-wrap">
                    {article.content}
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary text-center py-8">
                  No content available
                </p>
              )}

              {/* Disclaimer */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-text-secondary">
                  This article was automatically extracted from the source website. Some formatting
                  and elements may differ from the original. For the complete experience, visit the
                  original article.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
