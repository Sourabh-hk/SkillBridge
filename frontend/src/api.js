const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * tokenGetter is set by AuthContext after Clerk initialises.
 * It must return a Promise<string|null>.
 */
let tokenGetter = () => Promise.resolve(null);

export function setTokenGetter(fn) {
  tokenGetter = fn;
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = await tokenGetter();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.msg || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null) q.set(k, v); });
  const str = q.toString();
  return str ? `?${str}` : "";
}

export const api = {
  // Auth
  syncUser: (body) => request("POST", "/auth/sync", body),
  me: () => request("GET", "/auth/me"),
  getInstitutions: () => request("GET", "/auth/institutions"),
  getApprovalRequests: () => request("GET", "/auth/requests"),
  approveRequest: (id) => request("POST", `/auth/requests/${id}/approve`),
  getUsers: (params = {}) => request("GET", `/auth/users${buildQuery(params)}`),
  provisionUser: (body) => request("POST", "/auth/provision", body),
  assignUserRole: (id, body) => request("POST", `/auth/users/${id}/assign-role`, body),

  // Batches  — returns { data, total, page, limit, totalPages }
  createBatch: (body) => request("POST", "/batches", body),
  getBatches: ({ page = 1, limit = 10 } = {}) => request("GET", `/batches${buildQuery({ page, limit })}`),
  generateInvite: (id) => request("POST", `/batches/${id}/invite`),
  joinBatchById: (id) => request("POST", `/batches/${id}/join`),
  joinBatchByToken: (token) => request("POST", "/batches/join-by-token", { token }),
  getBatchSummary: (id) => request("GET", `/batches/${id}/summary`),

  // Sessions — returns { data, total, page, limit, totalPages }
  createSession: (body) => request("POST", "/sessions", body),
  getSessions: ({ page = 1, limit = 10 } = {}) => request("GET", `/sessions${buildQuery({ page, limit })}`),
  getSessionAttendance: (id, { page = 1, limit = 10 } = {}) =>
    request("GET", `/sessions/${id}/attendance${buildQuery({ page, limit })}`),

  // Attendance
  markAttendance: (body) => request("POST", "/attendance/mark", body),

  // Institution — returns { institution, batches: { data, ... }, trainers: { data, ... }, stats }
  getInstitutionSummary: (id, { page = 1, limit = 10 } = {}) =>
    request("GET", `/institutions/${id}/summary${buildQuery({ page, limit })}`),

  // Programme — returns { stats, institutions: { data, total, ... } }
  getProgrammeSummary: ({ page = 1, limit = 10 } = {}) =>
    request("GET", `/programme/summary${buildQuery({ page, limit })}`),
};

