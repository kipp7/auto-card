import http from './http';

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  userId: number;
  username: string;
  token: string;
};

export type MeResponse = {
  userId: number;
  username: string;
};

export function login(data: LoginRequest): Promise<LoginResponse> {
  return http.post('/api/b/auth/login', data);
}

export function me(): Promise<MeResponse> {
  return http.get('/api/b/auth/me');
}

