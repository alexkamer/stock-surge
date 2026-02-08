import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, Clock, BookOpen, Sparkles, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { stockApi, type ArticleContent } from "../../api/endpoints/stocks";
import { aiApi, type ArticleSummary } from "../../api/endpoints/ai";
import { formatDate } from "../../lib/formatters";
import { ArticleModal } from "../modals/ArticleModal";

interface NewsProps {
  ticker: string;
}

interface NewsArticle {
  id: string;
  content: {
    title: string;
    summary: string;
    pubDate: string;
    provider: {
      displayName: string;
    };
    thumbnail?: {
      resolutions?: Array<{
        url: string;
        tag: string;
      }>;
    };
    canonicalUrl?: {
      url: string;
    };
    clickThroughUrl?: {
      url: string;
    };
  };
}

export const News: React.FC<NewsProps> = ({ ticker }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string>("");
  const [scrapedArticle, setScrapedArticle] = useState<ArticleContent | null>(null);
  const [isScrapingArticle, setIsScrapingArticle] = useState(false);
  const [articleSummaries, setArticleSummaries] = useState<Map<string, ArticleSummary>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());

  const { data: news, isLoading, error } = useQuery({
    queryKey: ["news", ticker],
    queryFn: async () => {
      const data = await stockApi.getNews(ticker);
      return data as NewsArticle[];
    },
    enabled: !!ticker,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Check Ollama availability (optional, non-blocking)
  const { data: ollamaStatus } = useQuery({
    queryKey: ["ollama-status"],
    queryFn: () => aiApi.checkStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if Ollama is not available
  });

  const handleReadArticle = async (url: string) => {
    setSelectedArticleUrl(url);
    setIsModalOpen(true);
    setIsScrapingArticle(true);
    setScrapedArticle(null);

    try {
      const article = await stockApi.scrapeArticle(url);
      setScrapedArticle(article);
    } catch (error) {
      setScrapedArticle({
        success: false,
        url,
        error: "Failed to load article content",
      });
    } finally {
      setIsScrapingArticle(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArticleUrl("");
    setScrapedArticle(null);
  };

  const handleSummarize = async (articleUrl: string) => {
    // Check if already summarized
    if (articleSummaries.has(articleUrl)) {
      return;
    }

    // Add to loading set
    setLoadingSummaries(prev => new Set(prev).add(articleUrl));

    try {
      const summary = await aiApi.summarizeArticle(articleUrl, 150);
      setArticleSummaries(prev => new Map(prev).set(articleUrl, summary));
    } catch (error) {
      console.error("Failed to summarize article:", error);
      // Create error summary
      const errorSummary: ArticleSummary = {
        success: false,
        url: articleUrl,
        title: "",
        summary: error instanceof Error ? error.message : "Failed to generate summary. Make sure Ollama is running.",
        word_count: 0,
        model: "",
        original_word_count: 0,
      };
      setArticleSummaries(prev => new Map(prev).set(articleUrl, errorSummary));
    } finally {
      // Remove from loading set
      setLoadingSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleUrl);
        return newSet;
      });
    }
  };

  const getArticleUrl = (article: NewsArticle) => {
    return article.content.clickThroughUrl?.url || article.content.canonicalUrl?.url || "#";
  };

  const getThumbnailUrl = (article: NewsArticle) => {
    if (!article.content.thumbnail?.resolutions) return null;

    // Try to get the 170x128 thumbnail, or fall back to the first available
    const thumbnail = article.content.thumbnail.resolutions.find(
      (res) => res.tag === "170x128"
    ) || article.content.thumbnail.resolutions[0];

    return thumbnail?.url;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "1d ago";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return formatDate(dateString, "MMM d, yyyy");
    }
  };

  const getSentimentDisplay = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish":
        return {
          icon: <TrendingUp size={16} />,
          label: "Bullish",
          color: "text-positive",
          bgColor: "bg-positive/10",
          borderColor: "border-positive/20",
        };
      case "bearish":
        return {
          icon: <TrendingDown size={16} />,
          label: "Bearish",
          color: "text-negative",
          bgColor: "bg-negative/10",
          borderColor: "border-negative/20",
        };
      case "neutral":
        return {
          icon: <Minus size={16} />,
          label: "Neutral",
          color: "text-text-secondary",
          bgColor: "bg-surface",
          borderColor: "border-border",
        };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Recent News</h3>
        </div>
        {news && news.length > 0 && (
          <p className="text-sm text-text-secondary">
            {news.length} article{news.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Ollama AI Info Banner */}
      {ollamaStatus?.available && news && news.length > 0 && (
        <div className="card bg-accent/5 border-accent/30">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-text-primary">
                <span className="font-medium">AI Summaries Available</span> - Click the sparkle button
                on any article to generate an AI-powered summary using {ollamaStatus.model}.
              </p>
            </div>
          </div>
        </div>
      )}

      {ollamaStatus && !ollamaStatus.available && news && news.length > 0 && (
        <div className="card bg-surface border-border">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-text-secondary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">AI summaries are disabled.</span>{" "}
                Install Ollama to enable AI-powered article summaries. See{" "}
                <code className="text-xs bg-background px-1.5 py-0.5 rounded">OLLAMA_QUICKSTART.md</code>{" "}
                for setup instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      )}

      {error && (
        <div className="card text-center py-12 text-negative">
          <p>Error loading news</p>
          <p className="text-sm text-text-secondary mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {!isLoading && !error && news && news.length === 0 && (
        <div className="card text-center py-12">
          <Newspaper size={48} className="mx-auto mb-4 opacity-30 text-text-secondary" />
          <p className="text-text-secondary">No news articles available</p>
        </div>
      )}

      {!isLoading && !error && news && news.length > 0 && (
        <div className="space-y-4">
          {news.map((article) => {
            const thumbnailUrl = getThumbnailUrl(article);
            const articleUrl = getArticleUrl(article);
            const summary = articleSummaries.get(articleUrl);
            const isLoadingSummary = loadingSummaries.has(articleUrl);

            return (
              <div
                key={article.id}
                className="card hover:border-accent transition-all duration-200 group"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {thumbnailUrl && (
                    <div className="flex-shrink-0 w-32 h-24 rounded overflow-hidden bg-surface">
                      <img
                        src={thumbnailUrl}
                        alt={article.content.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary mb-2 line-clamp-2">
                      {article.content.title}
                    </h4>

                    {article.content.summary && !summary && (
                      <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                        {article.content.summary}
                      </p>
                    )}

                    {/* AI-Generated Summary */}
                    {summary && (
                      <div className="mb-3 p-3 bg-accent/5 border border-accent/20 rounded">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-accent" />
                            <span className="text-xs font-medium text-accent">AI Summary</span>
                          </div>
                          {summary.sentiment && getSentimentDisplay(summary.sentiment) && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${getSentimentDisplay(summary.sentiment)!.bgColor} border ${getSentimentDisplay(summary.sentiment)!.borderColor}`}>
                              <span className={getSentimentDisplay(summary.sentiment)!.color}>
                                {getSentimentDisplay(summary.sentiment)!.icon}
                              </span>
                              <span className={`text-xs font-medium ${getSentimentDisplay(summary.sentiment)!.color}`}>
                                {getSentimentDisplay(summary.sentiment)!.label}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {summary.summary}
                        </p>
                        {summary.key_takeaway && (
                          <div className="mt-2 pt-2 border-t border-accent/10">
                            <p className="text-xs font-medium text-accent mb-1">Key Takeaway:</p>
                            <p className="text-sm text-text-primary italic">
                              {summary.key_takeaway}
                            </p>
                          </div>
                        )}
                        {summary.model && (
                          <p className="text-xs text-text-secondary mt-2">
                            Generated by {summary.model}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Loading Summary */}
                    {isLoadingSummary && (
                      <div className="mb-3 p-3 bg-surface border border-border rounded">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                          Generating AI summary...
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span className="font-medium">
                          {article.content.provider.displayName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeAgo(article.content.pubDate)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {!summary && !isLoadingSummary && (
                          <button
                            onClick={() => handleSummarize(articleUrl)}
                            disabled={!ollamaStatus?.available}
                            title={
                              !ollamaStatus?.available
                                ? "Ollama is not running. See docs/OLLAMA_SETUP.md"
                                : "Generate AI summary"
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors font-medium ${
                              ollamaStatus?.available
                                ? "bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer"
                                : "bg-surface text-text-secondary cursor-not-allowed opacity-50"
                            }`}
                          >
                            <Sparkles size={14} />
                            AI Summary
                          </button>
                        )}
                        <button
                          onClick={() => handleReadArticle(articleUrl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border text-text-primary rounded hover:bg-surface hover:border-accent transition-colors cursor-pointer"
                        >
                          <BookOpen size={14} />
                          Read Here
                        </button>
                        <a
                          href={articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border text-text-primary rounded hover:bg-surface hover:border-accent transition-colors"
                        >
                          <ExternalLink size={14} />
                          Original
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Article Modal */}
      <ArticleModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        article={scrapedArticle}
        isLoading={isScrapingArticle}
        originalUrl={selectedArticleUrl}
      />

      {/* Disclaimer */}
      {!isLoading && !error && news && news.length > 0 && (
        <div className="text-xs text-text-secondary pt-4 border-t border-border">
          <p>
            News articles are sourced from various providers via Yahoo Finance. Article content and
            opinions are those of the respective publishers and do not represent investment advice.
          </p>
        </div>
      )}
    </div>
  );
};
