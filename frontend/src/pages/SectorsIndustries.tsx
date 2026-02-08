import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stockApi } from "../api/endpoints/stocks";
import { formatPercent, formatPercentNoSign, formatCompactCurrency } from "../lib/formatters";
import { generateIndustryColors } from "../lib/chartColors";
import { IndustryPieChart } from "../components/dashboard/IndustryPieChart";
import { IndustrySearchableList } from "../components/dashboard/IndustrySearchableList";
import { IndustryGridView } from "../components/dashboard/IndustryGridView";
import { CompaniesTreemap } from "../components/dashboard/CompaniesTreemap";
import { Header } from "../components/layout/Header";
import { LayoutGrid, PieChart as PieChartIcon, Table as TableIcon, Grid3x3, Info, TrendingUp, FileText, ArrowUpRight, ArrowDownRight, Building2, ChevronDown, ChevronUp, LineChart as LineChartIcon, Loader2 } from "lucide-react";
import { IndustryPerformanceChart } from "../components/charts/IndustryPerformanceChart";

// Popular sectors list (for potential future use)
// const POPULAR_SECTORS = [
//   { key: "technology", name: "Technology" },
//   { key: "healthcare", name: "Healthcare" },
//   { key: "financial-services", name: "Financial Services" },
//   { key: "consumer-cyclical", name: "Consumer Cyclical" },
//   { key: "industrials", name: "Industrials" },
//   { key: "communication-services", name: "Communication Services" },
//   { key: "energy", name: "Energy" },
//   { key: "basic-materials", name: "Basic Materials" },
//   { key: "consumer-defensive", name: "Consumer Defensive" },
//   { key: "real-estate", name: "Real Estate" },
//   { key: "utilities", name: "Utilities" },
// ];

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

export const SectorsIndustries: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"none" | "sector" | "industry">("none");
  const [industryViewType, setIndustryViewType] = useState<"grid" | "pie">("pie");
  const [companiesViewType, setCompaniesViewType] = useState<"table" | "treemap">("table");
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [showAllPerforming, setShowAllPerforming] = useState(false);
  const [showAllGrowth, setShowAllGrowth] = useState(false);
  const [showAllIndustryCompanies, setShowAllIndustryCompanies] = useState(false);
  const [industryCompanyRatingFilter, setIndustryCompanyRatingFilter] = useState<string>("all");
  const [companySortBy, setCompanySortBy] = useState<"marketWeight" | "rating">("marketWeight");
  const [companySortOrder, setCompanySortOrder] = useState<"asc" | "desc">("desc");
  const [performancePeriod, setPerformancePeriod] = useState<string>("1mo");
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [industryCompaniesViewType, setIndustryCompaniesViewType] = useState<"table" | "treemap">("table");

  // Initialize from URL parameters
  useEffect(() => {
    const sectorParam = searchParams.get("sector");
    const industryParam = searchParams.get("industry");

    if (industryParam) {
      setSelectedIndustry(industryParam);
      setViewMode("industry");
    } else if (sectorParam) {
      setSelectedSector(sectorParam);
      setViewMode("sector");
    }
  }, [searchParams]);

  // Fetch sector data for selected sector
  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ["sector", selectedSector],
    queryFn: () => stockApi.getSector(selectedSector!),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: viewMode === "sector" && selectedSector !== null,
  });

  // Fetch industry data
  const { data: industryData, isLoading: industryLoading } = useQuery({
    queryKey: ["industry", selectedIndustry],
    queryFn: () => stockApi.getIndustry(selectedIndustry!),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: viewMode === "industry" && selectedIndustry !== null,
  });

  // Get tickers for price and performance fetching
  const industryTickers = React.useMemo(() => {
    if (!industryData?.top_companies) return [];
    return industryData.top_companies
      .map((company: any) => company.symbol)
      .filter(Boolean);
  }, [industryData]);

  const top5Tickers = React.useMemo(() => {
    return industryTickers.slice(0, 5);
  }, [industryTickers]);

  // Fetch real-time prices
  const { data: pricesData, isLoading: pricesLoading } = useQuery({
    queryKey: ["industryPrices", selectedIndustry, industryTickers],
    queryFn: () => stockApi.getIndustryPrices(selectedIndustry!, industryTickers),
    staleTime: 30 * 1000, // 30 seconds
    enabled: viewMode === "industry" && selectedIndustry !== null && industryTickers.length > 0,
  });

  // Fetch performance data for charting
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ["industryPerformance", selectedIndustry, top5Tickers, performancePeriod],
    queryFn: () => stockApi.getIndustryPerformance(selectedIndustry!, top5Tickers, performancePeriod),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: viewMode === "industry" && selectedIndustry !== null && top5Tickers.length > 0,
  });

  // Create price lookup map
  const priceMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (pricesData?.prices) {
      pricesData.prices.forEach((priceData: any) => {
        map.set(priceData.ticker, priceData);
      });
    }
    return map;
  }, [pricesData]);

  // Generate colors based on sector and industry count
  const industryColors = React.useMemo(() => {
    if (!sectorData?.industries) return [];
    return generateIndustryColors(sectorData.industries.length, selectedSector || "");
  }, [sectorData, selectedSector]);

  // Get industries from sector data with mapped keys, colors, and metadata
  const availableIndustries = React.useMemo(() => {
    if (!sectorData?.industries) return [];

    return sectorData.industries
      .map((industry: any, idx: number) => {
        const nameLower = industry.name.toLowerCase();
        const key = INDUSTRY_KEY_MAP[nameLower] || nameLower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        return {
          key,
          name: industry.name,
          weight: industry["market weight"],
          symbol: industry.symbol,
          color: industryColors[idx] || "#888888",
        };
      })
      .sort((a: any, b: any) => b.weight - a.weight)
      .map((industry: any, idx: number) => ({
        ...industry,
        rank: idx + 1,
      }));
  }, [sectorData, industryColors]);

  // Handler for sector selection (currently unused but kept for potential navigation features)
  // const handleSectorClick = (sectorKey: string) => {
  //   setSelectedSector(sectorKey);
  //   setSelectedIndustry(null);
  //   setViewMode("sector");
  //   setShowAllCompanies(false);
  //   setRatingFilter("all");
  //   navigate(`/sectors?sector=${sectorKey}`, { replace: true });
  // };

  const handleIndustryClick = (industryKey: string) => {
    setSelectedIndustry(industryKey);
    setViewMode("industry");
    navigate(`/sectors?industry=${industryKey}`, { replace: true });
  };

  // Helper function to get ticker from company
  const getCompanyTicker = (company: any): string | null => {
    if (company.symbol) return company.symbol;
    if (company.ticker) return company.ticker;

    const tickerMap: Record<string, string> = {
      "NVIDIA Corporation": "NVDA",
      "Apple Inc.": "AAPL",
      "Microsoft Corporation": "MSFT",
      "Broadcom Inc.": "AVGO",
      "Micron Technology, Inc.": "MU",
      "Oracle Corporation": "ORCL",
      "Cisco Systems, Inc.": "CSCO",
      "Advanced Micro Devices, Inc.": "AMD",
      "Palantir Technologies Inc.": "PLTR",
      "International Business Machines Corporation": "IBM",
      "Lam Research Corporation": "LRCX",
      "Applied Materials, Inc.": "AMAT",
      "Intel Corporation": "INTC",
      "Texas Instruments Incorporated": "TXN",
      "Salesforce, Inc.": "CRM",
      "KLA Corporation": "KLAC",
      "Arista Networks, Inc.": "ANET",
      "Analog Devices, Inc.": "ADI",
      "Uber Technologies, Inc.": "UBER",
      "Amphenol Corporation": "APH",
    };

    return tickerMap[company.name] || null;
  };

  const handleCompanyClick = (company: any) => {
    const ticker = getCompanyTicker(company);
    if (ticker) {
      navigate(`/stock/${ticker}`);
    }
  };

  // Get unique ratings from companies
  const availableRatings = React.useMemo(() => {
    if (!sectorData?.top_companies) return [];
    const ratings = new Set<string>();
    sectorData.top_companies.forEach((company: any) => {
      if (company.rating) {
        ratings.add(company.rating);
      }
    });
    return Array.from(ratings).sort();
  }, [sectorData]);

  // Filter companies by rating
  const filteredCompanies = React.useMemo(() => {
    if (!sectorData?.top_companies) return [];
    if (ratingFilter === "all") return sectorData.top_companies;
    return sectorData.top_companies.filter((company: any) => company.rating === ratingFilter);
  }, [sectorData, ratingFilter]);

  const renderSectorView = () => {
    if (sectorLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface rounded"></div>
          <div className="h-48 bg-surface rounded"></div>
        </div>
      );
    }

    if (!sectorData) {
      return <p className="text-text-secondary">Unable to load sector data</p>;
    }

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-3">{sectorData.name} Sector</h3>
          <p className="text-sm text-text-secondary mb-4">{sectorData.overview.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Companies</p>
              <p className="text-xl font-bold truncate">{sectorData.overview.companies_count.toLocaleString()}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Market Cap</p>
              <p className="text-xl font-bold truncate">{formatCompactCurrency(sectorData.overview.market_cap)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Market Weight</p>
              <p className="text-xl font-bold truncate">{formatPercentNoSign(sectorData.overview.market_weight * 100)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Employees</p>
              <p className="text-xl font-bold truncate">{sectorData.overview.employee_count.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Top Companies */}
        <div className="card p-4">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-lg font-semibold">Top Companies</h3>

              {/* View Toggle Buttons */}
              <div className="flex gap-1 bg-background rounded-lg p-1">
                <button
                  onClick={() => setCompaniesViewType("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    companiesViewType === "table"
                      ? "bg-surface text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  Table
                </button>
                <button
                  onClick={() => setCompaniesViewType("treemap")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    companiesViewType === "treemap"
                      ? "bg-surface text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Treemap
                </button>
              </div>
            </div>

            {/* Filter and Count - only show for table view */}
            {companiesViewType === "table" && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  {availableRatings.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-secondary">Filter by rating:</label>
                      <select
                        value={ratingFilter}
                        onChange={(e) => {
                          setRatingFilter(e.target.value);
                          setShowAllCompanies(false);
                        }}
                        className="appearance-none bg-background border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      >
                        <option value="all">All Ratings</option>
                        {availableRatings.map((rating) => (
                          <option key={rating} value={rating}>
                            {rating}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <span className="text-xs text-text-secondary">
                  {showAllCompanies ? filteredCompanies.length : Math.min(10, filteredCompanies.length)} of {filteredCompanies.length}
                </span>
              </div>
            )}
          </div>

          {/* Table View */}
          {companiesViewType === "table" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-2">
                        Rank
                      </th>
                      <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-2">
                        Company
                      </th>
                      <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-2">
                        Rating
                      </th>
                      <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-2">
                        Market Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllCompanies ? filteredCompanies : filteredCompanies.slice(0, 10)).map((company: any, idx: number) => (
                      <tr
                        key={idx}
                        onClick={() => handleCompanyClick(company)}
                        className="border-b border-border/50 hover:bg-background transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-2">
                          <span className="text-sm font-bold text-text-secondary">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm font-medium">{company.name}</span>
                        </td>
                        <td className="py-3 px-2">
                          {company.rating ? (
                            <span className="inline-block text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                              {company.rating}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-sm font-mono text-text-primary">
                            {formatPercentNoSign((company["market weight"] || 0) * 100)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCompanies.length === 0 && (
                <div className="text-center py-8 text-text-secondary text-sm">
                  No companies found with the selected rating.
                </div>
              )}

              {filteredCompanies.length > 10 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllCompanies(!showAllCompanies)}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {showAllCompanies ? "Show Less" : `Show All ${filteredCompanies.length} Companies`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Treemap View */}
          {companiesViewType === "treemap" && (
            <CompaniesTreemap
              companies={(ratingFilter === "all" ? sectorData.top_companies : filteredCompanies) as any}
              onCompanyClick={handleCompanyClick}
            />
          )}
        </div>

        {/* Industry Breakdown with Toggle */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold">
              Industry Breakdown ({sectorData.overview.industries_count})
            </h3>

            {/* View Toggle Buttons */}
            <div className="flex gap-1 bg-background rounded-lg p-1">
              <button
                onClick={() => setIndustryViewType("pie")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  industryViewType === "pie"
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <PieChartIcon className="w-4 h-4" />
                Pie Chart
              </button>
              <button
                onClick={() => setIndustryViewType("grid")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  industryViewType === "grid"
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
            </div>
          </div>

          {/* Pie Chart View */}
          {industryViewType === "pie" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Pie Chart (60%) */}
              <div className="lg:col-span-3">
                <IndustryPieChart
                  industries={availableIndustries}
                  onIndustryClick={handleIndustryClick}
                />
              </div>

              {/* Right: Searchable List (40%) */}
              <div className="lg:col-span-2">
                <IndustrySearchableList
                  industries={availableIndustries}
                  onIndustryClick={handleIndustryClick}
                />
              </div>
            </div>
          )}

          {/* Grid View */}
          {industryViewType === "grid" && (
            <IndustryGridView
              industries={availableIndustries}
              onIndustryClick={handleIndustryClick}
            />
          )}

          <p className="text-xs text-text-secondary mt-4 pt-4 border-t border-border">
            Click any industry to view detailed analytics
          </p>
        </div>

        {/* Top ETFs & Mutual Funds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3">Top ETFs</h3>
            <div className="space-y-2">
              {Object.entries(sectorData.top_etfs).slice(0, 5).map(([symbol, name]) => (
                <div key={symbol} className="flex justify-between p-2 hover:bg-background rounded transition-colors">
                  <span className="font-mono font-medium">{symbol}</span>
                  <span className="text-sm text-text-secondary">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3">Top Mutual Funds</h3>
            <div className="space-y-2">
              {Object.entries(sectorData.top_mutual_funds).slice(0, 5).map(([symbol, name]) => (
                name && (
                  <div key={symbol} className="flex justify-between p-2 hover:bg-background rounded transition-colors">
                    <span className="font-mono font-medium">{symbol}</span>
                    <span className="text-sm text-text-secondary">{name}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper functions for industry view
  const getRatingColor = (rating: string): string => {
    const ratingLower = rating?.toLowerCase() || "";
    if (ratingLower === "buy" || ratingLower === "bullish") return "text-success bg-success/10 border-success/30";
    if (ratingLower === "hold" || ratingLower === "neutral") return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
    if (ratingLower === "sell" || ratingLower === "bearish") return "text-danger bg-danger/10 border-danger/30";
    return "text-text-secondary bg-surface border-border";
  };

  const formatReportDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Get sorted and filtered companies for industry view
  const sortedIndustryCompanies = React.useMemo(() => {
    if (!industryData?.top_companies) return [];

    let filtered = industryData.top_companies;

    // Filter by rating
    if (industryCompanyRatingFilter !== "all") {
      filtered = filtered.filter((company: any) => company.rating === industryCompanyRatingFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a: any, b: any) => {
      if (companySortBy === "marketWeight") {
        const aWeight = a["market weight"] || 0;
        const bWeight = b["market weight"] || 0;
        return companySortOrder === "desc" ? bWeight - aWeight : aWeight - bWeight;
      } else {
        // Sort by rating (Buy > Hold > Sell)
        const ratingOrder: Record<string, number> = { "Buy": 3, "Hold": 2, "Sell": 1 };
        const aOrder = ratingOrder[a.rating] || 0;
        const bOrder = ratingOrder[b.rating] || 0;
        return companySortOrder === "desc" ? bOrder - aOrder : aOrder - bOrder;
      }
    });

    return sorted;
  }, [industryData, industryCompanyRatingFilter, companySortBy, companySortOrder]);

  // Get available ratings in industry companies
  const industryCompanyRatings = React.useMemo(() => {
    if (!industryData?.top_companies) return [];
    const ratings = new Set<string>();
    industryData.top_companies.forEach((company: any) => {
      if (company.rating) {
        ratings.add(company.rating);
      }
    });
    return Array.from(ratings).sort();
  }, [industryData]);

  const renderIndustryView = () => {
    if (industryLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface rounded"></div>
        </div>
      );
    }

    if (!industryData) {
      return (
        <div className="text-center py-8">
          <p className="text-text-secondary mb-4">
            Industry data not available. Try selecting a different industry.
          </p>
          <button
            onClick={() => setViewMode("sector")}
            className="btn btn-primary"
          >
            Back to Sector View
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className="card p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-semibold">{industryData.name}</h3>
              <p className="text-sm text-text-secondary">
                Sector: {industryData.sector_name}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedSector(industryData.sector_key);
                setViewMode("sector");
              }}
              className="text-sm text-primary hover:underline"
            >
              View Sector
            </button>
          </div>

          <p className="text-sm text-text-secondary mb-4">{industryData.overview.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Companies</p>
              <p className="text-xl font-bold truncate">{industryData.overview.companies_count.toLocaleString()}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Market Cap</p>
              <p className="text-xl font-bold truncate">{formatCompactCurrency(industryData.overview.market_cap)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Market Weight</p>
              <p className="text-xl font-bold truncate">{formatPercentNoSign(industryData.overview.market_weight * 100)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Employees</p>
              <p className="text-xl font-bold truncate">{industryData.overview.employee_count.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Research Reports Section */}
        {industryData.research_reports && industryData.research_reports.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Analyst Research Reports</h3>
              <span className="text-xs text-text-secondary ml-auto">
                {industryData.research_reports.length} reports
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {industryData.research_reports.slice(0, 4).map((report: any) => {
                const isPriceIncreased = report.targetPriceStatus?.toLowerCase() === "increased";
                const isPriceDecreased = report.targetPriceStatus?.toLowerCase() === "decreased";
                const reportDate = report.reportDate ? formatReportDate(report.reportDate) : null;

                return (
                  <div
                    key={report.id}
                    onClick={() => {
                      // Use the enriched ticker field from the backend
                      if (report.ticker) {
                        navigate(`/stock/${report.ticker}`);
                      }
                    }}
                    className={`group relative p-4 bg-surface hover:bg-background rounded-lg border border-border/50 hover:border-primary/40 transition-all ${report.ticker ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1">
                          {report.headHtml?.replace(/<[^>]*>/g, "") || "Analyst Report"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span>{report.provider}</span>
                          {reportDate && (
                            <>
                              <span>•</span>
                              <span>{reportDate}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Investment Rating Badge */}
                      {report.investmentRating && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${getRatingColor(report.investmentRating)}`}>
                          {report.investmentRating}
                        </span>
                      )}
                    </div>

                    {/* Target Price Info */}
                    {report.targetPrice && (
                      <div className="flex items-center gap-4 p-2.5 bg-background/50 rounded-md border border-border/30">
                        <div className="flex items-center gap-1.5">
                          {isPriceIncreased && <ArrowUpRight className="w-4 h-4 text-success" />}
                          {isPriceDecreased && <ArrowDownRight className="w-4 h-4 text-danger" />}
                          {!isPriceIncreased && !isPriceDecreased && <TrendingUp className="w-4 h-4 text-text-secondary" />}
                          <span className="text-xs text-text-secondary">Target</span>
                        </div>
                        <span className={`text-lg font-bold font-mono ${isPriceIncreased ? 'text-success' : isPriceDecreased ? 'text-danger' : 'text-text-primary'}`}>
                          ${report.targetPrice.toFixed(2)}
                        </span>
                        {report.targetPriceStatus && (
                          <span className={`text-xs font-medium ml-auto ${isPriceIncreased ? 'text-success' : isPriceDecreased ? 'text-danger' : 'text-text-secondary'}`}>
                            {report.targetPriceStatus}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Report Title/Summary */}
                    {report.reportTitle && (
                      <div className="mt-3">
                        <p className={`text-xs text-text-secondary leading-relaxed ${expandedReports.has(report.id) ? '' : 'line-clamp-2'}`}>
                          {report.reportTitle}
                        </p>
                        {report.reportTitle.length > 150 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedReports(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(report.id)) {
                                  newSet.delete(report.id);
                                } else {
                                  newSet.add(report.id);
                                }
                                return newSet;
                              });
                            }}
                            className="text-xs text-primary hover:underline mt-1 font-medium"
                          >
                            {expandedReports.has(report.id) ? 'Show Less' : 'See More'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Hover indicator */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Industry Performance Chart */}
        {top5Tickers.length > 0 && (
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Performance Comparison</h3>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-1 bg-background rounded-lg p-1 sm:ml-auto">
                {[
                  { value: "1mo", label: "1M" },
                  { value: "3mo", label: "3M" },
                  { value: "6mo", label: "6M" },
                  { value: "1y", label: "1Y" },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setPerformancePeriod(period.value)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      performancePeriod === period.value
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {performanceLoading ? (
              <div className="flex items-center justify-center h-80 bg-surface/30 rounded-lg border border-border/30">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-text-secondary">Loading performance data...</p>
                </div>
              </div>
            ) : performanceData?.performance && performanceData.performance.length > 0 ? (
              <div className="h-80 bg-surface/30 rounded-lg border border-border/30 p-4">
                <IndustryPerformanceChart
                  performance={performanceData.performance}
                  period={performancePeriod}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 bg-surface/30 rounded-lg border border-border/30">
                <p className="text-sm text-text-secondary">No performance data available</p>
              </div>
            )}

            <p className="text-xs text-text-secondary mt-3 pt-3 border-t border-border/50">
              Showing normalized returns for top 5 companies. All values are relative to the start of the period.
            </p>
          </div>
        )}

        {/* All Companies Table */}
        {industryData.top_companies && industryData.top_companies.length > 0 && (
          <div className="card p-5">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Top Companies by Market Weight</h3>
                </div>

                {/* View Toggle Buttons */}
                <div className="flex gap-1 bg-background rounded-lg p-1">
                  <button
                    onClick={() => setIndustryCompaniesViewType("table")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      industryCompaniesViewType === "table"
                        ? "bg-surface text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <TableIcon className="w-4 h-4" />
                    Table
                  </button>
                  <button
                    onClick={() => setIndustryCompaniesViewType("treemap")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      industryCompaniesViewType === "treemap"
                        ? "bg-surface text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                    Treemap
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">
                  Showing {sortedIndustryCompanies.length} of {industryData.overview.companies_count} total companies
                </span>
                <div className="group relative">
                  <Info className="w-4 h-4 text-text-secondary cursor-help" />
                  <div className="absolute left-0 top-6 w-64 p-2 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <p className="text-xs text-text-secondary">
                      Displaying the top companies by market capitalization. The industry contains {industryData.overview.companies_count} total companies, but only the most significant ones have detailed market data available.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Sort - only show for table view */}
            {industryCompaniesViewType === "table" && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b border-border/50">
              {/* Rating Filter */}
              {industryCompanyRatings.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary whitespace-nowrap">Filter:</label>
                  <select
                    value={industryCompanyRatingFilter}
                    onChange={(e) => {
                      setIndustryCompanyRatingFilter(e.target.value);
                      setShowAllIndustryCompanies(false);
                    }}
                    className="appearance-none bg-background border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="all">All Ratings</option>
                    {industryCompanyRatings.map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort Controls */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <label className="text-xs text-text-secondary whitespace-nowrap">Sort by:</label>
                <button
                  onClick={() => {
                    if (companySortBy === "marketWeight") {
                      setCompanySortOrder(companySortOrder === "desc" ? "asc" : "desc");
                    } else {
                      setCompanySortBy("marketWeight");
                      setCompanySortOrder("desc");
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    companySortBy === "marketWeight"
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-background text-text-secondary border border-border hover:bg-surface"
                  }`}
                >
                  Market Weight
                  {companySortBy === "marketWeight" && (
                    companySortOrder === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (companySortBy === "rating") {
                      setCompanySortOrder(companySortOrder === "desc" ? "asc" : "desc");
                    } else {
                      setCompanySortBy("rating");
                      setCompanySortOrder("desc");
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    companySortBy === "rating"
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-background text-text-secondary border border-border hover:bg-surface"
                  }`}
                >
                  Rating
                  {companySortBy === "rating" && (
                    companySortOrder === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            )}

            {/* Table View */}
            {industryCompaniesViewType === "table" && (
              <>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Rank
                    </th>
                    <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Company
                    </th>
                    <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Ticker
                    </th>
                    <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Rating
                    </th>
                    <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Price
                    </th>
                    <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Day Change
                    </th>
                    <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wider py-3 px-3">
                      Market Weight
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricesLoading && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          <span className="text-sm text-text-secondary">Loading prices...</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!pricesLoading && (showAllIndustryCompanies ? sortedIndustryCompanies : sortedIndustryCompanies.slice(0, 10)).map((company: any, idx: number) => {
                    const ticker = getCompanyTicker(company);
                    const priceData = ticker ? priceMap.get(ticker) : null;
                    return (
                      <tr
                        key={idx}
                        onClick={() => ticker && handleCompanyClick(company)}
                        className={`border-b border-border/30 hover:bg-surface/50 transition-all group ${ticker ? 'cursor-pointer' : ''}`}
                      >
                        <td className="py-3 px-3">
                          <span className="text-sm font-bold text-text-secondary group-hover:text-primary transition-colors">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">
                            {company.name}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {ticker ? (
                            <span className="inline-block text-xs font-mono font-semibold px-2 py-1 rounded bg-background border border-border group-hover:border-primary/50 transition-colors">
                              {ticker}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {company.rating ? (
                            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getRatingColor(company.rating)}`}>
                              {company.rating}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {priceData?.price ? (
                            <span className="text-sm font-mono font-semibold">
                              ${priceData.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {priceData?.change !== null && priceData?.change !== undefined && priceData?.change_percent !== null && priceData?.change_percent !== undefined ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {priceData.change >= 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 text-danger" />
                              )}
                              <div className="flex flex-col items-end">
                                <span className={`text-sm font-mono font-semibold ${priceData.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)}
                                </span>
                                <span className={`text-xs font-mono ${priceData.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                  ({priceData.change_percent >= 0 ? '+' : ''}{priceData.change_percent.toFixed(2)}%)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/60 rounded-full transition-all"
                                style={{ width: `${Math.min((company["market weight"] || 0) * 100 / 0.5, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono font-medium min-w-[3rem] text-right">
                              {formatPercentNoSign((company["market weight"] || 0) * 100)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sortedIndustryCompanies.length === 0 && (
              <div className="text-center py-8 text-text-secondary text-sm">
                No companies found with the selected filters.
              </div>
            )}

            {sortedIndustryCompanies.length > 10 && (
              <div className="mt-4 pt-4 border-t border-border/50 text-center">
                <button
                  onClick={() => setShowAllIndustryCompanies(!showAllIndustryCompanies)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {showAllIndustryCompanies
                    ? "Show Top 10"
                    : `Show All ${sortedIndustryCompanies.length} Top Companies`}
                </button>
              </div>
            )}
              </>
            )}

            {/* Treemap View */}
            {industryCompaniesViewType === "treemap" && (
              <CompaniesTreemap
                companies={sortedIndustryCompanies as any}
                onCompanyClick={handleCompanyClick}
              />
            )}
          </div>
        )}

        {/* Top Performing & Growth Companies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Top Performing</h3>
                <div className="group relative">
                  <Info className="w-4 h-4 text-text-secondary cursor-help" />
                  <div className="absolute left-0 top-6 w-64 p-2 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <p className="text-xs text-text-secondary">
                      Companies ranked by <span className="font-semibold text-text-primary">Year-to-Date returns</span>. Shows actual stock price performance this year.
                    </p>
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-secondary">
                {showAllPerforming ? industryData.top_performing_companies.length : Math.min(5, industryData.top_performing_companies.length)} of {industryData.top_performing_companies.length}
              </span>
            </div>
            <div className="space-y-3">
              {(showAllPerforming ? industryData.top_performing_companies : industryData.top_performing_companies.slice(0, 5)).map((company: any, idx: number) => {
                const ticker = getCompanyTicker(company);
                const ytdReturn = company["ytd return"];
                const lastPrice = company["last price"];
                const targetPrice = company["target price"];
                const upside = targetPrice && lastPrice ? ((targetPrice - lastPrice) / lastPrice) : null;

                return (
                  <div
                    key={idx}
                    onClick={() => ticker && handleCompanyClick(company)}
                    className={`p-3 bg-surface hover:bg-background rounded-lg transition-all border border-border/50 hover:border-primary/30 ${ticker ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">{company.name}</p>
                        {ticker && (
                          <span className="text-xs font-mono text-text-secondary">
                            {ticker}
                          </span>
                        )}
                      </div>
                      <div className="ml-3 text-right">
                        {ytdReturn != null && (
                          <div className={`text-sm font-bold ${ytdReturn >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatPercent(ytdReturn)}
                          </div>
                        )}
                        <div className="text-xs text-text-secondary">YTD</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/30">
                      <div>
                        <p className="text-xs text-text-secondary mb-0.5">Price</p>
                        <p className="text-sm font-mono font-medium">
                          {lastPrice ? `$${lastPrice.toFixed(2)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-0.5">Target</p>
                        <p className="text-sm font-mono font-medium">
                          {targetPrice ? `$${targetPrice.toFixed(2)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-0.5">Upside</p>
                        <p className={`text-sm font-mono font-medium ${upside !== null && upside >= 0 ? 'text-success' : upside !== null ? 'text-danger' : ''}`}>
                          {upside !== null ? formatPercentNoSign(upside * 100) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {industryData.top_performing_companies.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllPerforming(!showAllPerforming)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {showAllPerforming ? "Show Less" : `Show All ${industryData.top_performing_companies.length} Companies`}
                </button>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Top Growth</h3>
                <div className="group relative">
                  <Info className="w-4 h-4 text-text-secondary cursor-help" />
                  <div className="absolute left-0 top-6 w-64 p-2 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <p className="text-xs text-text-secondary">
                      Companies ranked by <span className="font-semibold text-text-primary">expected earnings growth</span>. Forward-looking projections, not past performance.
                    </p>
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-secondary">
                {showAllGrowth ? industryData.top_growth_companies.length : Math.min(5, industryData.top_growth_companies.length)} of {industryData.top_growth_companies.length}
              </span>
            </div>
            <div className="space-y-3">
              {(showAllGrowth ? industryData.top_growth_companies : industryData.top_growth_companies.slice(0, 5)).map((company: any, idx: number) => {
                const ticker = getCompanyTicker(company);
                const growthEstimate = company["growth estimate"];
                const ytdReturn = company["ytd return"];
                const lastPrice = company["last price"];

                return (
                  <div
                    key={idx}
                    onClick={() => ticker && handleCompanyClick(company)}
                    className={`p-3 bg-surface hover:bg-background rounded-lg transition-all border border-border/50 hover:border-primary/30 ${ticker ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">{company.name}</p>
                        {ticker && (
                          <span className="text-xs font-mono text-text-secondary">
                            {ticker}
                          </span>
                        )}
                      </div>
                      <div className="ml-3 text-right">
                        {growthEstimate != null && (
                          <div className="text-sm font-bold text-primary">
                            {growthEstimate.toFixed(2)}x
                          </div>
                        )}
                        <div className="text-xs text-text-secondary">Growth</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
                      <div className="flex-1">
                        <p className="text-xs text-text-secondary mb-0.5">YTD Return</p>
                        <p className={`text-sm font-mono font-medium ${ytdReturn !== null && ytdReturn >= 0 ? 'text-success' : ytdReturn !== null ? 'text-danger' : ''}`}>
                          {ytdReturn !== null ? formatPercent(ytdReturn) : "—"}
                        </p>
                      </div>
                      {lastPrice && (
                        <div className="text-right">
                          <p className="text-xs text-text-secondary mb-0.5">Current Price</p>
                          <p className="text-sm font-mono font-medium">
                            ${lastPrice.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {industryData.top_growth_companies.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllGrowth(!showAllGrowth)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {showAllGrowth ? "Show Less" : `Show All ${industryData.top_growth_companies.length} Companies`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sectors & Industries</h1>
          <p className="text-text-secondary mt-1">Explore market sectors and industries</p>
        </div>

        {/* Content Area */}
        {viewMode === "none" && (
          <div className="card p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Select a sector from the header to get started</h2>
            <p className="text-text-secondary">
              Hover over "Sectors" in the header to explore detailed sector and industry analytics
            </p>
          </div>
        )}

        {viewMode === "sector" && renderSectorView()}
        {viewMode === "industry" && renderIndustryView()}
      </div>
    </div>
  );
};
