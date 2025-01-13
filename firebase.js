import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBSy8ia6vKnq95_gbO7lnohVbyAQzqBtk4",
  authDomain: "dndcombattracker-572b0.firebaseapp.com",
  databaseURL: "https://dndcombattracker-572b0-default-rtdb.firebaseio.com",
  projectId: "dndcombattracker-572b0",
  storageBucket: "dndcombattracker-572b0.firebasestorage.app",
  messagingSenderId: "812186225431",
  appId: "1:812186225431:web:8da48e238d10db01d14552"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

export const deleteCharacter = async (playerName, characterName, roomCode) => {
  try {    
    // Get current characters list from both locations
    const playerRef = ref(database, `players/${playerName}`);
    const roomPlayerRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
    
    // Get current data
    const playerSnapshot = await get(playerRef);
    const playerData = playerSnapshot.val() || {};
    const currentCharacters = playerData.characters || [];
    
    // Remove the character
    const updatedCharacters = currentCharacters.filter(char => char.name !== characterName);
    
    // Update both locations
    await set(playerRef, {
      ...playerData,
      characters: updatedCharacters,
      lastUpdate: Date.now()
    });
    
    if (roomCode) {
      await set(roomPlayerRef, {
        ...playerData,
        characters: updatedCharacters,
        lastUpdate: Date.now()
      });
    }
    
    return updatedCharacters;
  } catch (error) {
    console.error('Error deleting character:', error);
    throw error;
  }
};