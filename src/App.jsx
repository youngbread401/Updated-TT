import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { database } from './firebase';
import { ref, onValue, set, get, remove } from 'firebase/database';
import { THEME } from './theme';
import AoeControls from './components/AoeControls';
import DiceRoller from './components/DiceRoller';
import CharacterSheet from './components/CharacterSheet';
import PlayerLogin from './components/PlayerLogin';
import { AOE_TYPES, AOE_SIZES, calculateAffectedCells } from './aoeConstants';
import EnemySelector from './components/EnemySelector';

// Constants
const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ffffff'];
const GRID_SIZE = 10;

const App = () => {
  // Player and Room State
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [players, setPlayers] = useState({});
  const [isDM, setIsDM] = useState(false);
  const [showPlayerControls, setShowPlayerControls] = useState(false);

  // Game State
  const [tokens, setTokens] = useState({});
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [aoeMode, setAoeMode] = useState(false);
  const [selectedAoe, setSelectedAoe] = useState({
    type: AOE_TYPES.CIRCLE,
    size: AOE_SIZES[AOE_TYPES.CIRCLE][0]
  });
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [characters, setCharacters] = useState({});
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showEnemySelector, setShowEnemySelector] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Handle player login and room management
  const handleLogin = async (name, code, isCreating) => {
    const roomRef = ref(database, `rooms/${code}`);
    
    if (isCreating) {
      // Check if room already exists
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        Alert.alert('Error', 'Room already exists');
        return;
      }

      // Create new room as DM
      await set(roomRef, {
        dm: name,
        players: {
          [name]: {
            isOnline: true,
            lastSeen: new Date().toISOString(),
            isDM: true
          }
        },
        tokens: {},
        characters: {},
        visibility: {},
        notes: {}
      });
      setIsDM(true);
    } else {
      // Check if room exists
      const snapshot = await get(roomRef);
      if (!snapshot.exists()) {
        Alert.alert('Error', 'Room not found');
        return;
      }

      // Join existing room
      const roomData = snapshot.val();
      setIsDM(roomData.dm === name);
      await set(ref(database, `rooms/${code}/players/${name}`), {
        isOnline: true,
        lastSeen: new Date().toISOString(),
        isDM: roomData.dm === name
      });
    }

    setPlayerName(name);
    setRoomCode(code);
    setIsLoggedIn(true);
  };

  // DM-specific functions
  const handleKickPlayer = async (playerToKick) => {
    if (!isDM || playerToKick === playerName) return;

    const playerRef = ref(database, `rooms/${roomCode}/players/${playerToKick}`);
    await remove(playerRef);

    // Also remove their characters
    const charactersToRemove = Object.entries(characters)
      .filter(([_, char]) => char.player === playerToKick)
      .map(([id]) => id);

    if (charactersToRemove.length > 0) {
      const updates = charactersToRemove.reduce((acc, id) => ({
        ...acc,
        [id]: null
      }), {});

      const charactersRef = ref(database, `rooms/${roomCode}/characters`);
      await set(charactersRef, {
        ...characters,
        ...updates
      });
    }
  };

  const handleToggleTokenVisibility = async (tokenId) => {
    if (!isDM) return;

    const visibilityRef = ref(database, `rooms/${roomCode}/visibility/${tokenId}`);
    const currentVisibility = tokens[tokenId]?.isVisible ?? true;
    await set(visibilityRef, !currentVisibility);

    const tokenRef = ref(database, `rooms/${roomCode}/tokens/${tokenId}`);
    await set(tokenRef, {
      ...tokens[tokenId],
      isVisible: !currentVisibility
    });
  };

  const handleAddDMNote = async (note) => {
    if (!isDM) return;

    const notesRef = ref(database, `rooms/${roomCode}/notes`);
    const noteId = Date.now().toString();
    await set(notesRef, {
      ...notes,
      [noteId]: {
        id: noteId,
        text: note,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handleClearBoard = async () => {
    if (!isDM) return;

    Alert.alert(
      'Clear Board',
      'Are you sure you want to remove all tokens from the board?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const tokensRef = ref(database, `rooms/${roomCode}/tokens`);
            await set(tokensRef, {});
          }
        }
      ]
    );
  };

  // Firebase sync
  useEffect(() => {
    if (!isLoggedIn) return;

    const roomRef = ref(database, `rooms/${roomCode}`);
    
    const roomListener = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const visibleTokens = Object.entries(data.tokens || {}).reduce((acc, [id, token]) => {
          if (isDM || token.isVisible || token.createdBy === playerName) {
            acc[id] = token;
          }
          return acc;
        }, {});

        setTokens(visibleTokens);
        setCharacters(data.characters || {});
        setPlayers(data.players || {});
      }
    });

    // Update online status and handle cleanup
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
    set(playerRef, {
      isOnline: true,
      lastSeen: new Date().toISOString(),
      isDM
    });

    const handleBeforeUnload = () => {
      set(playerRef, {
        isOnline: false,
        lastSeen: new Date().toISOString(),
        isDM
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
      roomRef.off('value', roomListener);
    };
  }, [isLoggedIn, roomCode, playerName, isDM]);

  const handleCellPress = useCallback((position) => {
    if (!isLoggedIn) return;

    if (aoeMode) {
      const affectedCells = calculateAffectedCells(position, selectedAoe.type, selectedAoe.size);
      console.log('AoE affected cells:', affectedCells);
      return;
    }

    const existingToken = Object.values(tokens).find(token => token.position === position);
    if (existingToken) {
      setSelectedToken(existingToken);
      setShowTokenModal(true);
    } else if (isDM) {
      setSelectedPosition(position);
      setShowEnemySelector(true);
    } else {
      const newToken = {
        id: Date.now().toString(),
        position,
        color: selectedColor,
        name: 'Token',
        hp: 10,
        maxHp: 10,
        ac: 10,
        conditions: [],
        createdBy: playerName,
        isVisible: true
      };
      
      // Sync to Firebase
      const tokensRef = ref(database, `rooms/${roomCode}/tokens`);
      set(tokensRef, { ...tokens, [newToken.id]: newToken });
    }
  }, [tokens, selectedColor, aoeMode, selectedAoe, isLoggedIn, playerName, roomCode, isDM]);

  const handleTokenUpdate = useCallback((updatedToken) => {
    // Sync to Firebase
    const tokensRef = ref(database, `rooms/${roomCode}/tokens`);
    set(tokensRef, {
      ...tokens,
      [updatedToken.id]: updatedToken
    });
  }, [tokens, roomCode]);

  const handleCharacterUpdate = useCallback((updatedCharacter) => {
    const characterId = updatedCharacter.id || Date.now().toString();
    const newCharacter = { 
      ...updatedCharacter, 
      id: characterId,
      player: playerName 
    };
    
    // Sync to Firebase
    const charactersRef = ref(database, `rooms/${roomCode}/characters`);
    set(charactersRef, {
      ...characters,
      [characterId]: newCharacter
    });
  }, [characters, playerName, roomCode]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <PlayerLogin onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Room Info */}
      <View style={styles.roomInfo}>
        <Text style={styles.roomText}>Room: {roomCode}</Text>
        <Text style={styles.playerText}>
          Playing as: {playerName} {isDM ? '(DM)' : ''}
        </Text>
      </View>

      {/* Players List */}
      <View style={styles.playersList}>
        <TouchableOpacity
          style={styles.playersHeader}
          onPress={() => setShowPlayerControls(!showPlayerControls)}
        >
          <Text style={styles.playersHeaderText}>Players</Text>
          <Text style={styles.expandIcon}>{showPlayerControls ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {showPlayerControls && (
          <ScrollView style={styles.playersScroll}>
            {Object.entries(players).map(([name, data]) => (
              <View 
                key={name} 
                style={[
                  styles.playerItem,
                  { opacity: data.isOnline ? 1 : 0.5 }
                ]}
              >
                <View style={[
                  styles.onlineIndicator,
                  { backgroundColor: data.isOnline ? THEME.accent.green : THEME.text.disabled }
                ]} />
                <Text style={styles.playerName}>
                  {name} {data.isDM ? '(DM)' : ''}
                </Text>
                {isDM && name !== playerName && (
                  <TouchableOpacity
                    style={styles.kickButton}
                    onPress={() => handleKickPlayer(name)}
                  >
                    <Text style={styles.kickButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
              const position = `${rowIndex}-${colIndex}`;
              const token = Object.values(tokens).find(t => t.position === position);
              
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.cell,
                    token && { backgroundColor: token.color }
                  ]}
                  onPress={() => handleCellPress(position)}
                  onLongPress={() => isDM && token && handleToggleTokenVisibility(token.id)}
                >
                  {token && (
                    <View style={[
                      styles.tokenContent,
                      !token.isVisible && isDM && styles.hiddenToken
                    ]}>
                      <Text style={styles.tokenText}>{token.name}</Text>
                      <Text style={styles.tokenHp}>HP: {token.hp}/{token.maxHp}</Text>
                      <Text style={styles.tokenHp}>AC: {token.ac}</Text>
                      {token.conditions?.length > 0 && (
                        <View style={styles.tokenEffects}>
                          {token.conditions.map(condition => (
                            <Text key={condition.id} style={styles.effectIcon}>
                              {condition.icon}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Color Picker */}
        <View style={styles.colorPicker}>
          {COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColor
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, aoeMode && styles.activeButton]} 
            onPress={() => setAoeMode(!aoeMode)}
          >
            <Text style={styles.buttonText}>AoE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => setShowDiceRoller(true)}
          >
            <Text style={styles.buttonText}>Dice</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              setSelectedCharacter(null);
              setShowCharacterSheet(true);
            }}
          >
            <Text style={styles.buttonText}>
              {isDM ? 'NPCs' : 'Character'}
            </Text>
          </TouchableOpacity>

          {isDM && (
            <TouchableOpacity 
              style={styles.button}
              onPress={() => {
                Alert.prompt(
                  'Add DM Note',
                  'Enter your note:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Add', onPress: handleAddDMNote }
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Notes</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AoE Controls */}
      <AoeControls
        aoeMode={aoeMode}
        selectedAoe={selectedAoe}
        onTypeChange={(type) => setSelectedAoe({
          type,
          size: AOE_SIZES[type][0]
        })}
        onSizeChange={(size) => setSelectedAoe(prev => ({ ...prev, size }))}
        onToggle={() => setAoeMode(!aoeMode)}
      />

      {/* Token Modal */}
      <Modal
        visible={showTokenModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedToken && (
              <>
                <TextInput
                  style={styles.input}
                  value={selectedToken.name}
                  onChangeText={(text) => handleTokenUpdate({ ...selectedToken, name: text })}
                  placeholder="Token Name"
                />
                <View style={styles.hpControls}>
                  <TextInput
                    style={styles.input}
                    value={String(selectedToken.hp)}
                    onChangeText={(text) => handleTokenUpdate({ ...selectedToken, hp: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    placeholder="Current HP"
                  />
                  <TextInput
                    style={styles.input}
                    value={String(selectedToken.maxHp)}
                    onChangeText={(text) => handleTokenUpdate({ ...selectedToken, maxHp: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    placeholder="Max HP"
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={String(selectedToken.ac)}
                  onChangeText={(text) => handleTokenUpdate({ ...selectedToken, ac: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="Armor Class"
                />
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: THEME.accent.red }]}
                  onPress={() => {
                    const updatedTokens = { ...tokens };
                    delete updatedTokens[selectedToken.id];
                    setTokens(updatedTokens);
                    setShowTokenModal(false);

                    // Sync to Firebase
                    const tokensRef = ref(database, `rooms/${roomCode}/tokens`);
                    set(tokensRef, updatedTokens);
                  }}
                >
                  <Text style={styles.buttonText}>Remove Token</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Dice Roller Modal */}
      <Modal
        visible={showDiceRoller}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiceRoller(false)}
      >
        <View style={styles.modalOverlay}>
          <DiceRoller onClose={() => setShowDiceRoller(false)} />
        </View>
      </Modal>

      {/* Character Sheet Modal */}
      <Modal
        visible={showCharacterSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCharacterSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <CharacterSheet
            character={selectedCharacter}
            onUpdate={handleCharacterUpdate}
            onClose={() => setShowCharacterSheet(false)}
          />
        </View>
      </Modal>

      {/* Enemy Selector Modal */}
      {isDM && (
        <Modal
          visible={showEnemySelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEnemySelector(false)}
        >
          <View style={styles.modalOverlay}>
            <EnemySelector
              onSelect={(enemy) => {
                if (selectedPosition) {
                  const newToken = {
                    ...enemy,
                    position: selectedPosition,
                    createdBy: playerName,
                    isVisible: false // Enemies start hidden
                  };
                  
                  // Sync to Firebase
                  const tokensRef = ref(database, `rooms/${roomCode}/tokens`);
                  set(tokensRef, { ...tokens, [newToken.id]: newToken });
                }
                setShowEnemySelector(false);
                setSelectedPosition(null);
              }}
              onClose={() => {
                setShowEnemySelector(false);
                setSelectedPosition(null);
              }}
              onClearBoard={handleClearBoard}
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    backgroundColor: THEME.primary.dark,
    padding: 10,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: THEME.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.primary.main,
  },
  tokenContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tokenText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: THEME.text.primary,
  },
  tokenHp: {
    fontSize: 10,
    textAlign: 'center',
    color: THEME.text.primary,
  },
  controls: {
    width: '90%',
    maxWidth: 500,
    marginTop: 20,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: THEME.border.light,
  },
  selectedColor: {
    borderColor: THEME.secondary.main,
    borderWidth: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: THEME.primary.dark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  activeButton: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.primary.light,
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
  },
  input: {
    backgroundColor: THEME.primary.dark,
    color: THEME.text.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  hpControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tokenEffects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 2,
  },
  effectIcon: {
    fontSize: 10,
  },
  roomInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  roomText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerText: {
    color: THEME.text.secondary,
    fontSize: 14,
  },
  playersList: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  playerName: {
    color: THEME.text.primary,
    fontSize: 14,
  },
  playersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  playersHeaderText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandIcon: {
    color: THEME.text.primary,
    fontSize: 12,
    marginLeft: 5,
  },
  playersScroll: {
    maxHeight: 200,
  },
  kickButton: {
    padding: 5,
    marginLeft: 5,
  },
  kickButtonText: {
    color: THEME.accent.red,
    fontSize: 16,
    fontWeight: 'bold',
  },
  hiddenToken: {
    opacity: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});

export default App; 