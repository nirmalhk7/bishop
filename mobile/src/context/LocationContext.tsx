import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SplashScreen from 'expo-splash-screen';
import { BACKGROUND_LOCATION_TASK } from '../config';
import { API_BASE_URL, COORDINATES_API, STORAGE_KEYS } from '../config';
import * as TaskManager from 'expo-task-manager';
import { backgroundLocationTask } from '../tasks/backgroundLocationTask';

interface LocationContextType {
  notifications: Notifications.Notification[];
  userId: string | null;
  isTracking: boolean;
  isLoading: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  lastLocation: Location.LocationObject | null;
  locationName: string;
}

const LocationContext = createContext<LocationContextType>({
  notifications: [],
  userId: null,
  isTracking: false,
  isLoading: false,
  startTracking: async () => {},
  stopTracking: async () => {},
  clearNotifications: async () => {},
  lastLocation: null,
  locationName: 'Location unknown',
});

// Register background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, backgroundLocationTask);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notifications.Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [locationName, setLocationName] = useState('Location unknown');

  const initializationRef = useRef<boolean>(false);
  const notificationListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    
    SplashScreen.preventAutoHideAsync().catch(() => {
      /* ignore errors */
    });

    const initialize = async () => {
      // 1. Load local notifications
      await loadNotifications();

      // 2. Retrieve or generate userId
      let storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (!storedUserId) {
        storedUserId = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, storedUserId);
      }
      setUserId(storedUserId);

      // 3. Request all permissions
      const { notifGranted, fgGranted, bgGranted: initBgGranted } =
        await requestAllPermissionsNoAlerts();

      // 4. If background was initially denied, wait & re-check in case user selected "Always"
      let bgGranted = initBgGranted;
      if (!bgGranted && Platform.OS === 'ios') {
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
          'Please enable "Always" in Settings > Privacy > Location Services > Bishop.'
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
      await SplashScreen.hideAsync().catch(() => {
        /* ignore errors */
      });
    };

    initialize();
  }, []);

  useEffect(() => {
    // Set up notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Set up notification received listener (for when app is in foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotifications(prev => [notification, ...prev]);
    });

    // Set up notification response listener (for when app is in background/closed)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Create a proper Notification object from the response
      const notification: Notifications.Notification = {
        request: {
          content: response.notification.request.content,
          identifier: response.notification.request.identifier,
          trigger: response.notification.request.trigger,
        },
        date: Date.now(),
      };
      setNotifications(prev => [notification, ...prev]);
    });
    
    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      responseListener.remove();
    };
  }, []);

  const requestAllPermissionsNoAlerts = async () => {
    const notif = await Notifications.requestPermissionsAsync();
    const notifGranted = notif.status === 'granted';

    const fg = await Location.requestForegroundPermissionsAsync();
    const fgGranted = fg.status === Location.PermissionStatus.GRANTED;

    const bg = await Location.requestBackgroundPermissionsAsync();
    const bgGranted = bg.status === Location.PermissionStatus.GRANTED;

    return { notifGranted, fgGranted, bgGranted };
  };

  const startTracking = async () => {
    if (!permissionsGranted) {
      console.log('startTracking => blocked, not fully granted');
      return;
    }
    setIsLoading(true);
    try {
      // Start background location
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Location Tracking',
          notificationBody: 'Tracking your location in the background',
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
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const stopTracking = async () => {
    setIsLoading(true);
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      setIsTracking(false);
      console.log('📍 Tracking stopped');
    } catch (error) {
      console.error('stopTracking error =>', error);
      Alert.alert('Error', 'Failed to stop location tracking. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationUpdate = async (location: Location.LocationObject) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_KNOWN_LOCATION, JSON.stringify(location));
      if (userId) {
        const payload = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        console.log('📍 Location Update Payload:', payload);
        await axios.post(`${API_BASE_URL}${COORDINATES_API}`, payload);
      }
    } catch (err) {
      console.error('handleLocationUpdate error =>', err);
    }
  };

  const setupNotifications = async () => {
    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return;
      }
      
      // Get the token
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('Got Expo push token:', token);
      
      // Register the token with the backend
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: token.data }),
        });
        const data = await response.json();
        console.log('Token registration response:', data);
      } catch (error) {
        console.error('Error registering token:', error);
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (err) {
      console.error('loadNotifications error =>', err);
    }
  };

  const clearNotifications = async () => {
    setIsLoading(true);
    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      // Clear from state
      setNotifications([]);
      // Clear all notifications from the notification center
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared successfully');
    } catch (err) {
      console.error('clearNotifications error =>', err);
      Alert.alert('Error', 'Failed to clear notifications. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocode the last location to get a human-readable address
  useEffect(() => {
    if (lastLocation) {
      (async () => {
        try {
          // Check if we have location permissions before attempting reverse geocoding
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Location permission not granted, skipping reverse geocoding');
            setLocationName('Location unknown');
            return;
          }

          const result = await Location.reverseGeocodeAsync({
            latitude: lastLocation.coords.latitude,
            longitude: lastLocation.coords.longitude
          });
          
          if (result && result.length > 0) {
            const location = result[0];
            const parts = [
              location.street,
              location.city,
              location.region,
              location.country
            ].filter(Boolean);
            
            setLocationName(parts.join(', ') || 'Location unknown');
          } else {
            setLocationName('Location unknown');
          }
        } catch (error) {
          console.error('Reverse geocode failed:', error);
          setLocationName('Location unknown');
        }
      })();
    }
  }, [lastLocation?.coords.latitude, lastLocation?.coords.longitude]);

  if (!initDone) {
    return null;
  }

  return (
    <LocationContext.Provider
      value={{
        notifications,
        userId,
        isTracking,
        isLoading,
        startTracking,
        stopTracking,
        clearNotifications,
        lastLocation,
        locationName,
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