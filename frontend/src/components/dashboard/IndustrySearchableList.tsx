import React, { useState } from "react";
import { Search } from "lucide-react";
import { formatPercent } from "../../lib/formatters";

interface IndustryData {
  name: string;
  weight: number;
  symbol: string;
  color: string;
  key: string;
}

interface IndustrySearchableListProps {
  industries: IndustryData[];
  onIndustryClick: (industryKey: string) => void;
}

export const IndustrySearchableList: React.FC<IndustrySearchableListProps> = ({
  industries,
  onIndustryClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter industries based on search query
  const filteredIndustries = industries.filter((industry) =>
    industry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search industries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 pl-10 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-text-secondary hover:text-text-primary text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-text-secondary">
        {filteredIndustries.length === industries.length
          ? `All ${industries.length} industries`
          : `${filteredIndustries.length} of ${industries.length} industries`}
      </p>

      {/* Scrollable List */}
      <div className="max-h-[400px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {filteredIndustries.length > 0 ? (
          filteredIndustries.map((industry) => (
            <button
              key={industry.key}
              onClick={() => onIndustryClick(industry.key)}
              className="w-full flex justify-between items-center p-2.5 hover:bg-background rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: industry.color }}
                />
                <span className="text-sm text-text-primary group-hover:text-primary transition-colors truncate">
                  {industry.name}
                </span>
              </div>
              <span className="text-sm font-mono text-text-secondary group-hover:text-text-primary transition-colors ml-2">
                {formatPercent(industry.weight * 100)}
              </span>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm mb-2">No industries match your search</p>
            <p className="text-text-secondary text-xs">
              Try a different search term or{" "}
              <button
                onClick={() => setSearchQuery("")}
                className="text-primary hover:underline"
              >
                clear the search
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
