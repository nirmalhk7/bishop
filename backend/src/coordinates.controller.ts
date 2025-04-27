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
import { Cron } from '@nestjs/schedule';

interface HTTPPredictionI {
  body: { latitude: number; longitude: number; no_predict?: boolean };
}

@Controller('/coordinates')
export class CoordinatesController {
  private MODEL_URL;

  private log = new Logger(CoordinatesController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly integrationMgmtService: IntegrationMgmtService,
  ) {
    // TODO Replace this with .env value
    this.MODEL_URL = process.env.MODEL_BACKEND;
  }

  @Cron('*/10 * * * * *') // Runs every 10 seconds
  async handleCron() {
    
    this.log.log('Running scheduled task to fetch coordinates.');
    return Promise.all([
      this.httpService.axiosRef.get(
        `${this.MODEL_URL}`,
      ),
      this.httpService.axiosRef.get(`${this.MODEL_URL}/model/coordinates`),
    ]).then(([resp1, resp2])=>{
      const current: Coordinates= resp1.data;
      const predict: Coordinates= resp2.data;
      return this.integrationMgmtService.runSvcs(current, predict)
    }).catch(err => this.log.error(err.message));
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
      .then(()=>res.status(200).json({ data: 'Coordinates recorded' }))
      .catch((err) => {
        this.log.error(err);
        return res
          .status(500)
          .json({ error: 'An error occurred while processing the request.' });
      });
  }
}
