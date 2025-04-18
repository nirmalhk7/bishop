import * as TaskManager from 'expo-task-manager';
import { LocationObject } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BACKGROUND_LOCATION_TASK } from '../config';
import { API_BASE_URL, COORDINATES_API } from '../config';

export const BACKGROUND_TASK_NAME = 'bishop-background-tracking';

export const backgroundLocationTask = async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (!data) {
    console.log('No location data received');
    return;
  }

  const { locations } = data as { locations: any[] };
  if (!locations || !Array.isArray(locations) || locations.length === 0) {
    console.log('No valid locations to process');
    return;
  }

  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      console.log('No user ID found, skipping location update');
      return;
    }

    const validLocations = locations.filter(loc => 
      loc && 
      typeof loc.coords === 'object' && 
      typeof loc.coords.latitude === 'number' && 
      typeof loc.coords.longitude === 'number'
    );

    if (validLocations.length === 0) {
      console.log('No valid locations after filtering');
      return;
    }

    const response = await fetch(`${API_BASE_URL}${COORDINATES_API}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        locations: validLocations.map(loc => ({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send location data: ${response.status}`);
    }

    console.log('Successfully sent location data to backend');
  } catch (error) {
    console.error('Error processing location data:', error);
  }
};