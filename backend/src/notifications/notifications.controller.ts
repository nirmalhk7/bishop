import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification, SendNotificationDto, NotificationResponse, RegisterDeviceDto } from './types';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Send a notification
   */
  @Post()
  async sendNotification(@Body() dto: SendNotificationDto): Promise<NotificationResponse> {
    return this.notificationsService.sendNotification(dto.title, dto.body);
  }

  /**
   * Register a device for push notifications
   */
  @Post('register')
  async registerDevice(@Body() dto: RegisterDeviceDto): Promise<NotificationResponse> {
    let token = dto.token;
    
    // If token is not provided directly, try to extract it from the body
    if (!token && dto.body) {
      const match = dto.body.match(/Device registered with token: (.*)/);
      if (match) {
        token = match[1].trim();
      }
    }
    
    if (!token) {
      return {
        success: false,
        message: 'No valid token provided'
      };
    }
    
    return this.notificationsService.registerDevice(token);
  }

  /**
   * Get all pending notifications
   */
  @Get('pending')
  async getPendingNotifications(): Promise<NotificationResponse> {
    return this.notificationsService.getPendingNotifications();
  }

  /**
   * Mark a notification as delivered
   */
  @Post(':id/delivered')
  async markAsDelivered(@Param('id') id: string): Promise<NotificationResponse> {
    return this.notificationsService.markAsDelivered(id);
  }
} 