import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert
} from 'react-native';
import { THEME } from '../theme';

const PlayerLogin = ({ onLogin }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleSubmit = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (isCreatingRoom) {
      // Generate a random 6-character room code
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      onLogin(playerName, newRoomCode, true);
    } else {
      if (!roomCode.trim()) {
        Alert.alert('Error', 'Please enter a room code');
        return;
      }
      onLogin(playerName, roomCode, false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>D&D Combat Grid</Text>
      
      <TextInput
        style={styles.input}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="Enter your name"
        placeholderTextColor={THEME.text.secondary}
      />

      {!isCreatingRoom && (
        <TextInput
          style={styles.input}
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase())}
          placeholder="Enter room code"
          placeholderTextColor={THEME.text.secondary}
          maxLength={6}
          autoCapitalize="characters"
        />
      )}

      <TouchableOpacity 
        style={styles.button}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>
          {isCreatingRoom ? 'Create Room' : 'Join Room'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setIsCreatingRoom(!isCreatingRoom)}
      >
        <Text style={styles.toggleText}>
          {isCreatingRoom ? 'Join Existing Room' : 'Create New Room'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.primary.dark,
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    color: THEME.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: THEME.primary.main,
    color: THEME.text.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  button: {
    backgroundColor: THEME.accent.green,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toggleButton: {
    padding: 10,
  },
  toggleText: {
    color: THEME.secondary.main,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PlayerLogin; 