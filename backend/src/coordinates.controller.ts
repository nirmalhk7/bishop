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
const dayjs = require('dayjs');

interface HTTPPredictionI {
  body: { latitude: number; longitude: number; no_predict?: boolean };
}

console.log(111, String(process.env.COORDINATES_CRON));

@Controller('/coordinates')
export class CoordinatesController {
  private MODEL_URL;

  private log = new Logger(CoordinatesController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly integrationMgmtService: IntegrationMgmtService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    // TODO Replace this with .env value
    this.MODEL_URL = process.env.MODEL_BACKEND;

    const jobs = new CronJob(
      process.env.COORDINATES_CRON || CronExpression.EVERY_5_MINUTES,
      () => {
        this.handleCron().catch((err) => this.log.error(err));
      },
    );

    schedulerRegistry.addCronJob('SEND_NOTIFICATION', jobs);

    jobs.start();
  }

  async handleCron() {
    this.log.log('Running scheduled task to fetch coordinates.');
    return this.httpService.axiosRef
      .get(`${this.MODEL_URL}/model/coordinates`)
      .then((current) => {
        const predictedPayload: {
          timestamp: string;
          current_lat: number;
          current_long: number;
        }[] = [];
        const now = dayjs();
        const current_coord: Coordinates = {
          lat: parseFloat(current.data[0].coordinates.split(' ')[0]),
          lon: parseFloat(current.data[0].coordinates.split(' ')[1]),
        };

        predictedPayload.push(
          {
            timestamp: now.add(30, 'minute').toISOString(),
            current_lat: current_coord.lat,
            current_long: current_coord.lon,
          },
          {
            timestamp: now.add(1, 'hour').toISOString(),
            current_lat: current_coord.lat,
            current_long: current_coord.lon,
          },
          {
            timestamp: now.add(2, 'hour').toISOString(),
            current_lat: current_coord.lat,
            current_long: current_coord.lon,
          },
        );
        return predictedPayload;
      }).then((predictedPayload) => {
        return this.httpService.axiosRef.request({
          url: `${this.MODEL_URL}/model/coordinates/predict`,
          method: 'get',
          data: predictedPayload
        }).then(payload=>{
          const predicted_coordinates= payload.data
          predicted_coordinates.map(predicted_coordinate=>{
            
          })
        })

      });

    return Promise.all([
      this.httpService.axiosRef.request({
        method: `${this.MODEL_URL}/model/coordinates/predict`,
      }),
      this.httpService.axiosRef.get(`${this.MODEL_URL}/model/coordinates`),
    ])
      .then(([resp1, resp2]) => {
        this.log.log(`Current coordninates ${resp1.data}`);
        const current: Coordinates = {
          lat: parseFloat(resp2.data[0].split(' ')[0]),
          lon: parseFloat(resp2.data[0].split(' ')[1]),
        };

        const predicted: Coordinates = {
          lat: resp1.data.predicted_lat,
          lon: resp1.data.predicted_long,
        };

        return this.integrationMgmtService.runSvcs(current, predict);
      })
      .catch((err) => this.log.error(err.message));
  }

  @Post('/')
  runPrediction(@Req() req: Request<HTTPPredictionI>, @Res() res: Response) {
    const currentCoordinates = {
      lat: req.body.latitude,
      lon: req.body.longitude,
    };

    return this.httpService.axiosRef
      .post(`${this.MODEL_URL}/model/coordinates`, {
        latitude: currentCoordinates.lat,
        longitude: currentCoordinates.lon,
      })
      .then(() => res.status(200).json({ data: 'Coordinates recorded' }))
      .catch((err) => {
        this.log.error(err);
        return res
          .status(500)
          .json({ error: 'An error occurred while processing the request.' });
      });
  }
}
