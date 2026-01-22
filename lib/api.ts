const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost/api/v1';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

interface CommunityRule {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_official: boolean;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await window.storeAPI.get('api_token') as string | null;
    } catch (error) {
      console.error('Failed to load API token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      await window.storeAPI.set('api_token', token);
      this.token = token;
    } catch (error) {
      console.error('Failed to save API token:', error);
    }
  }

  private async clearToken() {
    try {
      await window.storeAPI.set('api_token', null);
      this.token = null;
    } catch (error) {
      console.error('Failed to clear API token:', error);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const data: LoginResponse = await response.json();
      await this.saveToken(data.token);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.clearToken();
  }

  async getCommunityRules(): Promise<CommunityRule[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/rules`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch community rules: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.rules || data.data || [];
    } catch (error) {
      console.error('Get community rules error:', error);
      throw error;
    }
  }

  async searchCommunityRules(query: string): Promise<CommunityRule[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/rules/search/${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to search community rules: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.rules || data.data || [];
    } catch (error) {
      console.error('Search community rules error:', error);
      throw error;
    }
  }

  // Add more API methods here as needed
}

export const apiClient = new ApiClient();

export type { CommunityRule };
