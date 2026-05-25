import { toast } from 'sonner'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const resp = await fetch(`${BASE}${url}`, { ...options, headers })

  if (resp.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/auth'
    throw new Error('unauthorized')
  }

  const body = await resp.json()
  if (body.code !== 200) {
    if (body.code === 1401) {
      localStorage.removeItem('token')
      window.location.href = '/auth'
      throw new Error('unauthorized')
    }
    toast.error(body.message || '请求失败')
    throw new Error(body.message)
  }
  return body.data as T
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) =>
    request<T>(url, {
      method: 'POST',
      body: formData,
    }),
}
