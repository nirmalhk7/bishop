import { Coordinates } from "./global.interface";
import { NotificationInterface } from "./notification.interface";

export interface IntegrationInterface {
  get(start: Coordinates, end: Coordinates): Promise<NotificationInterface | null>;
}