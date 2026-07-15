// Community API client. Delegates to the central bridge `api()` so it uses the
// same base URL, /api/v1 prefix, and auth token as the rest of the app.
// The backend proxies /community/* to the external SpamBuster community API.
import { api, setSession } from './bridge'

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

interface CuratedModel {
  id: number;
  model_name: string;
  description: string;
  platform: string;
  position: number;
  created_at: string;
  updated_at: string;
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

function asArray<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.rules)) return o.rules as T[];
    if (Array.isArray(o.models)) return o.models as T[];
  }
  return [];
}

class ApiClient {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const r = (await api<{ data: { token: string; user: { id: number; email: string } } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(credentials) },
    )) as any;
    const token = r.data.token;
    const user = r.data.user;
    setSession(token, String(user.id));
    return { token, user: { id: String(user.id), email: user.email } };
  }

  async logout(): Promise<void> {
    try {
      await api('/account/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
  }

  async getCommunityRules(): Promise<CommunityRule[]> {
    const d = await api<any>('/community/rules');
    return asArray<CommunityRule>(d);
  }

  async searchCommunityRules(query: string): Promise<PaginatedResponse<CommunityRule>> {
    return (await api<any>(`/community/rules/search/${encodeURIComponent(query)}`)) as PaginatedResponse<CommunityRule>;
  }

  async getCommunityRulesPaginated(page = 1, officialOnly = false): Promise<PaginatedResponse<CommunityRule>> {
    const params = new URLSearchParams({ page: page.toString() });
    if (officialOnly) params.append('officialOnly', 'true');
    return (await api<any>(`/community/rules?${params.toString()}`)) as PaginatedResponse<CommunityRule>;
  }

  async searchCommunityRulesPaginated(
    query: string,
    page = 1,
    officialOnly = false,
  ): Promise<PaginatedResponse<CommunityRule>> {
    const params = new URLSearchParams({ page: page.toString() });
    if (officialOnly) params.append('officialOnly', 'true');
    return (await api<any>(
      `/community/rules/search/${encodeURIComponent(query)}?${params.toString()}`,
    )) as PaginatedResponse<CommunityRule>;
  }

  async getCuratedModels(): Promise<CuratedModel[]> {
    const d = await api<any>('/community/curated-models');
    return asArray<CuratedModel>(d);
  }
}

export const apiClient = new ApiClient();

export type { CommunityRule, CuratedModel };
