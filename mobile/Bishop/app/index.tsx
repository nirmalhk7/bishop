import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  useColorScheme
} from 'react-native';
import { useLocation } from '../src/context/LocationContext';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const colorScheme = useColorScheme(); // 'light' or 'dark'

  // Destructure location-related logic
  const { notifications, isTracking, startTracking, stopTracking, clearNotifications, lastLocation } = useLocation();
  const [locationName, setLocationName] = useState<string>('No location yet');

  // Reverse geocode the last location to get a human-readable address.
  useEffect(() => {
    if (lastLocation) {
      (async () => {
        try {
          const [result] = await Location.reverseGeocodeAsync(lastLocation.coords);
          const { street, city, region, country } = result;
          const name = [street, city, region, country].filter(Boolean).join(', ');
          setLocationName(name || 'Location unknown');
        } catch (error) {
          console.error('Reverse geocode failed:', error);
          setLocationName('Location unknown');
        }
      })();
    }
  }, [lastLocation]);

  // Define some dynamic colors based on the color scheme
  const backgroundColor = colorScheme === 'dark' ? '#121212' : '#ffffff';
  const textColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const cardBackground = colorScheme === 'dark' ? '#333333' : '#f0f0f0';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.controls}>
        {!isTracking ? (
          <Button title="Start Tracking" onPress={startTracking} />
        ) : (
          <Button title="Stop Tracking" onPress={stopTracking} />
        )}
        <Button title="Clear Notifications" onPress={clearNotifications} />
      </View>

      <Text
        style={[
          styles.locationText,
          { backgroundColor: cardBackground, color: textColor }
        ]}
      >
        Last Location: {locationName}
      </Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.request.identifier}
        renderItem={({ item }) => (
          <View style={[styles.notificationItem, { borderBottomColor: '#888' }]}>
            <Text style={[styles.title, { color: textColor }]}>
              {item.request.content.title}
            </Text>
            <Text style={{ color: textColor }}>
              {item.request.content.body}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: textColor }]}>
            No notifications yet
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20
  },
  notificationItem: {
    padding: 20,
    borderBottomWidth: 1
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  empty: {
    textAlign: 'center',
    marginTop: 20
  },
  locationText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    padding: 10,
    borderRadius: 8
  }
});