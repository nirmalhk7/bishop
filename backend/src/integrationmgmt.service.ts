import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { AppService } from './app.service';
import { IntegrationInterface } from './interfaces/integrations.interface';
import { Coordinates } from './interfaces/global.interface';

@Injectable()
export class IntegrationMgmtService {
  private readonly log = new Logger(IntegrationMgmtService.name);

  constructor(private readonly appService: AppService) {}

  private async loadIntegration(
    endpointPath: string,
  ): Promise<IntegrationInterface> {
    const resolvedPath = this.resolveModulePath(endpointPath);
    try {
      const module = await import(resolvedPath);
      const IntegrationClass = module.default;

      if (typeof IntegrationClass !== 'function') {
        throw new Error(`Invalid export from module at ${resolvedPath}`);
      }

      return new IntegrationClass();
    } catch (error) {
      this.log.error(
        `Failed to load integration from ${resolvedPath}: ${error.message}`,
      );
      throw error;
    }
  }

  private resolveModulePath(endpointPath: string): string {
    const basePath =
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, '..', '..', 'src')
        : __dirname;
    return path.resolve(basePath, endpointPath);
  }

  async runSvcs(
    currentCoordinates: Coordinates,
    predictedCoordinates: Coordinates,
  ) {
    const settings = this.appService.getSettings();
    const endpoints = settings?.endpoints;

    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      this.log.warn('No endpoints configured.');
      return null;
    }

    try {
      // Create an array of promises
      const promises = endpoints.map(async (endpoint) => {
        try {
          const integration = await this.loadIntegration(endpoint.path);
          if (
            endpoint.method === 'get' &&
            typeof integration.get === 'function'
          ) {
            this.log.log(`Executing ${integration.constructor.name}`);
            const value = await integration.get(
              currentCoordinates,
              predictedCoordinates,
            );
            return value;
          } else {
            throw new Error(
              `Unsupported method "${endpoint.method}" or missing implementation.`,
            );
          }
        } catch (error) {
          this.log.error(
            `Error processing endpoint ${endpoint.path}: ${error.message}`,
          );
          throw error;
        } finally {
          this.log.log(`Completed executing integration`);
        }
      });
      
      // Wait for all promises to resolve
      const result = await Promise.all(promises);
      return result;
    } catch (error) {
      this.log.error(`Error loading endpoints: ${error.message}`);
      return null;
    }
  }
}

