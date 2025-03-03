import React from 'react';
import { Slot } from 'expo-router';
import { LocationProvider } from '../src/context/LocationContext';

export default function Layout() {
  return (
    <LocationProvider>
      <Slot />
    </LocationProvider>
  );
}