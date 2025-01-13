import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Pressable,
  TextInput, 
  ScrollView, 
  Alert, 
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  Vibration,
  Dimensions,
  Image
} from 'react-native';
import { 
  ref, 
  onValue, 
  set, 
  get, 
  off,
  update,
  remove
} from 'firebase/database';
import { debounce } from 'lodash';
import { database } from './firebase';
import { THEME } from './theme';
import AoeControls from './components/AoeControls';
import { AOE_TYPES, AOE_SIZES, calculateAffectedCells } from './aoeConstants';

// Constants
const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ffffff'];
const GRID_SIZE = 10;
const ABILITY_SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const App = () => {
  const [tokens, setTokens] = useState({});
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleCellPress = useCallback((position) => {
    const existingToken = Object.values(tokens).find(token => token.position === position);
    if (existingToken) {
      setSelectedToken(existingToken);
      setShowTokenModal(true);
    } else {
      const newToken = {
        id: Date.now().toString(),
        position,
        color: selectedColor,
        name: 'Token',
        hp: 10,
        maxHp: 10,
        ac: 10
      };
      setTokens(prev => ({ ...prev, [newToken.id]: newToken }));
    }
  }, [tokens, selectedColor]);

  return (
    <SafeAreaView style={styles.container}>
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
                >
                  {token && (
                    <View style={styles.tokenContent}>
                      <Text style={styles.tokenText}>{token.name}</Text>
                      <Text style={styles.tokenHp}>HP: {token.hp}/{token.maxHp}</Text>
                      <Text style={styles.tokenHp}>AC: {token.ac}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

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
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
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
});

export default App; 