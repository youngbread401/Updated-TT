import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBxcYFPxXGxj7_JrZXAKQrqWxNZg9D7wpE",
  authDomain: "dnd-combat-grid.firebaseapp.com",
  databaseURL: "https://dnd-combat-grid-default-rtdb.firebaseio.com",
  projectId: "dnd-combat-grid",
  storageBucket: "dnd-combat-grid.appspot.com",
  messagingSenderId: "1098455667398",
  appId: "1:1098455667398:web:9e0dd12345678901234567"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app); 