import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import { useLocation } from '../src/context/LocationContext';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const { notifications, isTracking, startTracking, stopTracking, clearNotifications, lastLocation } = useLocation();
  const [locationName, setLocationName] = useState<string>('No location yet');

  // When lastLocation changes, reverse geocode to get address information.
  useEffect(() => {
    if (lastLocation) {
      (async () => {
        try {
          const [result] = await Location.reverseGeocodeAsync(lastLocation.coords);
          const { street, city, region, country } = result;
          // Compose a location name; adjust formatting as desired.
          const name = [
            street && street.trim(),
            city && city.trim(),
            region && region.trim(),
            country && country.trim()
          ]
            .filter(Boolean)
            .join(', ');
          setLocationName(name || 'Location unknown');
        } catch (error) {
          console.error('Reverse geocode failed:', error);
          setLocationName('Location unknown');
        }
      })();
    }
  }, [lastLocation]);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        {!isTracking ? (
          <Button title="Start Tracking" onPress={startTracking} />
        ) : (
          <Button title="Stop Tracking" onPress={stopTracking} />
        )}
        <Button title="Clear Notifications" onPress={clearNotifications} />
      </View>

      <Text style={styles.locationText}>
        Last Location: {locationName}
      </Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.request.identifier}
        renderItem={({ item }) => (
          <View style={styles.notificationItem}>
            <Text style={styles.title}>{item.request.content.title}</Text>
            <Text>{item.request.content.body}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  notificationItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontWeight: 'bold',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  locationText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    color: '#333',
  },
});