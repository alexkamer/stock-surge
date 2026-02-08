import React from 'react';

interface RangeVisualizerProps {
  high: number;
  low: number;
  current: number;
  previousClose: number;
}

export const RangeVisualizer: React.FC<RangeVisualizerProps> = ({
  high,
  low,
  current,
  previousClose,
}) => {
  // Calculate positions as percentages
  const range = high - low;
  const currentPercent = ((current - low) / range) * 100;
  const previousPercent = ((previousClose - low) / range) * 100;

  const changeFromLow = ((current - low) / low) * 100;
  const changeFromHigh = ((current - high) / high) * 100;

  return (
    <div className="space-y-3">
      {/* Range Bar */}
      <div className="relative h-8 bg-surface rounded-lg overflow-hidden">
        {/* Gradient zones */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-red-500/10" />
          <div className="flex-1 bg-blue-500/10" />
          <div className="flex-1 bg-green-500/10" />
        </div>

        {/* Previous close marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
          style={{ left: `${previousPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
          </div>
        </div>

        {/* Current price marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary z-20"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <div className="w-3 h-3 bg-primary rounded-full border-2 border-background shadow-lg" />
          </div>
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap">
            ${current.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between items-center text-xs text-muted">
        <div className="flex flex-col items-start">
          <span className="font-medium">${low.toFixed(2)}</span>
          <span className="text-[10px]">52W Low</span>
          <span className={`text-[10px] font-medium ${changeFromLow >= 0 ? 'text-positive' : 'text-negative'}`}>
            {changeFromLow >= 0 ? '+' : ''}{changeFromLow.toFixed(1)}%
          </span>
        </div>

        <div className="text-center">
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span>Prev Close: ${previousClose.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="font-medium">${high.toFixed(2)}</span>
          <span className="text-[10px]">52W High</span>
          <span className={`text-[10px] font-medium ${changeFromHigh >= 0 ? 'text-positive' : 'text-negative'}`}>
            {changeFromHigh >= 0 ? '+' : ''}{changeFromHigh.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
