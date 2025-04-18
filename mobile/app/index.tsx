import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocation } from '../src/context/LocationContext';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { 
    notifications, 
    isTracking, 
    isLoading,
    startTracking, 
    stopTracking, 
    clearNotifications, 
    lastLocation
  } = useLocation();
  const [locationName, setLocationName] = useState<string>('No location yet');

  // Reverse geocode the last location to get a human-readable address
  useEffect(() => {
    if (lastLocation) {
      (async () => {
        try {
          const result = await Location.reverseGeocodeAsync(lastLocation.coords);
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
  }, [lastLocation]);

  const handleStartTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to track your location.');
        return;
      }
      await startTracking();
    } catch (error) {
      console.error('Start tracking error:', error);
      // Error is already handled in the context
    }
  };

  const handleStopTracking = async () => {
    try {
      await stopTracking();
    } catch (error) {
      console.error('Stop tracking error:', error);
      // Error is already handled in the context
    }
  };

  const handleClearNotifications = async () => {
    try {
      await clearNotifications();
    } catch (error) {
      console.error('Clear notifications error:', error);
      // Error is already handled in the context
    }
  };

  // Define colors for dark theme
  const backgroundColor = '#000000';
  const textColor = '#FFFFFF';
  const cardBackground = '#1A1A1A';
  const buttonBackground = '#1A1A1A';
  const buttonTextColor = '#FFFFFF';
  const startTrackingColor = '#4CAF50';
  const stopTrackingColor = '#F44336';
  const clearNotificationsColor = '#2196F3';
  const cardBorderColor = '#2A2A2A';
  const locationCardBorderColor = '#FFA500'; // Darker yellow (Orange) for location card

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            { 
              backgroundColor: buttonBackground,
              borderColor: isTracking ? stopTrackingColor : startTrackingColor
            }
          ]}
          onPress={isTracking ? handleStopTracking : handleStartTracking}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={buttonTextColor} />
          ) : (
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonBackground, borderColor: clearNotificationsColor }]}
          onPress={handleClearNotifications}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={buttonTextColor} />
          ) : (
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>Clear Notifications</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { 
        backgroundColor: cardBackground, 
        borderColor: locationCardBorderColor,
        borderWidth: 2,
        shadowColor: locationCardBorderColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5
      }]}>
        <Text
          style={[
            styles.locationText,
            { 
              color: textColor,
              fontSize: 18
            }
          ]}
        >
          <Text style={{ fontWeight: 'bold' }}>Last Location:</Text> {locationName}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => {
          // Create a stable key using the identifier and timestamp
          const identifier = item.request.identifier || '';
          const timestamp = item.date || Date.now();
          return `${identifier}-${timestamp}`;
        }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorderColor }]}>
            <View style={styles.notificationItem}>
              <Text style={[styles.notificationTitle, { color: textColor }]}>
                {item.request.content.title}
              </Text>
              <Text style={[styles.notificationBody, { color: textColor }]}>
                {item.request.content.body}
              </Text>
              <Text style={[styles.notificationTime, { color: textColor }]}>
                {new Date(item.date).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorderColor }]}>
            <Text style={[styles.emptyText, { color: textColor }]}>
              No notifications yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
    paddingHorizontal: 10,
    gap: 10,
  },
  button: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationItem: {
    padding: 16,
  },
  notificationTitle: {
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationBody: {
    textAlign: 'left',
  },
  notificationTime: {
    textAlign: 'right',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  locationText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 16,
    fontStyle: 'italic',
  }
});