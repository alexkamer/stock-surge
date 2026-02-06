import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { stockApi } from "../../api/endpoints/stocks";
import { formatPercent, formatCompactCurrency } from "../../lib/formatters";
import { generateIndustryColors } from "../../lib/chartColors";
import { IndustryPieChart } from "./IndustryPieChart";
import { IndustrySearchableList } from "./IndustrySearchableList";
import { IndustryGridView } from "./IndustryGridView";
import { CompaniesTreemap } from "./CompaniesTreemap";
import { LayoutGrid, PieChart as PieChartIcon, Table as TableIcon, Grid3x3 } from "lucide-react";

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

export const SectorIndustry: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSector, setSelectedSector] = useState("technology");
  const [viewMode, setViewMode] = useState<"sector" | "industry">("sector");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [industryViewType, setIndustryViewType] = useState<"grid" | "pie">("pie");
  const [companiesViewType, setCompaniesViewType] = useState<"table" | "treemap">("table");
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  // Fetch sector data (always fetch to populate industry dropdown)
  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ["sector", selectedSector],
    queryFn: () => stockApi.getSector(selectedSector),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Fetch industry data
  const { data: industryData, isLoading: industryLoading } = useQuery({
    queryKey: ["industry", selectedIndustry],
    queryFn: () => stockApi.getIndustry(selectedIndustry!),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: viewMode === "industry" && selectedIndustry !== null,
  });

  // Generate colors based on sector and industry count
  const industryColors = useMemo(() => {
    if (!sectorData?.industries) return [];
    return generateIndustryColors(sectorData.industries.length, selectedSector);
  }, [sectorData, selectedSector]);

  // Get industries from sector data with mapped keys, colors, and metadata
  const availableIndustries = useMemo(() => {
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
      .sort((a: any, b: any) => b.weight - a.weight) // Sort by market weight
      .map((industry: any, idx: number) => ({
        ...industry,
        rank: idx + 1, // Add rank after sorting
      }));
  }, [sectorData, industryColors]);

  // Reset selected industry when sector changes
  useEffect(() => {
    setSelectedIndustry(null);
    setShowAllCompanies(false);
    setRatingFilter("all");
    if (viewMode === "industry") {
      setViewMode("sector");
    }
  }, [selectedSector]);

  const handleSectorChange = (newSector: string) => {
    setSelectedSector(newSector);
    setViewMode("sector");
  };

  const handleIndustrySelect = (industryKey: string) => {
    if (industryKey) {
      setSelectedIndustry(industryKey);
      setViewMode("industry");
    } else {
      // Empty selection - go back to sector view
      setSelectedIndustry(null);
      setViewMode("sector");
    }
  };

  // Handle industry click from pie chart or list (auto-navigate)
  const handleIndustryClick = (industryKey: string) => {
    setSelectedIndustry(industryKey);
    setViewMode("industry");
  };

  // Helper function to get ticker from company
  const getCompanyTicker = (company: any): string | null => {
    // Priority: symbol > ticker > extract from name
    if (company.symbol) return company.symbol;
    if (company.ticker) return company.ticker;

    // Common ticker extraction map
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

  // Handle company click in table
  const handleCompanyClick = (company: any) => {
    const ticker = getCompanyTicker(company);
    if (ticker) {
      navigate(`/stock/${ticker}`);
    }
  };

  // Get unique ratings from companies
  const availableRatings = useMemo(() => {
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
  const filteredCompanies = useMemo(() => {
    if (!sectorData?.top_companies) return [];
    if (ratingFilter === "all") return sectorData.top_companies;
    return sectorData.top_companies.filter((company: any) => company.rating === ratingFilter);
  }, [sectorData, ratingFilter]);

  const renderSectorView = () => {
    if (sectorLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-background rounded"></div>
          <div className="h-48 bg-background rounded"></div>
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
              <p className="text-xl font-bold truncate">{formatPercent(sectorData.overview.market_weight * 100)}</p>
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
                            {formatPercent((company["market weight"] || 0) * 100)}
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
            Click any industry to view detailed analytics, or use the industry dropdown above
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

  const renderIndustryView = () => {
    if (industryLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-background rounded"></div>
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
                setViewMode("sector");
                setSelectedSector(industryData.sector_key);
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
              <p className="text-xl font-bold truncate">{formatPercent(industryData.overview.market_weight * 100)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary mb-1">Employees</p>
              <p className="text-xl font-bold truncate">{industryData.overview.employee_count.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Top Performing & Growth Companies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3">Top Performing</h3>
            <div className="space-y-2">
              {industryData.top_performing_companies.slice(0, 5).map((company: any, idx: number) => (
                <div key={idx} className="p-2 hover:bg-background rounded transition-colors">
                  <p className="font-medium">{company.name}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">YTD Return</span>
                    <span className="font-mono text-success">
                      {company["ytd return"] != null ? formatPercent(company["ytd return"]) : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3">Top Growth</h3>
            <div className="space-y-2">
              {industryData.top_growth_companies.slice(0, 5).map((company: any, idx: number) => (
                <div key={idx} className="p-2 hover:bg-background rounded transition-colors">
                  <p className="font-medium">{company.name}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Growth Estimate</span>
                    <span className="font-mono text-success">
                      {company["growth estimate"] != null ? `${company["growth estimate"].toFixed(2)}x` : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-semibold">Sector & Industry Analysis</h2>

          <div className="flex gap-2">
            {viewMode === "industry" && (
              <button
                onClick={() => setViewMode("sector")}
                className="btn btn-secondary text-sm"
              >
                ← Back to Sectors
              </button>
            )}
          </div>
        </div>

        {/* Selectors */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">Sector</label>
            <select
              value={selectedSector}
              onChange={(e) => handleSectorChange(e.target.value)}
              className="w-full appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-card transition-colors"
            >
              {POPULAR_SECTORS.map((sector) => (
                <option key={sector.key} value={sector.key}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">
              Industry {sectorLoading ? "(Loading...)" : `(${availableIndustries.length} available)`}
            </label>
            <select
              value={selectedIndustry || ""}
              onChange={(e) => handleIndustrySelect(e.target.value)}
              disabled={sectorLoading || availableIndustries.length === 0}
              className="w-full appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {viewMode === "industry" ? "← View All Industries" : "Select an industry..."}
              </option>
              {availableIndustries.map((industry: any) => (
                <option key={industry.key} value={industry.key}>
                  {industry.name} ({formatPercent(industry.weight * 100)} weight)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === "sector" ? renderSectorView() : renderIndustryView()}
    </div>
  );
};
