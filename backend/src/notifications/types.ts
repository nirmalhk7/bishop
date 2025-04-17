export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  delivered: boolean;
}

export interface NotificationResponse {
  success: boolean;
  notifications?: Notification[];
  message?: string;
}

export interface SendNotificationDto {
  title: string;
  body: string;
}

export interface RegisterDeviceDto {
  token: string;
  body?: string;
} 