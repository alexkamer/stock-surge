import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../features/auth/context/AuthContext";
import { Link2, ExternalLink, CheckCircle, XCircle } from "lucide-react";

interface SchwabTokenStatus {
  linked: boolean;
  expires_at?: string;
  email?: string;
}

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [authCode, setAuthCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check Schwab API connection status (dev mode tokens)
  const { data: schwabApiStatus } = useQuery({
    queryKey: ["schwab-api-status"],
    queryFn: async () => {
      const response = await apiClient.get("/api/schwab/status");
      return response.data;
    },
  });

  // Check Schwab link status (user-specific tokens)
  const { data: schwabStatus } = useQuery({
    queryKey: ["schwab-status"],
    queryFn: async () => {
      const response = await apiClient.get<SchwabTokenStatus>("/user/schwab/status");
      return response.data;
    },
  });

  // Link Schwab account mutation
  const linkSchwabMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiClient.post("/user/schwab/link", { code });
      return response.data;
    },
    onSuccess: () => {
      setSuccess("Schwab account linked successfully!");
      setError("");
      setAuthCode("");
      queryClient.invalidateQueries({ queryKey: ["schwab-status"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to link Schwab account");
      setSuccess("");
    },
  });

  // Unlink Schwab account mutation
  const unlinkSchwabMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete("/user/schwab/unlink");
      return response.data;
    },
    onSuccess: () => {
      setSuccess("Schwab account unlinked");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["schwab-status"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to unlink Schwab account");
      setSuccess("");
    },
  });

  const handleInitiateSchwab = async () => {
    try {
      // Get authorization URL from backend with auth headers
      const response = await apiClient.get("/user/schwab/authorize");
      const authUrl = response.data.authorization_url;
      // Redirect to Schwab OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to initiate Schwab connection");
    }
  };

  const handleLinkSchwab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      setError("Please enter the authorization code");
      return;
    }
    linkSchwabMutation.mutate(authCode);
  };

  const handleUnlink = () => {
    if (confirm("Are you sure you want to unlink your Schwab account?")) {
      unlinkSchwabMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      {/* User Info */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
        <div className="space-y-2 text-gray-300">
          <p><span className="text-gray-400">Name:</span> {user?.name || "N/A"}</p>
          <p><span className="text-gray-400">Email:</span> {user?.email}</p>
        </div>
      </div>

      {/* Schwab Integration */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Link2 className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Schwab Integration</h2>
        </div>

        {/* API Status (Dev Mode) */}
        {schwabApiStatus?.connected && (
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Schwab API Connected</span>
            </div>
            <p className="text-sm text-gray-300">
              Using development tokens from tokens.json
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Access token auto-refreshes every 29 minutes
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Status */}
        <div className="mb-6">
          {schwabStatus?.linked ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Connected to Schwab</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <XCircle className="w-5 h-5" />
              <span>Not connected</span>
            </div>
          )}
          {schwabStatus?.expires_at && (
            <p className="text-sm text-gray-400 mt-2">
              Refresh token expires: {new Date(schwabStatus.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {!schwabStatus?.linked ? (
          <>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-white mb-2">How to link your Schwab account:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Click "Connect Schwab Account" below to authorize</li>
                <li>Login to your Schwab account and approve access</li>
                <li>Copy the authorization code from the callback URL</li>
                <li>Paste the code below and click "Link Account"</li>
              </ol>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleInitiateSchwab}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Connect Schwab Account
              </button>

              <form onSubmit={handleLinkSchwab} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Authorization Code
                  </label>
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste authorization code here"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    The code will be in the URL after "code="
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={linkSchwabMutation.isPending}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linkSchwabMutation.isPending ? "Linking..." : "Link Account"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                Your Schwab account is connected. Stock prices and portfolio data will use real-time Schwab data.
              </p>
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinkSchwabMutation.isPending}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {unlinkSchwabMutation.isPending ? "Unlinking..." : "Unlink Schwab Account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
