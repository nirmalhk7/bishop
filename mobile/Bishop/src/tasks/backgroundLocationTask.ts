// src/tasks/backgroundLocationTask.ts
import * as TaskManager from 'expo-task-manager';
import { LocationObject } from 'expo-location';

export const BACKGROUND_TASK_NAME = 'bishop-background-tracking';

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: LocationObject[] };
    console.log('Background locations:', locations);
    // Optionally send to backend or store in AsyncStorage here
  }
});