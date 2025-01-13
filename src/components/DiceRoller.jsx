import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../theme';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const DiceRoller = ({ onClose }) => {
  const [rolls, setRolls] = useState([]);
  const [selectedDice, setSelectedDice] = useState(20);
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);

  const rollDice = (sides, count = 1) => {
    const results = Array(count).fill(0).map(() => 
      Math.floor(Math.random() * sides) + 1
    );
    
    const newRoll = {
      id: Date.now(),
      dice: sides,
      results,
      total: results.reduce((a, b) => a + b, 0),
      timestamp: new Date().toLocaleTimeString()
    };

    setRolls(prev => [newRoll, ...prev].slice(0, 10));
    return results;
  };

  const handleRoll = () => {
    if (advantage || disadvantage) {
      const roll1 = rollDice(selectedDice)[0];
      const roll2 = rollDice(selectedDice)[0];
      const finalRoll = advantage ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      
      setRolls(prev => [{
        id: Date.now(),
        dice: selectedDice,
        results: [roll1, roll2],
        total: finalRoll,
        advantage,
        disadvantage,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 10));
    } else {
      rollDice(selectedDice);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dice Roller</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.diceContainer}>
        {DICE_TYPES.map(dice => (
          <TouchableOpacity
            key={dice}
            style={[
              styles.diceButton,
              selectedDice === dice && styles.selectedDice
            ]}
            onPress={() => setSelectedDice(dice)}
          >
            <Text style={styles.diceText}>d{dice}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.modifierContainer}>
        <TouchableOpacity
          style={[
            styles.modifierButton,
            advantage && styles.activeModifier
          ]}
          onPress={() => {
            setAdvantage(!advantage);
            setDisadvantage(false);
          }}
        >
          <Text style={styles.modifierText}>Advantage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modifierButton,
            disadvantage && styles.activeModifier
          ]}
          onPress={() => {
            setDisadvantage(!disadvantage);
            setAdvantage(false);
          }}
        >
          <Text style={styles.modifierText}>Disadvantage</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.rollButton}
        onPress={handleRoll}
      >
        <Text style={styles.rollButtonText}>Roll d{selectedDice}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.historyContainer}>
        {rolls.map(roll => (
          <View key={roll.id} style={styles.historyItem}>
            <Text style={styles.historyText}>
              {roll.timestamp} - d{roll.dice}: {roll.results.join(', ')}
              {(roll.advantage || roll.disadvantage) && 
                ` (${roll.advantage ? 'Advantage' : 'Disadvantage'})`
              }
              {roll.results.length > 1 && ' = '}
              <Text style={styles.totalText}>{roll.total}</Text>
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.primary.dark,
    padding: 15,
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    color: THEME.text.primary,
    fontSize: 24,
  },
  diceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  diceButton: {
    backgroundColor: THEME.primary.main,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  selectedDice: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  diceText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  modifierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  modifierButton: {
    backgroundColor: THEME.primary.main,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border.light,
    flex: 0.48,
  },
  activeModifier: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  modifierText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  rollButton: {
    backgroundColor: THEME.accent.green,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  rollButtonText: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  historyContainer: {
    maxHeight: 200,
  },
  historyItem: {
    backgroundColor: THEME.primary.main,
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  historyText: {
    color: THEME.text.primary,
    fontSize: 14,
  },
  totalText: {
    fontWeight: 'bold',
    color: THEME.accent.green,
  },
});

export default DiceRoller; 