import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi, type PortfolioPositionWithMetrics } from "../api/endpoints/portfolio";
import { apiClient } from "../api/client";
import { Plus, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, Link2 } from "lucide-react";
import AddPositionModal from "../components/portfolio/AddPositionModal";
import EditPositionModal from "../components/portfolio/EditPositionModal";

export default function Portfolio() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PortfolioPositionWithMetrics | null>(null);

  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ["portfolio"],
    queryFn: portfolioApi.getPortfolio,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch Schwab portfolio
  const { data: schwabPortfolio, isLoading: schwabLoading } = useQuery({
    queryKey: ["schwab-portfolio"],
    queryFn: async () => {
      const response = await apiClient.get("/api/schwab/accounts");
      return response.data;
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    retry: false,
  });

  const deletePositionMutation = useMutation({
    mutationFn: portfolioApi.deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const handleDeletePosition = async (positionId: string) => {
    if (confirm("Are you sure you want to delete this position?")) {
      await deletePositionMutation.mutateAsync(positionId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400">Error loading portfolio</div>
      </div>
    );
  }

  const totalValue = portfolio?.total_value || 0;
  const totalPL = portfolio?.total_unrealized_pl || 0;
  const totalPLPercent = portfolio?.total_unrealized_pl_percent || 0;
  const dayChange = portfolio?.total_day_change || 0;
  const dayChangePercent = portfolio?.total_day_change_percent || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Portfolio</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Position
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Value */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Total Value
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(totalValue)}
          </div>
        </div>

        {/* Total P/L */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            {totalPL >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            Total P/L
          </div>
          <div className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(totalPL)}
          </div>
          <div className={`text-sm ${totalPL >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatPercent(totalPLPercent)}
          </div>
        </div>

        {/* Day Change */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            Today
          </div>
          <div className={`text-2xl font-bold ${dayChange >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(dayChange)}
          </div>
          <div className={`text-sm ${dayChange >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatPercent(dayChangePercent)}
          </div>
        </div>

        {/* Positions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Positions</div>
          <div className="text-2xl font-bold text-white">
            {portfolio?.total_positions || 0}
          </div>
          <div className="text-sm text-gray-400">
            Cost Basis: {formatCurrency(portfolio?.total_cost_basis || 0)}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      {portfolio && portfolio.positions.length > 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Avg Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    P/L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Day Change
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {portfolio.positions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`/stock/${position.ticker}`}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        {position.ticker}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                      {position.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-300">
                      {formatCurrency(position.purchase_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                      {formatCurrency(position.current_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-white font-semibold">
                      {formatCurrency(position.current_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={position.unrealized_pl >= 0 ? "text-green-500" : "text-red-500"}>
                        {formatCurrency(position.unrealized_pl)}
                      </div>
                      <div className={`text-sm ${position.unrealized_pl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatPercent(position.unrealized_pl_percent)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={position.day_change >= 0 ? "text-green-500" : "text-red-500"}>
                        {formatCurrency(position.day_change)}
                      </div>
                      <div className={`text-sm ${position.day_change >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatPercent(position.day_change_percent)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingPosition(position)}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePosition(position.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <div className="text-gray-400 mb-4">No positions yet</div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Your First Position
          </button>
        </div>
      )}

      {/* Modals */}
      {/* Schwab Portfolio Section */}
      {schwabPortfolio?.accounts && schwabPortfolio.accounts.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <Link2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Schwab Account</h2>
            <span className="text-sm text-gray-400">
              (Live data from Schwab API)
            </span>
          </div>

          {schwabPortfolio.accounts.map((account: any, idx: number) => {
            const totalValue = account.currentBalances?.liquidationValue || 0;
            const cashBalance = account.currentBalances?.cashBalance || 0;
            const equityValue = account.currentBalances?.longMarketValue || 0;

            return (
              <div key={idx} className="mb-8">
                {/* Schwab Account Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-2">Account Value</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Account #{account.accountNumber} • {account.accountType}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-2">Equity Value</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(equityValue)}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {account.positions?.length || 0} positions
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-2">Cash Balance</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(cashBalance)}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Buying Power: {formatCurrency(account.currentBalances?.buyingPower || 0)}
                    </div>
                  </div>
                </div>

                {/* Schwab Positions Table */}
                {account.positions && account.positions.length > 0 && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Symbol
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Avg Price
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Market Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Type
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {account.positions
                            .sort((a: any, b: any) => b.currentValue - a.currentValue)
                            .map((position: any, posIdx: number) => (
                              <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <a
                                    href={`/stock/${position.symbol}`}
                                    className="text-blue-400 hover:text-blue-300 font-semibold"
                                  >
                                    {position.symbol}
                                  </a>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                                  {position.quantity.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                                  {formatCurrency(position.averagePrice)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-white font-semibold">
                                  {formatCurrency(position.currentValue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                  {position.instrument_type}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddPositionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
          }}
        />
      )}

      {editingPosition && (
        <EditPositionModal
          position={editingPosition}
          onClose={() => setEditingPosition(null)}
          onSuccess={() => {
            setEditingPosition(null);
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
          }}
        />
      )}
    </div>
  );
}
