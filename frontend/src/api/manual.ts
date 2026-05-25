import { api } from './client'

export interface ManualItem {
  id: string
  product_name: string
  brand: string | null
  model: string | null
  category: string | null
  total_pages: number
  status: string
  created_at: string
}

export interface ManualCreate { product_name: string; brand?: string; model?: string; category?: string }

export interface ImagePageItem {
  id: string
  page_number: number
  minio_path: string
  ocr_status: string
  created_at: string
}

export interface PageResult<T> { list: T[]; total: number; page: number; pageSize: number }

export const manualApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<PageResult<ManualItem>>(`/manuals?page=${page}&pageSize=${pageSize}`),

  create: (data: ManualCreate) => api.post<ManualItem>('/manuals', data),

  detail: (id: string) => api.get<ManualItem>(`/manuals/${id}`),

  update: (id: string, data: Partial<ManualCreate>) => api.put<ManualItem>(`/manuals/${id}`, data),

  remove: (id: string) => api.delete(`/manuals/${id}`),

  uploadPages: (id: string, files: File[]) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return api.upload<ImagePageItem[]>(`/manuals/${id}/pages`, form)
  },

  listPages: (id: string) => api.get<ImagePageItem[]>(`/manuals/${id}/pages`),

  removePage: (manualId: string, pageId: string) => api.delete(`/manuals/${manualId}/pages/${pageId}`),
}
