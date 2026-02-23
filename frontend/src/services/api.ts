import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  oauthStart: (platform: string) =>
    api.get(`/auth/oauth/${platform}/start`),
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
export const accountsApi = {
  list: () => api.get("/accounts"),
  disconnect: (id: string) => api.delete(`/accounts/${id}`),
  sync: (accountId: string) => api.post(`/ingest/${accountId}/sync`),
};

// ─── Drafts ───────────────────────────────────────────────────────────────────
export const draftsApi = {
  generate: (data: {
    platform_targets: string[];
    topic?: string;
    prompts?: string[];
    tone?: string;
  }) => api.post("/drafts/generate", { user_id: "", ...data }),
  list: (limit = 20, offset = 0) =>
    api.get(`/drafts?limit=${limit}&offset=${offset}`),
  get: (id: string) => api.get(`/drafts/${id}`),
  update: (id: string, data: Partial<{ content: string; is_approved: boolean }>) =>
    api.patch(`/drafts/${id}`, data),
  delete: (id: string) => api.delete(`/drafts/${id}`),
};

// ─── Posts & Scheduling ───────────────────────────────────────────────────────
export const postsApi = {
  list: (params?: { status?: string; limit?: number }) =>
    api.get("/posts", { params }),
  schedule: (data: { draft_id: string; scheduled_at: string; platforms: string[] }) =>
    api.post("/posts/schedule", data),
  listJobs: () => api.get("/schedule/jobs"),
  cancelJob: (jobId: string) => api.delete(`/schedule/jobs/${jobId}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  summary: () => api.get("/analytics/summary"),
  refresh: () => api.post("/analytics/refresh"),
  calendar: () => api.get("/analytics/calendar"),
};