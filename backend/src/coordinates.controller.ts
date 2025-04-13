import { Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ServerResponse } from 'http';

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

  /**
   * Post coordinates to model
   * Get predicted coordinates from model
   */
  @Post('/')
  runPrediction(@Req() req: Request, @Res() res: Response) {
    const latitude= req.body.latitude;
    const longitude= req.body.longitude;

    return this.httpService.axiosRef
      .post(`${this.MODEL_URL}/model/coordinates`, {
        latitude,
        longitude
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
      .then((resp) => {
        // Assuming the response body contains the array of coordinates
        if (!resp || !resp.data) {
          return res
            .status(500)
            .json({ error: 'Invalid response received from the model.' });
        }
        const coordinates = resp.data; 
        // this.googlecalendar.
        
        
      })
      .catch((err) => {
        this.log.error(err);
        return res
          .status(500)
          .json({ error: 'An error occurred while processing the request.' });
      });
  }
}
