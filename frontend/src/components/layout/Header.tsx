import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { stockApi } from "../../api/endpoints/stocks";
import { useDebounce } from "../../hooks/useDebounce";
import { useWatchlistStore } from "../../store/watchlistStore";
import { formatPercentNoSign } from "../../lib/formatters";
import { ChevronDown, ChevronRight, MessageSquare, Briefcase, Settings as SettingsIcon } from "lucide-react";

const POPULAR_SECTORS = [
  { key: "technology", name: "Technology" },
  { key: "healthcare", name: "Healthcare" },
  { key: "financial-services", name: "Financial Services" },
  { key: "consumer-cyclical", name: "Consumer Cyclical" },
  { key: "industrials", name: "Industrials" },
  { key: "communication-services", name: "Communication Services" },
  { key: "energy", name: "Energy" },
  { key: "basic-materials", name: "Basic Materials" },
  { key: "consumer-defensive", name: "Consumer Defensive" },
  { key: "real-estate", name: "Real Estate" },
  { key: "utilities", name: "Utilities" },
];

// Mapping of industry names to their API keys
const INDUSTRY_KEY_MAP: Record<string, string> = {
  "semiconductors": "semiconductors",
  "software - infrastructure": "software-infrastructure",
  "consumer electronics": "consumer-electronics",
  "software - application": "software-application",
  "semiconductor equipment & materials": "semiconductor-equipment-materials",
  "biotechnology": "biotechnology",
  "drug manufacturers - general": "drug-manufacturers-general",
  "medical devices": "medical-devices",
  "healthcare plans": "healthcare-plans",
  "diagnostics & research": "diagnostics-research",
  "banks - regional": "banks-regional",
  "capital markets": "capital-markets",
  "insurance - diversified": "insurance-diversified",
  "oil & gas e&p": "oil-gas-exploration",
  "oil & gas integrated": "oil-gas-integrated",
  "oil & gas equipment & services": "oil-gas-equipment-services",
};

export const Header: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSectorsOpen, setIsSectorsOpen] = useState(false);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const { addTicker, hasTicker } = useWatchlistStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sectorsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-search", debouncedQuery],
    queryFn: () => stockApi.getPrice(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    retry: false,
  });

  // Fetch sector data for hovered sector (for industries submenu)
  const { data: hoveredSectorData } = useQuery({
    queryKey: ["sector", hoveredSector],
    queryFn: () => stockApi.getSector(hoveredSector!),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: hoveredSector !== null && isSectorsOpen,
  });

  // Get industries from hovered sector data
  const hoveredIndustries = React.useMemo(() => {
    if (!hoveredSectorData?.industries) return [];

    return hoveredSectorData.industries
      .map((industry: any) => {
        const nameLower = industry.name.toLowerCase();
        const key = INDUSTRY_KEY_MAP[nameLower] || nameLower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        return {
          key,
          name: industry.name,
          weight: industry["market weight"],
        };
      })
      .sort((a: any, b: any) => b.weight - a.weight);
  }, [hoveredSectorData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (sectorsRef.current && !sectorsRef.current.contains(event.target as Node)) {
        setIsSectorsOpen(false);
        setHoveredSector(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddToWatchlist = () => {
    if (debouncedQuery) {
      addTicker(debouncedQuery);
      setQuery("");
      setIsOpen(false);
    }
  };

  const handleViewDetails = () => {
    navigate(`/stock/${debouncedQuery}`);
    setQuery("");
    setIsOpen(false);
  };

  const getPriceChange = () => {
    if (!data) return { value: 0, percent: 0 };
    const change = data.last_price - data.previous_close;
    const previousClose = data.previous_close > 0 ? data.previous_close : 1;
    const percent = (change / previousClose) * 100;
    return { value: change, percent };
  };

  const priceChange = data ? getPriceChange() : null;
  const isPositive = priceChange && priceChange.value >= 0;

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="cursor-pointer" onClick={() => navigate("/")}>
              <h1 className="text-2xl font-bold">Stock Surge</h1>
            </div>

            {/* Sectors Dropdown */}
            <div
              className="relative"
              ref={sectorsRef}
              onMouseEnter={() => setIsSectorsOpen(true)}
              onMouseLeave={() => {
                setIsSectorsOpen(false);
                setHoveredSector(null);
              }}
            >
              <button
                onClick={() => navigate("/sectors")}
                className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2"
              >
                Sectors
                <ChevronDown className="w-3 h-3" />
              </button>

              {isSectorsOpen && (
                <div className="absolute top-full left-0 w-56 z-50">
                  <div className="bg-surface border border-border rounded-lg shadow-lg py-1">
                    {POPULAR_SECTORS.map((sector) => (
                      <div
                        key={sector.key}
                        className="relative"
                        onMouseEnter={() => setHoveredSector(sector.key)}
                        onMouseLeave={() => setHoveredSector(null)}
                      >
                        <button
                          onClick={() => {
                            navigate(`/sectors?sector=${sector.key}`);
                            setIsSectorsOpen(false);
                            setHoveredSector(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-background transition-colors flex items-center justify-between"
                        >
                          {sector.name}
                          <ChevronRight className="w-3 h-3 text-text-secondary" />
                        </button>

                        {/* Industries Submenu */}
                        {hoveredSector === sector.key && hoveredIndustries.length > 0 && (
                          <div className="absolute left-full top-0 w-72 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                            <div className="p-2 border-b border-border bg-background/50">
                              <p className="text-xs font-semibold text-text-secondary uppercase">
                                {sector.name} Industries
                              </p>
                            </div>
                            {hoveredIndustries.map((industry: any) => (
                              <button
                                key={industry.key}
                                onClick={() => {
                                  navigate(`/sectors?industry=${industry.key}`);
                                  setIsSectorsOpen(false);
                                  setHoveredSector(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-background transition-colors border-b border-border/30 last:border-b-0"
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <span className="truncate">{industry.name}</span>
                                  <span className="text-xs text-text-secondary flex-shrink-0">
                                    {formatPercentNoSign(industry.weight * 100)}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Link */}
            <button
              onClick={() => navigate("/chat")}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>

            {/* Portfolio Link */}
            <button
              onClick={() => navigate("/portfolio")}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2"
            >
              <Briefcase className="w-4 h-4" />
              Portfolio
            </button>

            {/* Settings Link */}
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
          </div>

          <div className="relative w-80" ref={dropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query) {
                    navigate(`/stock/${query}`);
                    setQuery("");
                    setIsOpen(false);
                  }
                }}
                placeholder="Search stocks..."
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-positive transition text-sm"
              />
              {isLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-positive border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {isOpen && (query || data) && (
              <div className="absolute top-full mt-2 w-96 right-0 bg-surface border border-border rounded-md shadow-lg max-h-96 overflow-y-auto">
                {error && !isLoading && (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    <p>Keep typing...</p>
                  </div>
                )}

                {data && (
                  <div
                    className="p-4 hover:bg-background cursor-pointer transition"
                    onClick={handleViewDetails}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{debouncedQuery}</h3>
                          <span className="text-xs text-text-secondary px-2 py-0.5 bg-background rounded">
                            {data.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{data.currency}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-mono font-bold">
                          ${data.last_price.toFixed(2)}
                        </p>
                        {priceChange && (
                          <p className={`text-xs font-mono ${isPositive ? 'text-positive' : 'text-negative'}`}>
                            {isPositive ? '+' : ''}{priceChange.value.toFixed(2)} ({isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-text-secondary">Open</p>
                        <p className="font-mono text-sm font-semibold">${data.open.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">High</p>
                        <p className="font-mono text-sm font-semibold text-positive">${data.day_high.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Low</p>
                        <p className="font-mono text-sm font-semibold text-negative">${data.day_low.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Volume</p>
                        <p className="font-mono text-sm font-semibold">{(data.volume / 1000000).toFixed(1)}M</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWatchlist();
                        }}
                        disabled={hasTicker(debouncedQuery)}
                        className="py-1.5 px-3 text-sm bg-surface border border-positive text-positive hover:bg-positive hover:text-background font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {hasTicker(debouncedQuery) ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails();
                        }}
                        className="py-1.5 px-3 text-sm bg-positive hover:bg-positive/90 text-background font-semibold rounded-md transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )}

                {!query && !data && (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    <p>Start typing a stock ticker</p>
                    <p className="text-xs mt-1">Try: AAPL, MSFT, GOOGL</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
