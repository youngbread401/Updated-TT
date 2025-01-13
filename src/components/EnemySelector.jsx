import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  TextInput
} from 'react-native';
import { THEME } from '../theme';

// Predefined enemies with stats
const ENEMY_TEMPLATES = {
  'Goblin': {
    name: 'Goblin',
    hp: 7,
    maxHp: 7,
    ac: 15,
    color: '#2ecc71',
  },
  'Orc': {
    name: 'Orc',
    hp: 15,
    maxHp: 15,
    ac: 13,
    color: '#e74c3c',
  },
  'Skeleton': {
    name: 'Skeleton',
    hp: 13,
    maxHp: 13,
    ac: 13,
    color: '#f1c40f',
  },
  'Zombie': {
    name: 'Zombie',
    hp: 22,
    maxHp: 22,
    ac: 8,
    color: '#9b59b6',
  },
  'Dragon Wyrmling': {
    name: 'Dragon Wyrmling',
    hp: 33,
    maxHp: 33,
    ac: 17,
    color: '#e67e22',
  }
};

const EnemySelector = ({ onSelect, onClose, onClearBoard }) => {
  const [customEnemy, setCustomEnemy] = useState({
    name: '',
    hp: '',
    ac: '',
    color: '#3498db'
  });

  const handleSelectEnemy = (enemy) => {
    onSelect({
      ...enemy,
      id: Date.now().toString(),
      conditions: []
    });
  };

  const handleAddCustom = () => {
    if (!customEnemy.name || !customEnemy.hp || !customEnemy.ac) return;

    handleSelectEnemy({
      name: customEnemy.name,
      hp: parseInt(customEnemy.hp),
      maxHp: parseInt(customEnemy.hp),
      ac: parseInt(customEnemy.ac),
      color: customEnemy.color
    });

    // Reset custom enemy form
    setCustomEnemy({
      name: '',
      hp: '',
      ac: '',
      color: '#3498db'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enemy Selector</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.enemyList}>
        {Object.entries(ENEMY_TEMPLATES).map(([key, enemy]) => (
          <TouchableOpacity
            key={key}
            style={styles.enemyItem}
            onPress={() => handleSelectEnemy(enemy)}
          >
            <View style={[styles.colorIndicator, { backgroundColor: enemy.color }]} />
            <View style={styles.enemyInfo}>
              <Text style={styles.enemyName}>{enemy.name}</Text>
              <Text style={styles.enemyStats}>
                HP: {enemy.hp} | AC: {enemy.ac}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.customEnemyForm}>
        <Text style={styles.sectionTitle}>Add Custom Enemy</Text>
        <TextInput
          style={styles.input}
          value={customEnemy.name}
          onChangeText={(text) => setCustomEnemy(prev => ({ ...prev, name: text }))}
          placeholder="Enemy Name"
          placeholderTextColor={THEME.text.secondary}
        />
        <View style={styles.statsRow}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={customEnemy.hp}
            onChangeText={(text) => setCustomEnemy(prev => ({ ...prev, hp: text }))}
            placeholder="HP"
            keyboardType="numeric"
            placeholderTextColor={THEME.text.secondary}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={customEnemy.ac}
            onChangeText={(text) => setCustomEnemy(prev => ({ ...prev, ac: text }))}
            placeholder="AC"
            keyboardType="numeric"
            placeholderTextColor={THEME.text.secondary}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddCustom}
        >
          <Text style={styles.buttonText}>Add Custom Enemy</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.clearButton]}
        onPress={onClearBoard}
      >
        <Text style={styles.buttonText}>Clear All Tokens</Text>
      </TouchableOpacity>
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
    maxHeight: '90%',
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
  enemyList: {
    maxHeight: 300,
  },
  enemyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary.main,
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  enemyInfo: {
    flex: 1,
  },
  enemyName: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  enemyStats: {
    color: THEME.text.secondary,
    fontSize: 14,
  },
  customEnemyForm: {
    marginTop: 20,
    padding: 15,
    backgroundColor: THEME.primary.main,
    borderRadius: 8,
  },
  sectionTitle: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    backgroundColor: THEME.primary.dark,
    color: THEME.text.primary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: THEME.accent.green,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: THEME.accent.red,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EnemySelector; 