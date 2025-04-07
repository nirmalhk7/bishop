import React from 'react';
import { ExpoRoot } from 'expo-router';
import { LocationProvider } from './src/context/LocationContext';

// Create the root component
export default function App() {
  const ctx = require.context('./app');
  
  return (
    <LocationProvider>
      <ExpoRoot context={ctx} />
    </LocationProvider>
  );
} 