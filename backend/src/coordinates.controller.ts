import { Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ServerResponse } from 'http';
import { IntegrationInterface } from './interfaces/integrations.interface';
import requireFromString from 'require-from-string';

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
    private readonly appService: AppService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // TODO Replace this with .env value
    this.MODEL_URL = 'http://localhost:5001';
  }

  private resolveModulePath(endpointPath: string): string {
    const basePath =
      process.env.NODE_ENV === 'production'
        ? require('path').join(__dirname, '..', '..', 'src')
        : require('path').join(__dirname);
    return require('path').resolve(basePath, endpointPath);
  }

  /**
   * Post coordinates to model
   * Get predicted coordinates from model
   */
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
          return Promise.resolve(null); // Ensure the chain returns a Promise
        }
        return this.httpService.axiosRef.get(
          `${this.MODEL_URL}/model/coordinates`,
        );
      })
      .then(async (resp) => {
        // Assuming the response body contains the array of coordinates
        if (!resp || !resp.data) {
          return res
            .status(500)
            .json({ error: 'Invalid response received from the model.' });
        }
        const predictedCoordinates = resp.data;
        const settings = this.appService.getSettings();

        if (settings.endpoints && Array.isArray(settings.endpoints)) {
          try {
            const results = await Promise.all(
              settings.endpoints.map(async (endpoint) => {
                const resolvedPath = this.resolveModulePath(endpoint.path); // Resolve the absolute path
                const module = await import(resolvedPath);
                const IntegrationClass = module.default; // Assuming default export

                if (
                  !IntegrationClass ||
                  typeof IntegrationClass !== 'function'
                ) {
                  throw new Error(
                    `The module at ${resolvedPath} does not export a valid class.`,
                  );
                }

                const instance: IntegrationInterface = new IntegrationClass(); // Create an instance
                const temp= new Test();

                if (
                  endpoint.method == 'get' &&
                  typeof instance.get === 'function'
                ) {
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
            res
              .status(500)
              .json({ error: 'Failed to process integration endpoints.' });
          }
        } else {
          res.status(200).json({ currentCoordinates });
        }
      })
      .catch((err) => {
        this.log.error(err);
        return res
          .status(500)
          .json({ error: 'An error occurred while processing the request.' });
      });
  }
}
