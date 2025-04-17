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
import { NotificationsService } from './notifications/notifications.service';

class Test {
  get() {
    console.log('EE');
  }
}

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
    private readonly notificationsService: NotificationsService,
  ) {
    this.MODEL_URL = this.configService.get<string>('MODEL_API_URL');
  }

  @Cron('* * * * *') // Runs every minute
  async handleCron() {
    
    this.log.log('Running scheduled task to fetch coordinates.');
    return Promise.all([
      this.httpService.axiosRef.get(
        `${this.MODEL_URL}/model/coordinates/latest`,
      ),
      this.httpService.axiosRef.get(`${this.MODEL_URL}/model/coordinates`),
    ]).then(([resp1, resp2])=>{
      const current: Coordinates= resp1.data;
      const predict: Coordinates= resp2.data;
      return this.integrationMgmtService.runSvcs(current, predict)
    }).catch(err=> this.log.error(err));
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
      .then(() => {
        if (req.body.no_predict === true) {
          res.status(200).json({ data: 'Coordinates recorded' });
          return Promise.resolve(null);
        }
        return this.httpService.axiosRef.get(
          `${this.MODEL_URL}/model/coordinates`,
        );
      })
      .then(async (resp) => {
        if (!resp || !resp.data) {
          this.log.warn('No response from model server, returning current coordinates');
          return res.status(200).json({ currentCoordinates });
        }
        
        const predictedCoordinates = resp.data;
        const settings = this.appService.getSettings();

        if (settings.endpoints && Array.isArray(settings.endpoints)) {
          try {
            const results = await Promise.all(
              settings.endpoints.map(async (endpoint) => {
                const resolvedPath = this.resolveModulePath(endpoint.path);
                const module = await import(resolvedPath);
                const IntegrationClass = module.default;

                if (!IntegrationClass || typeof IntegrationClass !== 'function') {
                  throw new Error(
                    `The module at ${resolvedPath} does not export a valid class.`,
                  );
                }

                const instance: IntegrationInterface = new IntegrationClass();
                const temp = new Test();

                if (endpoint.method == 'get' && typeof instance.get === 'function') {
                  console.log(888, instance, temp);
                  instance.get(
                    predictedCoordinates.lat,
                    predictedCoordinates.long,
                  );
                } else if (
                  endpoint.method == 'directions' &&
                  typeof instance.directions === 'function'
                ) {
                  return instance.directions(
                    currentCoordinates,
                    predictedCoordinates,
                  );
                } else {
                  throw new Error(
                    'The "get" method is not defined on the IntegrationInterface instance.',
                  );
                }
              }),
            );

            this.log.debug(
              `Results from endpoints: ${JSON.stringify(results)}`,
            );
            res.status(200).json({ results });
          } catch (err) {
            this.log.error(`Error loading endpoints: ${err.message}`);
            res.status(200).json({ currentCoordinates });
          }
        } else {
          res.status(200).json({ currentCoordinates });
        }
      })
      .catch((err) => {
        this.log.error(err);
        return res.status(200).json({ currentCoordinates });
      });
  }
}
