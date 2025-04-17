import { Coordinates } from "./global.interface";

export interface IntegrationInterface {
  get(start: Coordinates, end: Coordinates): Promise<any>;
}