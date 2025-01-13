import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import ErrorBoundary from '../ErrorBoundary';
import 'react-native-web/dist/cjs/exports/StyleSheet/initialRules.js';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
); 