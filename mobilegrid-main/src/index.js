import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// Only register for mobile
if (typeof window === 'undefined' || !window.document) {
  registerRootComponent(App);
} 