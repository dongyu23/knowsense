import { api } from './client'

export interface LoginRequest { username: string; password: string }
export interface RegisterRequest { username: string; email: string; password: string }
export interface TokenData { access_token: string; token_type: string; expires_at: string }
export interface UserInfo { id: string; username: string; email: string }

export const authApi = {
  register: (data: RegisterRequest) => api.post<UserInfo>('/auth/register', data),
  login: (data: LoginRequest) => api.post<TokenData>('/auth/login', data),
  me: () => api.get<UserInfo>('/auth/me'),
}
