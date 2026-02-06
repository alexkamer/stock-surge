import React from "react";
import { formatPercent } from "../../lib/formatters";

interface IndustryData {
  name: string;
  weight: number;
  symbol: string;
  color: string;
  key: string;
  rank: number;
}

interface IndustryGridViewProps {
  industries: IndustryData[];
  onIndustryClick?: (industryKey: string) => void;
}

export const IndustryGridView: React.FC<IndustryGridViewProps> = ({
  industries,
  onIndustryClick,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {industries.map((industry) => {
        const Component = onIndustryClick ? "button" : "div";
        const clickProps = onIndustryClick
          ? {
              onClick: () => onIndustryClick(industry.key),
              className:
                "w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-background/50 transition-all cursor-pointer group",
            }
          : {
              className: "p-4 rounded-lg border border-border",
            };

        return (
          <Component key={industry.key} {...clickProps}>
            <div className="flex items-start justify-between gap-3">
              {/* Rank Badge */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background flex items-center justify-center">
                  <span className="text-xs font-bold text-text-secondary">
                    {industry.rank}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: industry.color }}
                    />
                    <p className="font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                      {industry.name}
                    </p>
                  </div>

                  {/* Percentage Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-secondary">Market Weight</span>
                      <span className="text-sm font-mono text-text-primary">
                        {formatPercent(industry.weight * 100)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${industry.weight * 100}%`,
                          backgroundColor: industry.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Symbol */}
                  <p className="text-xs text-text-secondary mt-2 font-mono">
                    {industry.symbol}
                  </p>
                </div>
              </div>
            </div>
          </Component>
        );
      })}
    </div>
  );
};
