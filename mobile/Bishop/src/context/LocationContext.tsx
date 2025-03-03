import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { BACKGROUND_TASK_NAME } from '../tasks/backgroundLocationTask';

interface LocationContextType {
  notifications: Notifications.Notification[];
  userId: string | null;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  lastLocation: Location.LocationObject | null;
}

const LocationContext = createContext<LocationContextType>({
  notifications: [],
  userId: null,
  isTracking: false,
  startTracking: async () => {},
  stopTracking: async () => {},
  clearNotifications: async () => {},
  lastLocation: null,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notifications.Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);

  // On mount, load stored notifications, userId, and request permissions
  useEffect(() => {
    const initialize = async () => {
      await loadNotifications();
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) setUserId(storedUserId);
      await setupNotifications();
    };
    initialize();
  }, []);

  // NEW: Request permissions immediately when the app loads
  useEffect(() => {
    requestPermissions();
  }, []);

  /**
   * Requests foreground + background location permissions,
   * as well as notification permissions.
   * Returns true if both location permissions are granted, false otherwise.
   */
  const requestPermissions = async (): Promise<boolean> => {
    // 1. Request foreground location
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== Location.PermissionStatus.GRANTED) {
      Alert.alert('Location Permission Required', 'Bishop needs location access.');
      return false;
    }

    // 2. Request background location
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== Location.PermissionStatus.GRANTED) {
      Alert.alert('Background Permission Required', 'Bishop needs background location access.');
      return false;
    }

    // 3. Request notification permissions
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    if (notifStatus !== 'granted') {
      Alert.alert('Notifications Permission Required', 'Please enable notifications.');
    }

    return true;
  };

  /**
   * Starts background + foreground location tracking.
   */
  const startTracking = async () => {
    const hasLocationPermission = await requestPermissions();
    if (!hasLocationPermission) return;

    try {
      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 100,
        deferredUpdatesInterval: 300000, // 5 minutes
        deferredUpdatesDistance: 500,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Bishop Tracking',
          notificationBody: 'Location tracking is active',
        },
      });

      // Also watch location in foreground
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 100 },
        async (location) => {
          setLastLocation(location);
          await handleLocationUpdate(location);
        }
      );

      setIsTracking(true);
      console.log('Location tracking started');
    } catch (error) {
      console.error('Failed to start tracking:', error);
      Alert.alert('Tracking Error', 'Failed to start location tracking.');
    }
  };

  /**
   * Stops background location tracking.
   */
  const stopTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
      setIsTracking(false);
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  };

  /**
   * Called for each foreground location update.
   */
  const handleLocationUpdate = async (location: Location.LocationObject) => {
    try {
      // Save last known location in AsyncStorage
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(location));

      // Optionally send to your backend
      if (userId) {
        await axios.post('YOUR_BACKEND_ENDPOINT/locations', {
          userId,
          coords: location.coords,
          timestamp: new Date().toISOString(),
        });
      }
      console.log("Foreground location update:", location);
    } catch (error) {
      console.error('Location update failed:', error);
    }
  };

  /**
   * Set up push notifications, get push token, and listen for incoming notifications.
   */
  const setupNotifications = async () => {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);

      if (userId) {
        await axios.post('YOUR_BACKEND_ENDPOINT/register-device', {
          userId,
          token,
        });
      }

      Notifications.addNotificationReceivedListener(handleNewNotification);
    } catch (error) {
      console.error('Notification setup failed:', error);
    }
  };

  /**
   * Handle incoming notifications, storing them in local state + AsyncStorage.
   */
  const handleNewNotification = (notification: Notifications.Notification) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev];
      AsyncStorage.setItem('notifications', JSON.stringify(updated)).catch((err) =>
        console.error('Failed to save notifications:', err)
      );
      return updated;
    });
  };

  /**
   * Load notifications from AsyncStorage on startup.
   */
  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  /**
   * Clear notifications from local state + AsyncStorage.
   */
  const clearNotifications = async () => {
    try {
      await AsyncStorage.removeItem('notifications');
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        notifications,
        userId,
        isTracking,
        startTracking,
        stopTracking,
        clearNotifications,
        lastLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};