import React from 'react';

interface QuickStatsProps {
  dayLow: number;
  dayHigh: number;
  fiftyTwoWeekChange: number;
  avgVolume: number;
  nextEarningsDate?: string;
  sticky?: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  dayLow,
  dayHigh,
  fiftyTwoWeekChange,
  avgVolume,
  nextEarningsDate,
  sticky = false,
}) => {
  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const containerClass = sticky
    ? 'sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'
    : '';

  return (
    <div className={containerClass}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {/* Day Range */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">Day Range</div>
          <div className="text-sm font-medium">
            ${dayLow.toFixed(2)} - ${dayHigh.toFixed(2)}
          </div>
        </div>

        {/* 52W Change */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">52W Change</div>
          <div
            className={`text-sm font-medium ${
              fiftyTwoWeekChange >= 0 ? 'text-positive' : 'text-negative'
            }`}
          >
            {fiftyTwoWeekChange >= 0 ? '+' : ''}
            {fiftyTwoWeekChange.toFixed(2)}%
          </div>
        </div>

        {/* Avg Volume */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">Avg Volume</div>
          <div className="text-sm font-medium">{formatVolume(avgVolume)}</div>
        </div>

        {/* Next Earnings */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">Next Earnings</div>
          <div className="text-sm font-medium">{formatDate(nextEarningsDate)}</div>
        </div>
      </div>
    </div>
  );
};
