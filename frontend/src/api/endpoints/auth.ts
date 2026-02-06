import { apiClient, setTokens } from "../client";

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  username: string; // API expects 'username' field for OAuth2
  password: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    // OAuth2 password flow expects form data
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await apiClient.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // Store tokens
    setTokens(response.data.access_token, response.data.refresh_token);

    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  logout: () => {
    // Clear tokens from memory
    setTokens("", "");
  },
};
