import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { portfolioApi, type PortfolioPositionWithMetrics } from "../../api/endpoints/portfolio";
import { X } from "lucide-react";

interface EditPositionModalProps {
  position: PortfolioPositionWithMetrics;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPositionModal({ position, onClose, onSuccess }: EditPositionModalProps) {
  const [quantity, setQuantity] = useState(position.quantity.toString());
  const [purchasePrice, setPurchasePrice] = useState(position.purchase_price.toString());
  const [purchaseDate, setPurchaseDate] = useState(
    new Date(position.purchase_date).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(position.notes || "");
  const [error, setError] = useState("");

  const updatePositionMutation = useMutation({
    mutationFn: (data: any) => portfolioApi.updatePosition(position.id, data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to update position");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const quantityNum = parseInt(quantity);
    const priceNum = parseFloat(purchasePrice);

    if (quantityNum <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    if (priceNum <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    await updatePositionMutation.mutateAsync({
      quantity: quantityNum,
      purchase_price: priceNum,
      purchase_date: new Date(purchaseDate).toISOString(),
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Edit Position - {position.ticker}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purchase Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min="0.01"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purchase Date *
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trade rationale..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="text-xs text-gray-400 mt-1">
              {notes.length}/500
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatePositionMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatePositionMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
