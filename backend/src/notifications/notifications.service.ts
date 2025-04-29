import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Notification, NotificationResponse } from './types';
import { firstValueFrom } from 'rxjs';

export interface SendNotificationDto {
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  // Store the token in memory
  private expoPushToken: string | null = null;
  private notifications: Notification[] = [];
  private readonly EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly httpService: HttpService) {
    this.logger.log('NotificationsService initialized with Expo Push Notifications');
  }

  /**
   * Register a device for push notifications
   */
  async registerDevice(token: string): Promise<NotificationResponse> {
    if (!token) {
      this.logger.error('No token provided for device registration');
      return { success: false, message: 'No token provided' };
    }

    this.logger.log(`Registering device with token: ${token}`);
    this.expoPushToken = token;
    
    return { 
      success: true, 
      message: `Device registered with token: ${token}` 
    };
  }

  async sendNotification(title: string, body: string): Promise<NotificationResponse> {
    try {
      // Create a notification object with a consistent ID format
      const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const notification: Notification = {
        id: notificationId,
        title,
        body,
        timestamp: new Date().toISOString(),
        delivered: false,
      };

      this.logger.log(`Creating new notification: ${notification.id}`);
      
      // Store the notification in memory
      this.notifications.unshift(notification);

      // Only send the notification if we have a token
      if (this.expoPushToken) {
        // Send the notification using Expo Push API with consistent ID format
        const message = {
          to: this.expoPushToken,
          sound: 'default',
          title: title,
          body: body,
          data: { 
            id: notification.id,
            notificationId: notification.id // Include both formats for compatibility
          },
        };

        this.logger.log(`Sending notification via Expo: ${title} - ${body} to ${this.expoPushToken}`);
        
        try {
          const response = await firstValueFrom(
            this.httpService.post(this.EXPO_API_URL, message)
          );
          this.logger.log('Expo push notification sent successfully');
        } catch (error) {
          this.logger.error('Error sending Expo push notification:', error.message);
          if (error.response) {
            this.logger.error('Error response:', error.response.data);
          }
          // We still return success because we stored the notification locally
        }
      } else {
        this.logger.log('No push token registered, notification stored locally only');
      }

      return {
        success: true,
        notifications: [notification],
      };
    } catch (error) {
      this.logger.error('Error in sendNotification:', error);
      return {
        success: false,
        message: 'Failed to send notification',
      };
    }
  }

  async getPendingNotifications(): Promise<NotificationResponse> {
    this.logger.log(`Getting pending notifications. Total: ${this.notifications.length}`);
    return {
      success: true,
      notifications: this.notifications.filter(n => !n.delivered),
    };
  }

  async markAsDelivered(id: string): Promise<NotificationResponse> {
    this.logger.log(`Marking notification as delivered: ${id}`);
    
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) {
      this.logger.log(`Notification not found: ${id}`);
      return {
        success: false,
        message: 'Notification not found',
      };
    }

    notification.delivered = true;
    return {
      success: true,
      notifications: [notification],
    };
  }
} 