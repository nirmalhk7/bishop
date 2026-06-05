# Bishop

Bishop is a location-aware assistant split across three services:

- `backend/`: NestJS API for weather, map directions, calendar lookups, AI integrations, and notification dispatch.
- `mobile/`: Expo React Native client that tracks location and surfaces notifications on device.
- `model/`: Python service that reads location data from BigQuery and drives prediction and notification logic.

## What Lives Here

- Location-aware notification workflows
- Calendar-aware routing and travel-time checks
- Weather and geocoding integrations
- Mobile background location collection

## Repository Layout

- `backend/` contains the main API and integration services.
- `mobile/` contains the end-user app.
- `model/` contains the supporting Python service.
- `backend/README.md` and `mobile/README.md` document the subprojects in more detail.
