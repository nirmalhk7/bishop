import { Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ServerResponse } from 'http';
import { IntegrationInterface } from './interfaces/integrations.interface';
import { IntegrationMgmtService } from './integrationmgmt.service';
import { Coordinates } from './interfaces/global.interface';
import { AxiosResponse } from 'axios';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NotificationsService } from './notifications/notifications.service';
import { title } from 'process';
import * as dayjs from 'dayjs';

/**
 * Interface for incoming HTTP prediction requests
 */
interface HTTPPredictionRequest {
  body: { 
    latitude: number; 
    longitude: number; 
    no_predict?: boolean 
  };
}

/**
 * Interface for prediction data sent to model
 */
interface PredictionPayload {
  timestamp: string;
  current_lat: number;
  current_long: number;
}

/**
 * Interface for notifications returned from integrations
 */
interface Notification {
  title: string;
  body: string;
}

/**
 * Interface for prediction response from model
 */
interface PredictionResponse {
  predicted_lat: number;
  predicted_long: number;
  timestamp?: string;
}

@Controller('/coordinates')
export class CoordinatesController {
  private readonly MODEL_URL: string;
  private readonly log = new Logger(CoordinatesController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly integrationMgmtService: IntegrationMgmtService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationsService,
  ) {
    this.MODEL_URL = process.env.MODEL_BACKEND || 'http://localhost:5000';

    // Set up scheduled job to periodically fetch and process coordinates
    const cronExpression = process.env.COORDINATES_CRON || CronExpression.EVERY_5_MINUTES;
    const job = new CronJob(
      cronExpression,
      () => {
        this.handleCron().catch((err) => this.log.error(err));
      },
    );

    schedulerRegistry.addCronJob('SEND_NOTIFICATION', job);
    job.start();
    this.log.log(`Scheduled coordinates job with expression: ${cronExpression}`);
  }

  /**
   * Handle the scheduled task to fetch coordinates, make predictions,
   * and send notifications if necessary
   */
  async handleCron(): Promise<void> {
    this.log.log('Running scheduled task to fetch coordinates.');
    
    try {
      // Step 1: Get the last known coordinates
      const current = await this.httpService.axiosRef.get(`${this.MODEL_URL}/model/coordinates/last`);
      
      // Extract current coordinates from response
      const current_coord: Coordinates = {
        lat: parseFloat(current.data[0].coordinates.split(' ')[1]),
        lon: parseFloat(current.data[0].coordinates.split(' ')[0]),
      };
      
      // Step 2: Prepare prediction payload for multiple time intervals
      const now = dayjs();
      const predictedPayload: PredictionPayload[] = [
        {
          timestamp: now.add(30, 'minute').toISOString(),
          current_lat: current_coord.lat,
          current_long: current_coord.lon,
        }
      ];
      
      // Step 3: Send prediction request to model
      const payload = await this.httpService.axiosRef.request({
        url: `${this.MODEL_URL}/model/coordinates/predict`,
        method: 'post',
        data: { prediction_request: predictedPayload },
      });
      
      // Step 4: Process predictions and generate notifications
      const notificationPromises = payload.data.map(async (prediction: PredictionResponse) => {
        const predicted_coordinate: Coordinates = {
          lat: prediction.predicted_lat,
          lon: prediction.predicted_long,
        };
        
        this.log.debug(
          `Predicted coordinates ${predicted_coordinate.lat}, ${predicted_coordinate.lon}`,
        );
        
        // Run integration services to check for notifications
        const notifications = await this.integrationMgmtService.runSvcs(
          current_coord,
          predicted_coordinate,
        );

        // Return the first notification if any were generated
        if (notifications && notifications.length > 0) {
          const firstNotification = notifications[0];
          return {
            title: firstNotification.title,
            body: firstNotification.body,
          } as Notification;
        } 
        
        return null;
      });

      // Wait for all notification checks to complete
      const resolvedNotifications = await Promise.all(notificationPromises);
      
      // Step 5: Send any valid notifications
      resolvedNotifications.forEach((notification) => {
        if (
          notification &&
          typeof notification === 'object' &&
          'title' in notification &&
          'body' in notification
        ) {
          this.notificationService.sendNotification(
            notification.title,
            notification.body,
          );
          this.log.debug(`Sent notification: ${notification.title}`);
        }
      });
      
    } catch (exc) {
      this.log.error(`Error Message: ${exc.message}`);
      this.log.error(`Coordinates processing failed: ${exc.stack}`);
    }
  }

  /**
   * HTTP endpoint to record new coordinates and trigger prediction
   */
  @Post('/')
  async runPrediction(@Req() req: Request<HTTPPredictionRequest>, @Res() res: Response): Promise<Response> {
    const currentCoordinates: Coordinates = {
      lat: req.body.latitude,
      lon: req.body.longitude,
    };

    try {
      await this.httpService.axiosRef.post(`${this.MODEL_URL}/model/coordinates`, {
        latitude: currentCoordinates.lat,
        longitude: currentCoordinates.lon,
      });
      
      return res.status(200).json({ data: 'Coordinates recorded' });
    } catch (err) {
      this.log.error(`Failed to record coordinates: ${err.message}`);
      return res
        .status(500)
        .json({ error: 'An error occurred while processing the request.' });
    }
  }
}