import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { aiApi, type ArticleSummary, type KeyPoints } from "../../api/endpoints/ai";
import { FileText, ExternalLink, ChevronDown, ChevronUp, Lightbulb, List } from "lucide-react";

interface ArticleSummaryCardProps {
  url: string;
}

const SENTIMENT_CONFIG = {
  bullish: {
    label: "Bullish",
    color: "text-green-400",
    bg: "bg-green-400/10",
    icon: "🟢",
  },
  bearish: {
    label: "Bearish",
    color: "text-red-400",
    bg: "bg-red-400/10",
    icon: "🔴",
  },
  neutral: {
    label: "Neutral",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    icon: "⚪",
  },
};

export function ArticleSummaryCard({ url }: ArticleSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showKeyPoints, setShowKeyPoints] = useState(false);

  // Fetch article summary
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery<ArticleSummary>({
    queryKey: ["article", "summary", url],
    queryFn: () => aiApi.summarizeArticle(url),
    staleTime: Infinity, // Cache indefinitely
    retry: 1,
  });

  // Fetch key points (only when requested)
  const {
    data: keyPoints,
    isLoading: keyPointsLoading,
    error: keyPointsError,
  } = useQuery<KeyPoints>({
    queryKey: ["article", "keypoints", url],
    queryFn: () => aiApi.extractKeyPoints(url),
    staleTime: Infinity,
    retry: 1,
    enabled: showKeyPoints,
  });

  if (summaryLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse my-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-3 bg-slate-700 rounded w-full"></div>
            <div className="h-3 bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (summaryError || !summary || !summary.success) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 my-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-slate-400">
              Unable to summarize article. The content may not be accessible or the URL format is not supported.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-2"
            >
              Open article <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const sentiment = (summary.sentiment || "neutral") as "bullish" | "bearish" | "neutral";
  const sentimentConfig = SENTIMENT_CONFIG[sentiment];
  const readingTime = Math.ceil(summary.original_word_count / 200); // Average reading speed

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden my-4 max-w-2xl">
      {/* Header */}
      <div className="p-4 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-snug mb-2">{summary.title}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${sentimentConfig.bg} ${sentimentConfig.color}`}
              >
                {sentimentConfig.icon} {sentimentConfig.label}
              </span>
              <span className="text-xs text-slate-400">
                {summary.word_count} words • {readingTime} min read
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {summary.summary}
        </p>

        {/* Key Takeaway */}
        {summary.key_takeaway && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-400 mb-1">Key Takeaway</p>
                <p className="text-sm text-slate-300">{summary.key_takeaway}</p>
              </div>
            </div>
          </div>
        )}

        {/* Key Points Section */}
        {showKeyPoints && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            {keyPointsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                Extracting key points...
              </div>
            ) : keyPointsError || !keyPoints?.success ? (
              <p className="text-sm text-slate-400">Unable to extract key points.</p>
            ) : (
              <div>
                <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <List size={16} />
                  Key Points
                </h5>
                <ol className="space-y-2">
                  {keyPoints.key_points.map((point: string, index: number) => (
                    <li key={index} className="text-sm text-slate-300 flex gap-2">
                      <span className="font-semibold text-blue-400 flex-shrink-0">
                        {index + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-slate-800/30 border-t border-slate-700 flex flex-wrap gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
        >
          Read Full Article
          <ExternalLink size={12} />
        </a>
        <button
          onClick={() => setShowKeyPoints(!showKeyPoints)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors"
        >
          <List size={12} />
          {showKeyPoints ? "Hide" : "Show"} Key Points
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition-colors ml-auto"
        >
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {isExpanded ? "Less" : "More"} Info
        </button>
      </div>

      {/* Expanded Info */}
      {isExpanded && (
        <div className="p-4 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-400 space-y-1">
          <p>
            <span className="font-medium">Original length:</span> {summary.original_word_count} words
          </p>
          <p>
            <span className="font-medium">Summary length:</span> {summary.word_count} words
          </p>
          <p>
            <span className="font-medium">Compression:</span>{" "}
            {((1 - summary.word_count / summary.original_word_count) * 100).toFixed(0)}%
          </p>
          <p>
            <span className="font-medium">Model:</span> {summary.model}
          </p>
          <p className="break-all">
            <span className="font-medium">URL:</span> {url}
          </p>
        </div>
      )}
    </div>
  );
}
