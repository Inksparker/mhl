import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// In production, set VITE_API_URL to your backend URL + /api (e.g., https://api.yourdomain.com/api)
// In development, the Vite proxy handles /api -> localhost:4000
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Track refresh state to avoid multiple simultaneous refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
}

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── Auth API ────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    orgId: string;
    companyId?: string;
  };
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) => api.post<AuthResponse>('/auth/register', payload),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
};

// ─── Files API ───────────────────────────────────────────────────────

export interface FileInfo {
  id: string;
  filename: string;
  mime_type: string;
  original_size: number;
  encrypted_size: number;
  synced: boolean;
  tags: string[];
  folder: string | null;
  created_at: string;
}

export interface FilesListResponse {
  files: FileInfo[];
  total: number;
}

export const filesApi = {
  list: (orgId: string, params?: Record<string, string>) =>
    api.get<FilesListResponse>(`/storage/${orgId}/files`, { params }),
  upload: (orgId: string, formData: FormData) =>
    api.post(`/storage/${orgId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (orgId: string, fileId: string) =>
    api.get(`/storage/${orgId}/files/${fileId}`, { responseType: 'blob' }),
  getInfo: (orgId: string, fileId: string) =>
    api.get(`/storage/${orgId}/files/${fileId}/info`),
  delete: (orgId: string, fileId: string) =>
    api.delete(`/storage/${orgId}/files/${fileId}`),
  folders: (orgId: string, companyId?: string) =>
    api.get<{ folders: { folder: string; file_count: number }[] }>(`/storage/${orgId}/folders`, companyId ? { params: { companyId } } : undefined),
  tags: (orgId: string) =>
    api.get<{ tags: { tag: string; file_count: number }[] }>(`/storage/${orgId}/tags`),
};

// ─── Records API ─────────────────────────────────────────────────────

export interface DataTable {
  id: string;
  name: string;
  slug: string;
  schema: any;
  created_at: string;
}

export interface DataRecord {
  id: string;
  data: any;
  encrypted_data?: string;
  created_at: string;
  updated_at?: string;
}

export const recordsApi = {
  listTables: (orgId: string, companyId?: string) =>
    api.get<{ tables: DataTable[] }>(`/data/${orgId}/tables`, companyId ? { params: { companyId } } : undefined),
  createTable: (orgId: string, payload: { name: string; schema?: any }) =>
    api.post(`/data/${orgId}/tables`, payload),
  listRecords: (orgId: string, tableSlug: string, params?: any) =>
    api.get<{ records: DataRecord[]; total: number }>(`/data/${orgId}/tables/${tableSlug}/records`, { params }),
  createRecord: (orgId: string, tableSlug: string, payload: any) =>
    api.post(`/data/${orgId}/tables/${tableSlug}/records`, payload),
  getRecord: (orgId: string, tableSlug: string, recordId: string) =>
    api.get(`/data/${orgId}/tables/${tableSlug}/records/${recordId}`),
  updateRecord: (orgId: string, tableSlug: string, recordId: string, payload: any) =>
    api.put(`/data/${orgId}/tables/${tableSlug}/records/${recordId}`, payload),
  deleteRecord: (orgId: string, tableSlug: string, recordId: string) =>
    api.delete(`/data/${orgId}/tables/${tableSlug}/records/${recordId}`),
  queryRecords: (orgId: string, payload: any) =>
    api.post(`/data/${orgId}/query`, payload),
};

// ─── Orgs API ────────────────────────────────────────────────────────

export interface OrgInfo {
  id: string;
  name: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface OrgUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId?: string;
  created_at: string;
}

export const orgsApi = {
  getCurrent: () => api.get<{ organization: OrgInfo }>('/orgs/current'),
  update: (payload: { name?: string }) => api.put('/orgs/current', payload),
  listCompanies: (orgId: string) =>
    api.get<{ companies: Company[] }>(`/orgs/${orgId}/companies`),
  createCompany: (orgId: string, payload: { name: string }) =>
    api.post(`/orgs/${orgId}/companies`, payload),
  listUsers: (orgId: string, params?: any) =>
    api.get<{ users: OrgUser[]; total: number }>(`/orgs/${orgId}/users`, { params }),
  createUser: (orgId: string, payload: { email: string; password: string; fullName: string; role?: string; companyId?: string }) =>
    api.post(`/orgs/${orgId}/users`, payload),
  updateUser: (orgId: string, userId: string, payload: { role?: string; companyId?: string | null; isActive?: boolean }) =>
    api.put(`/orgs/${orgId}/users/${userId}`, payload),
  deactivateUser: (orgId: string, userId: string) =>
    api.delete(`/orgs/${orgId}/users/${userId}`),
  getQuota: (orgId: string, companyId?: string) =>
    api.get(`/orgs/${orgId}/quota`, companyId ? { params: { companyId } } : undefined),
  setOrgQuota: (orgId: string, quotaBytes: number) =>
    api.put(`/orgs/${orgId}/quota`, { quotaBytes }),
  setCompanyQuota: (orgId: string, companyId: string, quotaBytes: number) =>
    api.put(`/orgs/${orgId}/companies/${companyId}/quota`, { quotaBytes }),
};
