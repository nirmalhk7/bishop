// Configuration file for the Bishop app

// Task names
export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// API endpoints
const DEV_API_URL = 'http://10.0.0.241:3000';
const PROD_API_URL = 'https://my-backend-1016190626463.us-central1.run.app';

export const API_BASE_URL = PROD_API_URL;
export const COORDINATES_API = '/coordinates';
export const NOTIFICATIONS_API = '/notifications';

// Storage keys
export const STORAGE_KEYS = {
  USER_ID: 'userId',
  DEVICE_TOKEN: 'deviceToken',
  NOTIFICATIONS: 'notifications',
  LAST_KNOWN_LOCATION: 'lastKnownLocation',
};

// Notification settings
export const NOTIFICATION_SETTINGS = {
  CHECK_INTERVAL: 15 * 60 * 1000, // 15 minutes in milliseconds
}; 