import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { THEME } from './theme';

const App = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>D&D Combat Grid</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  text: {
    color: THEME.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
  }
});

export default App; 