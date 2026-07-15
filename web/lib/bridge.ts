// SpamBuster v2 web bridge.
// Reimplements the v1 Electron `window.*` IPC surface over HTTP + SSE so the
// v1 frontend components can be copied with minimal changes.

import type { MailProviderType } from './mail/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sb_token");
}
export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sb_user_id");
}
export function setSession(token: string, userId: string) {
  localStorage.setItem("sb_token", token);
  localStorage.setItem("sb_user_id", userId);
}
export function clearSession() {
  localStorage.removeItem("sb_token");
  localStorage.removeItem("sb_user_id");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function rawRequest<T>(path: string, opts: RequestInit): Promise<T> {
  const url = `${API_URL}${PREFIX}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// In-flight GET coalescing: when several components request the same URL in the
// same tick (e.g. dashboard + NextAnalysisTimer both loading settings), they
// share a single network request. The entry is removed as soon as the request
// settles, so no stale data is ever served — the next call hits the network.
const inFlightGets = new Map<string, Promise<unknown>>();

export function api<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    return rawRequest<T>(path, opts);
  }
  const key = `${path}|${getToken() ?? ""}`;
  const existing = inFlightGets.get(key);
  if (existing) return existing as Promise<T>;
  const promise = rawRequest<T>(path, opts).finally(() => {
    inFlightGets.delete(key);
  });
  inFlightGets.set(key, promise);
  return promise as Promise<T>;
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */
export const authAPI = {
  async signup(email: string, password: string, fullName: string) {
    const r = await api<{ data: { token: string; user: { id: number; email: string; fullName: string } } }>(
      "/auth/signup",
      { method: "POST", body: JSON.stringify({ email, password, passwordConfirmation: password, fullName }) },
    );
    setSession(r.data.token, String(r.data.user.id));
    return r.data;
  },
  async login(email: string, password: string) {
    const r = await api<{ data: { token: string; user: { id: number; email: string; fullName: string } } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    setSession(r.data.token, String(r.data.user.id));
    return r.data;
  },
  logout() {
    clearSession();
  },
  isLoggedIn() {
    return !!getToken();
  },
};

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */
export const accountsAPI = {
  async getAll() {
    return api<any[]>("/accounts");
  },
  async getById(id: string) {
    return api<any>(`/accounts/${id}`);
  },
  async create(accountData: any) {
    return api<any>("/accounts", { method: "POST", body: JSON.stringify(accountData) });
  },
  async update(id: string, updates: any) {
    return api<any>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(updates) });
  },
  async delete(id: string) {
    await api(`/accounts/${id}`, { method: "DELETE" });
    return true;
  },
  async listMailboxFolders(config: any) {
    const type: MailProviderType =
      config?.authType === 'oauth2' && config?.oauth2Config
        ? 'tenantId' in config.oauth2Config
          ? 'outlook'
          : 'gmail'
        : 'imap';
    const r = await api<{ success: boolean; folders?: { name: string; id?: string; path?: string }[]; error?: string }>(
      "/accounts/folders",
      {
        method: "POST",
        body: JSON.stringify({ type, config }),
      },
    );
    return { success: !!r.success, folders: r.folders, error: r.error };
  },
  async testConnection(accountId: string) {
    return api<{ success: boolean; error?: string }>(`/accounts/${accountId}/test`, { method: "POST" });
  },
};

/* -------------------------------------------------------------------------- */
/* Rules (backend shape {id,name,text,enabled,emailAccounts} -> v1 shape)      */
/* -------------------------------------------------------------------------- */
function ruleToV1(r: any) {
  if (!r) return r;
  return {
    id: String(r.id),
    name: r.name,
    type: "keyword",
    pattern: r.text,
    action: "ignore",
    enabled: r.enabled,
    emailAccounts: r.emailAccounts,
  };
}
export const rulesAPI = {
  async getAll() {
    const list = await api<any[]>("/rules");
    return list.map(ruleToV1);
  },
  async getById(id: string) {
    return ruleToV1(await api<any>(`/rules/${id}`));
  },
  async create(ruleData: any) {
    const payload = { name: ruleData.name, text: ruleData.pattern ?? ruleData.text, enabled: ruleData.enabled ?? true };
    return ruleToV1(await api<any>("/rules", { method: "POST", body: JSON.stringify(payload) }));
  },
  async update(id: string, updates: any) {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.pattern !== undefined) payload.text = updates.pattern;
    if (updates.text !== undefined) payload.text = updates.text;
    if (updates.enabled !== undefined) payload.enabled = updates.enabled;
    return ruleToV1(await api<any>(`/rules/${id}`, { method: "PUT", body: JSON.stringify(payload) }));
  },
  async delete(id: string) {
    await api(`/rules/${id}`, { method: "DELETE" });
    return true;
  },
};

/* -------------------------------------------------------------------------- */
/* Analyzed emails                                                            */
/* -------------------------------------------------------------------------- */
export const analyzedEmailsAPI = {
  async getAll(opts?: { limit?: number }) {
    const qs = opts?.limit ? `?limit=${encodeURIComponent(opts.limit)}` : "";
    return api<any[]>(`/analyzed-emails${qs}`);
  },
  async getById(id: string) {
    return api<any>(`/analyzed-emails/${id}`);
  },
  async create(emailData: any) {
    return api<any>("/analyzed-emails", { method: "POST", body: JSON.stringify(emailData) });
  },
  async update(id: string, updates: any) {
    return api<any>(`/analyzed-emails/${id}`, { method: "PUT", body: JSON.stringify(updates) });
  },
  async delete(id: string) {
    await api(`/analyzed-emails/${id}`, { method: "DELETE" });
  },
};

/* -------------------------------------------------------------------------- */
/* General settings (granular get/set over full object)                       */
/* -------------------------------------------------------------------------- */
async function getGeneral(only?: string[]) {
  const qs = only && only.length ? `?only=${encodeURIComponent(only.join(","))}` : "";
  return api<any>(`/settings/general${qs}`);
}
async function putGeneral(patch: any) {
  const current = await getGeneral();
  return api<any>("/settings/general", { method: "PUT", body: JSON.stringify({ ...current, ...patch }) });
}
export const generalAPI = {
  getAll: (only?: string[]) => getGeneral(only),
  getAISensitivity: () => getGeneral().then((s) => s.aiSensitivity),
  setAISensitivity: (v: number) => putGeneral({ aiSensitivity: v }),
  getEmailAgeDays: () => getGeneral().then((s) => s.emailAgeDays),
  setEmailAgeDays: (v: number) => putGeneral({ emailAgeDays: v }),
  getSimplifyEmailContent: () => getGeneral().then((s) => s.simplifyEmailContent),
  setSimplifyEmailContent: (v: boolean) => putGeneral({ simplifyEmailContent: v }),
  getSimplifyEmailContentMode: () => getGeneral().then((s) => s.simplifyEmailContentMode),
  setSimplifyEmailContentMode: (v: string) => putGeneral({ simplifyEmailContentMode: v }),
  getEnableCron: () => getGeneral().then((s) => s.enableCron),
  setEnableCron: (v: boolean) => putGeneral({ enableCron: v }),
  getCronExpression: () => getGeneral().then((s) => s.cronExpression),
  setCronExpression: (v: string) => putGeneral({ cronExpression: v }),
  validateCronExpression: (expression: string) => {
    const parts = (expression || "").trim().split(/\s+/)
    if (parts.length !== 5) {
      return Promise.resolve({ valid: false, error: "Cron expression must have 5 fields" })
    }
    const rangeOk = (field: string, min: number, max: number): boolean => {
      if (field === "*") return true
      return field.split(",").every((chunk) => {
        const step = chunk.split("/")
        const base = step[0]
        const range = base.split("-")
        const inRange = (n: string) => {
          if (n === "*") return true
          const v = Number(n)
          return Number.isInteger(v) && v >= min && v <= max
        }
        if (range.length === 2) return inRange(range[0]) && inRange(range[1])
        return inRange(range[0])
      })
    }
    const [m, h, dom, mon, dow] = parts
    const ok =
      rangeOk(m, 0, 59) && rangeOk(h, 0, 23) && rangeOk(dom, 1, 31) && rangeOk(mon, 1, 12) && rangeOk(dow, 0, 7)
    return Promise.resolve({ valid: ok, error: ok ? undefined : "Invalid cron field" })
  },
  getSchedulerMode: () => getGeneral().then((s) => s.schedulerMode),
  setSchedulerMode: (v: string) => putGeneral({ schedulerMode: v }),
  getSchedulerSimpleValue: () => getGeneral().then((s) => s.schedulerSimpleValue),
  setSchedulerSimpleValue: (v: number) => putGeneral({ schedulerSimpleValue: v }),
  getSchedulerSimpleUnit: () => getGeneral().then((s) => s.schedulerSimpleUnit),
  setSchedulerSimpleUnit: (v: string) => putGeneral({ schedulerSimpleUnit: v }),
  generateCronFromSimple: (value: number, unit: string) => {
    const unitMap: Record<string, string> = {
      minutes: "* * * * *",
      hours: `0 * * * *`,
      days: `0 0 * * *`,
    };
    // simple mapping: every N minutes/hours/days
    if (unit === "minutes") return Promise.resolve(`*/${value} * * * *`);
    if (unit === "hours") return Promise.resolve(`0 */${value} * * *`);
    if (unit === "days") return Promise.resolve(`0 0 */${value} * *`);
    return Promise.resolve(unitMap[unit] || "* * * * *");
  },
  getDateFormat: () => getGeneral().then((s) => s.dateFormat),
  setDateFormat: (v: string) => putGeneral({ dateFormat: v }),
  getCustomDateFormat: () => getGeneral().then((s) => s.customDateFormat),
  setCustomDateFormat: (v: string) => putGeneral({ customDateFormat: v }),
  getTimeFormat: () => getGeneral().then((s) => s.timeFormat),
  setTimeFormat: (v: "12h" | "24h") => putGeneral({ timeFormat: v }),
};

/* -------------------------------------------------------------------------- */
/* AI settings                                                                */
/* -------------------------------------------------------------------------- */
async function getAi() {
  return api<any>("/settings/ai");
}
async function putAi(patch: any) {
  const current = await getAi();
  return api<any>("/settings/ai", { method: "PUT", body: JSON.stringify({ ...current, ...patch }) });
}
export const aiAPI = {
  getAll: () => getAi(),
  getAISource: () => getAi().then((s) => s.aiSource),
  setAISource: (v: string) => putAi({ aiSource: v }),
  getOllamaBaseUrl: () => getAi().then((s) => s.ollamaBaseUrl),
  setOllamaBaseUrl: (v: string) => putAi({ ollamaBaseUrl: v }),
  getOpenRouterApiKey: () => getAi().then((s) => s.openRouterApiKey),
  setOpenRouterApiKey: (v: string) => putAi({ openRouterApiKey: v }),
  getSelectedModel: () => getAi().then((s) => s.selectedModel),
  setSelectedModel: (v: string) => putAi({ selectedModel: v }),
  getSelectedEmbedModel: () => getAi().then((s) => s.selectedEmbedModel),
  setSelectedEmbedModel: (v: string) => putAi({ selectedEmbedModel: v }),
  getEnableVectorDB: () => getAi().then((s) => s.enableVectorDb),
  setEnableVectorDB: (v: boolean) => putAi({ enableVectorDb: v }),
  getCustomizeSpamGuidelines: () => getAi().then((s) => s.customizeSpamGuidelines),
  setCustomizeSpamGuidelines: (v: boolean) => putAi({ customizeSpamGuidelines: v }),
  getCustomSpamGuidelines: () => getAi().then((s) => s.customSpamGuidelines),
  setCustomSpamGuidelines: (v: string) => putAi({ customSpamGuidelines: v }),
  getTemperature: () => getAi().then((s) => s.temperature),
  setTemperature: (v: number) => putAi({ temperature: v }),
  getTopP: () => getAi().then((s) => s.topP),
  setTopP: (v: number) => putAi({ topP: v }),
};

/* -------------------------------------------------------------------------- */
/* Vector DB                                                                  */
/* -------------------------------------------------------------------------- */
export const vectorDBAPI = {
  async findSimilarEmails(queryText: string, limit = 5, accountId?: string) {
    const r = await api<{ matches: any[] }>("/vector-db/search", {
      method: "POST",
      body: JSON.stringify({ queryText, limit, accountId }),
    });
    return (r.matches || []).map((m: any) => ({ ...m, similarity: m.similarity ?? 0 }));
  },
  async storeAnalyzedEmail(emailData: any) {
    await api("/vector-db/store", { method: "POST", body: JSON.stringify(emailData) });
  },
  async updateUserValidation(emailId: string, userValidated: boolean | null) {
    await api("/vector-db/validate", { method: "POST", body: JSON.stringify({ emailId, userValidated }) });
  },
  async getEmailCount() {
    const r = await api<{ count: number }>("/vector-db/count");
    return r.count;
  },
  async clearAllEmails() {
    await api("/vector-db/clear", { method: "DELETE" });
  },
};

/* -------------------------------------------------------------------------- */
/* OAuth                                                                      */
/* -------------------------------------------------------------------------- */
export interface OAuthConfig {
  clientId: string
  clientSecret?: string
  tenantId?: string
  userEmail: string
  accessToken: string
  refreshToken: string
  tokenExpiry: string
}

export const oauthAPI = {
  // Google authorization-code flow: returns the provider authorize URL.
  async getGoogleAuthUrl() {
    const r = await api<{ authUrl: string }>("/oauth/google/start")
    return r.authUrl
  },
  // The redirect URI that must be registered in the Google Cloud console.
  getGoogleCallbackUrl() {
    return `${API_URL}${PREFIX}/oauth/google/callback`
  },
  // Microsoft device-code flow: returns a user code + verification URI.
  async getMicrosoftDeviceCode(tenantId = "common") {
    return api<{
      userCode: string
      deviceCode: string
      verificationUri: string
      message: string
      expiresIn: number
    }>("/oauth/microsoft/device-code", { method: "POST", body: JSON.stringify({ tenantId }) })
  },
  // Poll Microsoft for the device-code token. Returns { status: 'success'|'pending', config? }.
  async pollMicrosoftToken(deviceCode: string, tenantId = "common") {
    return api<{ status: "success" | "pending" | "error"; config?: OAuthConfig; error?: string }>(
      "/oauth/microsoft/poll",
      { method: "POST", body: JSON.stringify({ deviceCode, tenantId }) },
    )
  },
}

/* -------------------------------------------------------------------------- */
/* Processing events via fetch-based SSE (EventSource can't send auth header) */
/* -------------------------------------------------------------------------- */
type Handler = (...args: any[]) => void;

class ProcessingEvents {
  private uid = Math.random().toString(36).slice(2);
  private es: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abort: AbortController | null = null;
  private buffer = "";
  private listeners: Record<string, Set<Handler>> = {};
  private subscribed = false;

  private ensureConnection() {
    // Guard synchronously: `this.es` is only set after the fetch resolves, so
    // concurrent `on()` calls would each open a stream. The AbortController is
    // created synchronously and acts as the "connecting" flag for the race.
    if (this.es || this.abort || typeof window === "undefined") return;
    const userId = getUserId();
    if (!userId) return;
    this.abort = new AbortController();
    const url = `${API_URL}/__transmit/events?uid=${this.uid}`;
    fetch(url, { headers: { Authorization: `Bearer ${getToken() || ""}` }, signal: this.abort.signal })
      .then((res) => {
        if (!res.body) return;
        const reader = res.body.getReader();
        this.es = reader;
        const decoder = new TextDecoder();
        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) return;
            this.buffer += decoder.decode(value, { stream: true });
            this.processBuffer();
            pump();
          });
        };
        pump();
        this.subscribe();
      })
      .catch(() => {});
  }

  private processBuffer() {
    const parts = this.buffer.split("\n\n");
    this.buffer = parts.pop() || "";
    for (const part of parts) {
      const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      try {
        const msg = JSON.parse(json);
        if (msg?.payload?.event) this.dispatch(msg.payload.event, msg.payload.data);
      } catch {}
    }
  }

  private dispatch(event: string, data: any) {
    if (event === "alert") {
      // Backend broadcasts {event:'alert', data:{event:'created'|'deleted'|'ai-deleted', data}}
      const inner = data?.event;
      const payload = data?.data;
      if (typeof window !== "undefined") {
        if (inner === "created") {
          window.dispatchEvent(new CustomEvent("spambuster:alert-created", { detail: payload }));
        } else if (inner === "deleted") {
          window.dispatchEvent(new CustomEvent("spambuster:alerts-deleted", { detail: payload }));
        } else if (inner === "ai-deleted") {
          window.dispatchEvent(new CustomEvent("spambuster:ai-alerts-deleted"));
        }
      }
      (this.listeners["alert"] || new Set()).forEach((h) => h(data));
      return;
    }
    (this.listeners[event] || new Set()).forEach((h) => h(data));
  }

  private subscribe() {
    if (this.subscribed) return;
    const userId = getUserId();
    if (!userId) return;
    const channels = [`users/${userId}/processing`, `users/${userId}/alerts`];
    Promise.all(
      channels.map((channel) =>
        fetch(`${API_URL}/__transmit/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() || ""}` },
          body: JSON.stringify({ uid: this.uid, channel }),
        }),
      ),
    ).then(() => {
      this.subscribed = true;
    });
  }

  on(event: string, cb: Handler) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(cb);
    this.ensureConnection();
    return () => {
      this.listeners[event]?.delete(cb);
    };
  }
  onStatsUpdate(cb: Handler) {
    return this.on("stats-update", cb);
  }
  onProgress(cb: Handler) {
    return this.on("progress", cb);
  }
  onComplete(cb: Handler) {
    return this.on("complete", cb);
  }
  onError(cb: Handler) {
    return this.on("error", cb);
  }
  onStatusChange(cb: Handler) {
    return this.on("status-change", cb);
  }
  onAnalyzedEmailCreated(cb: Handler) {
    return this.on("analyzed-email-created", cb);
  }
  onSchedulerSettingsChanged(cb: Handler) {
    return this.on("scheduler-settings-changed", cb);
  }
  removeAllListeners() {
    this.listeners = {};
  }
}
export const processingEvents = new ProcessingEvents();

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */
export const alertsAPI = {
  get: () => api<any[]>("/alerts"),
  delete: (id: string) => api(`/alerts/${id}`, { method: "DELETE" }),
};

/* -------------------------------------------------------------------------- */
/* Processing control                                                         */
/* -------------------------------------------------------------------------- */
export const processAPI = {
  start: () => api<{ started: boolean }>("/process", { method: "POST" }),
  stop: () => api<{ stopped: boolean }>("/process/stop", { method: "POST" }),
};

/* -------------------------------------------------------------------------- */
/* Community                                                                  */
/* -------------------------------------------------------------------------- */
export const communityAPI = {
  getRules: (page = 1) => api<any>(`/community/rules?page=${page}`),
  searchRules: (q: string) => api<any>(`/community/rules/search/${encodeURIComponent(q)}`),
  getCuratedModels: () => api<any>("/community/curated-models"),
  login: (email: string, password: string) =>
    api<any>("/community/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};

/* -------------------------------------------------------------------------- */
/* Install on window so copied v1 components work unchanged                   */
/* -------------------------------------------------------------------------- */
export function installBridge() {
  if (typeof window === "undefined") return;
  (window as any).accountsAPI = accountsAPI;
  (window as any).rulesAPI = rulesAPI;
  (window as any).analyzedEmailsAPI = analyzedEmailsAPI;
  (window as any).generalAPI = generalAPI;
  (window as any).aiAPI = aiAPI;
  (window as any).vectorDBAPI = vectorDBAPI;
  (window as any).oauthAPI = oauthAPI;
  (window as any).processingEvents = processingEvents;
  (window as any).communityAPI = communityAPI;
  (window as any).authAPI = authAPI;
  (window as any).alertsAPI = alertsAPI;
  (window as any).processAPI = processAPI;
}
