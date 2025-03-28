import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SplashScreen from 'expo-splash-screen';

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

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {
      /* ignore errors */
    });

    const initialize = async () => {
      // 1. Load local notifications
      await loadNotifications();

      // 2. Retrieve or generate userId
      let storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        storedUserId = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        await AsyncStorage.setItem('userId', storedUserId);
      }
      setUserId(storedUserId);

      // 3. Request all perms, no alerts yet
      const { notifGranted, fgGranted, bgGranted: initBgGranted } =
        await requestAllPermissionsNoAlerts();

      // 4. If background was initially denied, wait & re-check in case user selected “Always”
      let bgGranted = initBgGranted;
      if (!bgGranted && Platform.OS === 'ios') {
        // Wait 3 seconds
        await new Promise((res) => setTimeout(res, 3000)); 
        const reCheck = await Location.getBackgroundPermissionsAsync();
        if (reCheck.status === Location.PermissionStatus.GRANTED) {
          bgGranted = true;
        }
      }

      // 5. Show alerts if something is still denied
      if (!notifGranted) {
        Alert.alert('Notifications Denied', 'Please enable push notifications.');
      }
      if (!fgGranted) {
        Alert.alert('Foreground Location Denied', 'Bishop needs location access.');
      }
      if (!bgGranted && Platform.OS === 'ios') {
        Alert.alert(
          'Background Location Denied',
          'Please enable “Always” in Settings > Privacy > Location Services > Bishop.'
        );
      }

      // 6. If final result is fully granted, set up notifications
      const allGranted = notifGranted && fgGranted && bgGranted;
      setPermissionsGranted(allGranted);
      if (allGranted) {
        await setupNotifications();
      }

      // 7. Mark flow done & hide the splash screen
      setInitDone(true);
      // Hide the system splash
      await SplashScreen.hideAsync().catch(() => {
        /* ignore errors */
      });
    };

    initialize();
  }, []);

  /**
   * Ask for notifications, foreground, background in one pass, no alerts.
   */
  const requestAllPermissionsNoAlerts = async () => {
    const notif = await Notifications.requestPermissionsAsync();
    const notifGranted = notif.status === 'granted';

    const fg = await Location.requestForegroundPermissionsAsync();
    const fgGranted = fg.status === Location.PermissionStatus.GRANTED;

    const bg = await Location.requestBackgroundPermissionsAsync();
    const bgGranted = bg.status === Location.PermissionStatus.GRANTED;

    console.log('Permission statuses =>', {
      notifications: notif.status,
      foreground: fg.status,
      backgroundInitial: bg.status,
      backgroundBoolean: bgGranted,
    });

    return { notifGranted, fgGranted, bgGranted };
  };


  const startTracking = async () => {
    if (!permissionsGranted) {
      console.log('startTracking => blocked, not fully granted');
      return;
    }
    try {
      // Start background location
      await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 100,
        deferredUpdatesInterval: 300000,
        deferredUpdatesDistance: 500,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Bishop Tracking',
          notificationBody: 'Location tracking is active',
        },
      });

      // Foreground watch
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 100 },
        async (loc) => {
          setLastLocation(loc);
          await handleLocationUpdate(loc);
        }
      );
      setIsTracking(true);
      console.log('✅ Start tracking => success');
    } catch (err) {
      console.error('startTracking error =>', err);
      Alert.alert('Tracking Error', 'Failed to start location tracking.');
    }
  };

  const stopTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
      setIsTracking(false);
      console.log('📍 Tracking stopped');
    } catch (error) {
      console.error('stopTracking error =>', error);
    }
  };

  const handleLocationUpdate = async (location: Location.LocationObject) => {
    try {
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(location));
      if (userId) {
        await axios.post('YOUR_BACKEND_ENDPOINT/locations', {
          userId,
          coords: location.coords,
          timestamp: new Date().toISOString(),
        });
      }
      console.log('📍 Foreground location =>', location);
    } catch (err) {
      console.error('handleLocationUpdate error =>', err);
    }
  };

  const setupNotifications = async () => {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📬 Expo Push Token =>', token);

      if (userId) {
        await axios.post('YOUR_BACKEND_ENDPOINT/register-device', {
          userId,
          token,
        });
      }
      Notifications.addNotificationReceivedListener(handleNewNotification);
    } catch (error) {
      console.error('setupNotifications error =>', error);
    }
  };

  const handleNewNotification = (notification: Notifications.Notification) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev];
      AsyncStorage.setItem('notifications', JSON.stringify(updated)).catch((e) =>
        console.error('Failed to save notifications =>', e),
      );
      return updated;
    });
  };

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (err) {
      console.error('loadNotifications error =>', err);
    }
  };

  const clearNotifications = async () => {
    try {
      await AsyncStorage.removeItem('notifications');
      setNotifications([]);
    } catch (err) {
      console.error('clearNotifications error =>', err);
    }
  };

  if (!initDone) {
    return null;
  }

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
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return ctx;
};