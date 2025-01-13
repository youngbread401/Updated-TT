import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { memo } from 'react';
import App from './App';

const WrappedApp = memo(App);
WrappedApp.displayName = 'App';

// Disable React DevTools
if (process.env.NODE_ENV === 'production' || process.env.EXPO_WEB_DEBUG === 'false') {
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
    for (let [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
    }
  }
}

registerRootComponent(WrappedApp);
