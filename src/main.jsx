import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry } from 'react-native-web';
import App from './App';

// Register the app
AppRegistry.registerComponent('App', () => App);

// Initialize the app
AppRegistry.runApplication('App', {
  rootTag: document.getElementById('root')
}); 