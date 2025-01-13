import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AOE_TYPES, AOE_SIZES } from '../aoeConstants';
import { THEME } from '../theme';

const AoeControls = ({ aoeMode, selectedAoe, onTypeChange, onSizeChange, onToggle }) => {
  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.section}>
          <Text style={styles.label}>Type:</Text>
          <View style={styles.buttonGroup}>
            {Object.values(AOE_TYPES).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.button,
                  selectedAoe.type === type && styles.selectedButton
                ]}
                onPress={() => onTypeChange(type)}
              >
                <Text style={[
                  styles.buttonText,
                  selectedAoe.type === type && styles.selectedButtonText
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.label}>Size:</Text>
          <View style={styles.buttonGroup}>
            {AOE_SIZES[selectedAoe.type].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.button,
                  selectedAoe.size === size && styles.selectedButton
                ]}
                onPress={() => onSizeChange(size)}
              >
                <Text style={[
                  styles.buttonText,
                  selectedAoe.size === size && styles.selectedButtonText
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.primary.main,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.secondary.main,
  },
  controls: {
    flexDirection: 'column',
    gap: 10,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: THEME.text.primary,
    fontWeight: 'bold',
    minWidth: 50,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  button: {
    backgroundColor: THEME.primary.light,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: THEME.secondary.main,
  },
  selectedButton: {
    backgroundColor: THEME.secondary.main,
  },
  buttonText: {
    color: THEME.text.primary,
  },
  selectedButtonText: {
    color: THEME.text.accent,
    fontWeight: 'bold',
  },
});

export default AoeControls; 