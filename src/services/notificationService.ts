import api from "./api";

export interface NotificationItem {
  _id: string;
  id?: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntity?: {
    entityType: 'leave' | 'attendance' | 'reimbursement' | 'announcement' | 'schedule' | 'other';
    entityId: string;
  };
  isRead: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const notificationService = {
  getNotifications: async (params: { page?: number; limit?: number; isRead?: boolean } = {}): Promise<NotificationListResponse> => {
    const response = await api.get<ApiResponse<NotificationListResponse>>("/notifications", {
      params,
    });
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count");
    return response.data.data.unreadCount;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },

  getAdminSSOToken: async (): Promise<{ ssoToken: string }> => {
    const response = await api.post<ApiResponse<{ ssoToken: string }>>("/auth/sso-token");
    return response.data.data;
  },
};
