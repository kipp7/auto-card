import axios, { AxiosError } from 'axios';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type ApiError = {
  code: number;
  message: string;
};

function getToken(): string {
  return localStorage.getItem('adminToken') || '';
}

const http = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiResponse<unknown>;
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data;
      return Promise.reject({ code: body.code, message: body.message } satisfies ApiError);
    }
    return resp.data;
  },
  (err: AxiosError) => {
    const code = err.response?.status || 500;
    const data = err.response?.data as any;
    if (data && typeof data.code === 'number') return Promise.reject({ code: data.code, message: data.message } satisfies ApiError);
    return Promise.reject({ code, message: '请求失败' } satisfies ApiError);
  },
);

export default http;

