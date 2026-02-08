import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../../api/endpoints/stocks';

interface DividendCardProps {
  ticker: string;
  currentYield?: number;
}

export const DividendCard: React.FC<DividendCardProps> = ({ ticker, currentYield }) => {
  const { data: dividendsData, isLoading } = useQuery({
    queryKey: ['dividends', ticker],
    queryFn: () => stockApi.getDividends(ticker),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: (currentYield ?? 0) > 0, // Only fetch if stock pays dividends
  });

  // Don't render if no dividend yield or loading
  if (!currentYield || currentYield === 0 || isLoading) {
    return null;
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const lastDividend = dividendsData?.last_payment;
  const frequency = dividendsData?.frequency || 'Quarterly';

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Dividend Information</h3>
        <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">
          Dividend Paying
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Current Yield */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">Current Yield</div>
          <div className="text-2xl font-bold text-positive">
            {currentYield.toFixed(2)}%
          </div>
        </div>

        {/* Last Payment */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">Last Payment</div>
          {lastDividend ? (
            <>
              <div className="text-xl font-semibold">
                ${lastDividend.amount.toFixed(4)}
              </div>
              <div className="text-xs text-muted">
                {formatDate(lastDividend.date)}
              </div>
            </>
          ) : (
            <div className="text-xl font-semibold text-muted">N/A</div>
          )}
        </div>

        {/* Frequency */}
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase tracking-wider">Frequency</div>
          <div className="text-xl font-semibold">
            {frequency}
          </div>
        </div>
      </div>

      {/* Dividend History Summary */}
      {dividendsData?.dividends && dividendsData.dividends.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted mb-2">Recent Dividends</div>
          <div className="flex gap-4 overflow-x-auto">
            {dividendsData.dividends.slice(0, 4).map((div: { amount: number; date: string }, idx: number) => (
              <div key={idx} className="flex-shrink-0 text-xs">
                <div className="font-medium">${div.amount.toFixed(4)}</div>
                <div className="text-muted">{formatDate(div.date)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
