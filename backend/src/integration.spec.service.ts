export interface IntegrationInterface {
  get?(lat: number, lon: number): Promise<any>;
  directions?(start: { lat: number, lon: number }, end: { lat: number, lon: number }): Promise<any>;
}
