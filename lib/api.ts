// This gets replaced at build time by Next.js with the actual value
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/api/v1';

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

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

class ApiClient {
  private token: string | null = null;
  private tokenLoaded: boolean = false;

  private async loadToken() {
    // Skip if not in browser environment or already loaded
    if (typeof window === 'undefined' || this.tokenLoaded) {
      return;
    }
    try {
      this.token = await window.storeAPI.get('api_token') as string | null;
      this.tokenLoaded = true;
    } catch (error) {
      console.error('Failed to load API token:', error);
    }
  }

  private async ensureTokenLoaded() {
    if (!this.tokenLoaded) {
      await this.loadToken();
    }
  }

  private async saveToken(token: string) {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await window.storeAPI.set('api_token', token);
      this.token = token;
      this.tokenLoaded = true;
    } catch (error) {
      console.error('Failed to save API token:', error);
    }
  }

  private async clearToken() {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await window.storeAPI.set('api_token', null);
      this.token = null;
    } catch (error) {
      console.error('Failed to clear API token:', error);
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Ensure token is loaded before getting headers
    await this.ensureTokenLoaded();
    
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
        headers: await this.getAuthHeaders(),
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

  async searchCommunityRules(query: string): Promise<PaginatedResponse<CommunityRule>> {
    try {
      const response = await fetch(`${API_BASE_URL}/rules/search/${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to search community rules: ${response.statusText}`);
      }

      const data: PaginatedResponse<CommunityRule> = await response.json();
      return data;
    } catch (error) {
      console.error('Search community rules error:', error);
      throw error;
    }
  }

  async getCommunityRulesPaginated(page: number = 1, officialOnly: boolean = false): Promise<PaginatedResponse<CommunityRule>> {
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (officialOnly) {
        params.append('officialOnly', 'true');
      }
      const response = await fetch(`${API_BASE_URL}/rules?${params.toString()}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch community rules: ${response.statusText}`);
      }

      const data: PaginatedResponse<CommunityRule> = await response.json();
      return data;
    } catch (error) {
      console.error('Get community rules error:', error);
      throw error;
    }
  }

  async searchCommunityRulesPaginated(query: string, page: number = 1, officialOnly: boolean = false): Promise<PaginatedResponse<CommunityRule>> {
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (officialOnly) {
        params.append('officialOnly', 'true');
      }
      const response = await fetch(`${API_BASE_URL}/rules/search/${encodeURIComponent(query)}?${params.toString()}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to search community rules: ${response.statusText}`);
      }

      const data: PaginatedResponse<CommunityRule> = await response.json();
      return data;
    } catch (error) {
      console.error('Search community rules error:', error);
      throw error;
    }
  }

  // Add more API methods here as needed
}

export const apiClient = new ApiClient();

export type { CommunityRule };
