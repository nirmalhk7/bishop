import * as TaskManager from 'expo-task-manager';
import { LocationObject } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const BACKGROUND_TASK_NAME = 'bishop-background-tracking';

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: LocationObject[] };
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        for (const location of locations) {
          const payload = {
            userId,
            coords: location.coords,
            timestamp: new Date(location.timestamp).toISOString(),
          };
          console.log('📍 Background Location Payload:', payload);
          await axios.post('YOUR_BACKEND_ENDPOINT/locations', payload);
        }
      }
    } catch (err) {
      console.error('Error sending background location data:', err);
    }
  }
});