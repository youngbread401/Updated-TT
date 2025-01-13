import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Only run this in browser environment
if (typeof document !== 'undefined') {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} 