import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { stockApi } from "../../api/endpoints/stocks";
import { formatDate } from "../../lib/formatters";

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
  const { data: news, isLoading, error } = useQuery({
    queryKey: ["news", ticker],
    queryFn: async () => {
      const data = await stockApi.getNews(ticker);
      return data as NewsArticle[];
    },
    enabled: !!ticker,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

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

            return (
              <a
                key={article.id}
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="card hover:border-accent transition-all duration-200 block group"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {thumbnailUrl && (
                    <div className="flex-shrink-0 w-32 h-24 rounded overflow-hidden bg-surface">
                      <img
                        src={thumbnailUrl}
                        alt={article.content.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {article.content.title}
                    </h4>

                    {article.content.summary && (
                      <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                        {article.content.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span className="font-medium">
                        {article.content.provider.displayName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(article.content.pubDate)}
                      </span>
                      <span className="flex items-center gap-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink size={12} />
                        Read more
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

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
