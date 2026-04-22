const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.msg || "Request failed");
  }
  return data;
}

export const api = {
  // Auth
  signup: (body) => request("POST", "/auth/signup", body),
  login: (body) => request("POST", "/auth/login", body),
  me: () => request("GET", "/auth/me"),

  // Batches
  createBatch: (body) => request("POST", "/batches", body),
  getBatches: () => request("GET", "/batches"),
  generateInvite: (id) => request("POST", `/batches/${id}/invite`),
  joinBatchById: (id) => request("POST", `/batches/${id}/join`),
  joinBatchByToken: (token) => request("POST", "/batches/join-by-token", { token }),
  getBatchSummary: (id) => request("GET", `/batches/${id}/summary`),

  // Sessions
  createSession: (body) => request("POST", "/sessions", body),
  getSessions: () => request("GET", "/sessions"),
  getSessionAttendance: (id) => request("GET", `/sessions/${id}/attendance`),

  // Attendance
  markAttendance: (body) => request("POST", "/attendance/mark", body),

  // Institution
  getInstitutionSummary: (id) => request("GET", `/institutions/${id}/summary`),

  // Programme
  getProgrammeSummary: () => request("GET", "/programme/summary"),
};
