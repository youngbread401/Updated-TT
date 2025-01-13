import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AOE_TYPES, AOE_SIZES } from '../aoeConstants';
import { THEME } from '../theme';

const AoeControls = ({ aoeMode, selectedAoe, onTypeChange, onSizeChange, onToggle }) => {
  if (!aoeMode) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Area of Effect</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onToggle}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroller}>
        {Object.values(AOE_TYPES).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              selectedAoe.type === type && styles.typeActive
            ]}
            onPress={() => onTypeChange(type)}
          >
            <Text style={styles.buttonText}>{type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeScroller}>
        {AOE_SIZES[selectedAoe.type].map(size => (
          <TouchableOpacity
            key={size}
            style={[
              styles.sizeButton,
              selectedAoe.size === size && styles.sizeActive
            ]}
            onPress={() => onSizeChange(size)}
          >
            <Text style={styles.buttonText}>{size}ft</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: THEME.primary.dark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: THEME.text.primary,
    fontSize: 24,
  },
  typeScroller: {
    marginBottom: 12,
  },
  sizeScroller: {
    marginBottom: 8,
  },
  typeButton: {
    backgroundColor: THEME.primary.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  sizeButton: {
    backgroundColor: THEME.primary.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  typeActive: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  sizeActive: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AoeControls; 