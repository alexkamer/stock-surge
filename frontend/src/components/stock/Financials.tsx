import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, TrendingUp, DollarSign } from "lucide-react";
import { stockApi } from "../../api/endpoints/stocks";
import { formatCompactCurrency, formatDate } from "../../lib/formatters";

interface FinancialsProps {
  ticker: string;
}

type StatementType = "income" | "balance-sheet" | "cash-flow";

interface StatementTab {
  id: StatementType;
  label: string;
  icon: React.ReactNode;
}

interface FinancialData {
  [key: string]: any;
}

export const Financials: React.FC<FinancialsProps> = ({ ticker }) => {
  const [activeStatement, setActiveStatement] = useState<StatementType>("income");

  const tabs: StatementTab[] = [
    { id: "income", label: "Income Statement", icon: <TrendingUp size={16} /> },
    { id: "balance-sheet", label: "Balance Sheet", icon: <DollarSign size={16} /> },
    { id: "cash-flow", label: "Cash Flow", icon: <FileText size={16} /> },
  ];

  // Fetch financial data based on active statement
  const { data, isLoading, error } = useQuery({
    queryKey: ["financials", ticker, activeStatement],
    queryFn: async () => {
      const response = await stockApi.getFinancials(ticker, activeStatement);
      return response.data; // Extract the data array from the response
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const renderFinancialTable = (financialData: FinancialData[] | null) => {
    if (!financialData || financialData.length === 0) {
      return (
        <div className="text-center py-12 text-text-secondary">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p>No financial data available</p>
        </div>
      );
    }

    // Extract dates from first row (all rows have same date columns)
    const firstRow = financialData[0];
    const dateKeys = Object.keys(firstRow).filter(
      (key) => key !== "index" && key.includes("T00:00:00")
    );

    // Sort dates (most recent first)
    const sortedDates = [...dateKeys].sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    if (sortedDates.length === 0) {
      return (
        <div className="text-center py-12 text-text-secondary">
          <p>No date columns found in financial data</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface border-b border-border z-10">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-text-primary min-w-[250px] bg-surface sticky left-0">
                Metric
              </th>
              {sortedDates.map((date, idx) => (
                <th
                  key={idx}
                  className="text-right py-3 px-4 font-semibold text-text-primary min-w-[140px]"
                >
                  {formatDate(date, "MMM yyyy")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {financialData.map((row, rowIdx) => {
              const metricName = row.index || "Unknown";

              // Format metric name for better readability
              const formattedMetric = metricName
                .split(/(?=[A-Z])/)
                .join(" ")
                .trim();

              return (
                <tr
                  key={rowIdx}
                  className={`border-b border-border hover:bg-surface/50 transition-colors ${
                    rowIdx % 2 === 0 ? "bg-background" : "bg-surface/30"
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-text-primary bg-inherit sticky left-0">
                    {formattedMetric}
                  </td>
                  {sortedDates.map((date, dateIdx) => {
                    const value = row[date];
                    const isNumeric = typeof value === "number" && !isNaN(value);
                    const isNegative = isNumeric && value < 0;

                    return (
                      <td
                        key={dateIdx}
                        className={`py-3 px-4 text-right font-mono ${
                          isNegative ? "text-negative" : "text-text-primary"
                        }`}
                      >
                        {isNumeric ? formatCompactCurrency(value) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="card">
      {/* Statement Type Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatement(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap
              ${
                activeStatement === tab.id
                  ? "text-accent border-b-2 border-accent"
                  : "text-text-secondary hover:text-text-primary"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-negative">
          <p>Error loading financial data</p>
          <p className="text-sm text-text-secondary mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="max-h-[600px] overflow-y-auto">
          {renderFinancialTable(data)}
        </div>
      )}

      {/* Info footer */}
      {!isLoading && !error && data && data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border text-xs text-text-secondary">
          <p>
            Financial data is sourced from Yahoo Finance and may be delayed. All values are in the company's reporting currency.
          </p>
        </div>
      )}
    </div>
  );
};
