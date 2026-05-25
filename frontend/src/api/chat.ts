import { api } from './client'

export interface ConversationItem {
  id: string
  title: string | null
  created_at: string
}

export interface MessageItem {
  id: string
  role: string
  content: string
  citations: Array<{ id: string; content: string; product_name?: string; page_number?: number }>
  created_at: string
}

export interface CursorResult<T> { list: T[]; nextCursor: string | null; hasMore: boolean; pageSize: number }

export const chatApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<{ list: ConversationItem[]; total: number; page: number; pageSize: number }>(
      `/conversations?page=${page}&pageSize=${pageSize}`
    ),

  create: (title?: string) => api.post<ConversationItem>('/conversations', { title }),

  messages: (convId: string, pageSize = 50, cursor?: string) =>
    api.get<CursorResult<MessageItem>>(
      `/conversations/${convId}/messages?pageSize=${pageSize}${cursor ? `&cursor=${cursor}` : ''}`
    ),

  remove: (convId: string) => api.delete(`/conversations/${convId}`),
}
