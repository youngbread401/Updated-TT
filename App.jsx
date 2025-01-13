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
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { DiceRoller } from './components/DiceModel';
import { database } from './firebase';
import AoeControls from './components/AoeControls';
import { AOE_TYPES, AOE_SIZES, calculateAffectedCells } from './aoeConstants';
import { THEME } from './theme';

// Constants
const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ffffff'];
const GRID_SIZE = 10;
const ABILITY_SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const SKILLS = {
  STR: ['Athletics'],
  DEX: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
  CON: [],
  INT: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
  WIS: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
  CHA: ['Deception', 'Intimidation', 'Performance', 'Persuasion']
};
const CURRENCY = ['CP', 'SP', 'EP', 'GP', 'PP'];
const DICE_TYPES = [
  { sides: 4, color: '#FF6B6B' },
  { sides: 6, color: '#4ECDC4' },
  { sides: 8, color: '#45B7D1' },
  { sides: 10, color: '#96CEB4' },
  { sides: 12, color: '#FFEEAD' },
  { sides: 20, color: '#D4A5A5' },
  { sides: 100, color: '#9B59B6' }
];
const STATUS_EFFECTS = [
  { 
    id: 'blinded', 
    name: 'Blinded', 
    icon: '👁️',
    duration: 0,
    endTrigger: 'endOfTurn', // or 'startOfTurn', 'action', 'save'
    saveDC: 0,
    saveType: '' // 'STR', 'DEX', etc.
  },
  { id: 'charmed', name: 'Charmed', icon: '💕' },
  { id: 'deafened', name: 'Deafened', icon: '👂' },
  { id: 'frightened', name: 'Frightened', icon: '😨' },
  { id: 'grappled', name: 'Grappled', icon: '🤼' },
  { id: 'incapacitated', name: 'Incapacitated', icon: '💫' },
  { id: 'invisible', name: 'Invisible', icon: '👻' },
  { id: 'paralyzed', name: 'Paralyzed', icon: '⚡' },
  { id: 'petrified', name: 'Petrified', icon: '🗿' },
  { id: 'poisoned', name: 'Poisoned', icon: '🤢' },
  { id: 'prone', name: 'Prone', icon: '⬇️' },
  { id: 'restrained', name: 'Restrained', icon: '⛓️' },
  { id: 'stunned', name: 'Stunned', icon: '💫' },
  { id: 'unconscious', name: 'Unconscious', icon: '💤' }
];

// Add near other constants
const BASIC_MONSTERS = {
  // Low CR (0-2)
  bandit: {
    name: "Bandit",
    hp: 11,
    maxHp: 11,
    ac: 12,
    initiativeBonus: 1,
    cr: "1/8",
    type: "Humanoid"
  },
  goblin: {
    name: "Goblin",
    hp: 7,
    maxHp: 7,
    ac: 15,
    initiativeBonus: 2,
    cr: "1/4",
    type: "Humanoid"
  },
  skeleton: {
    name: "Skeleton",
    hp: 13,
    maxHp: 13,
    ac: 13,
    initiativeBonus: 2,
    cr: "1/4",
    type: "Undead"
  },
  wolf: {
    name: "Wolf",
    hp: 11,
    maxHp: 11,
    ac: 13,
    initiativeBonus: 2,
    cr: "1/4",
    type: "Beast"
  },
  orc: {
    name: "Orc",
    hp: 15,
    maxHp: 15,
    ac: 13,
    initiativeBonus: 1,
    cr: "1/2",
    type: "Humanoid"
  },
  wraith: {
    name: "Wraith",
    hp: 67,
    maxHp: 67,
    ac: 13,
    initiativeBonus: 3,
    cr: "5",
    type: "Undead"
  },
  // Medium CR (3-8)
  owlbear: {
    name: "Owlbear",
    hp: 59,
    maxHp: 59,
    ac: 13,
    initiativeBonus: 1,
    cr: "3",
    type: "Monstrosity"
  },
  troll: {
    name: "Troll",
    hp: 84,
    maxHp: 84,
    ac: 15,
    initiativeBonus: 1,
    cr: "5",
    type: "Giant"
  },
  // High CR (9+)
  youngRedDragon: {
    name: "Young Red Dragon",
    hp: 178,
    maxHp: 178,
    ac: 18,
    initiativeBonus: 2,
    cr: "10",
    type: "Dragon"
  },
  adultRedDragon: {
    name: "Adult Red Dragon",
    hp: 256,
    maxHp: 256,
    ac: 19,
    initiativeBonus: 2,
    cr: "17",
    type: "Dragon"
  }
};

// Add near other constants
const COMBAT_STATUSES = {
  SURPRISED: 'SURPRISED',
  READY: 'READY',
  DELAYED: 'DELAYED'
};

// Add near other constants
const CONDITION_DURATIONS = {
  INSTANTANEOUS: 'INSTANTANEOUS',
  ONE_ROUND: '1_ROUND',
  ONE_MINUTE: '1_MINUTE',
  TEN_MINUTES: '10_MINUTES',
  ONE_HOUR: '1_HOUR',
  EIGHT_HOURS: '8_HOURS',
  UNTIL_DISPELLED: 'UNTIL_DISPELLED'
};

// Add near other constants
const SAVE_TYPES = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma'
};

// Add near other constants
const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force',
  'lightning', 'necrotic', 'piercing', 'poison',
  'psychic', 'radiant', 'slashing', 'thunder'
];

// Instead, add a simple constant for initial sizing
const initialWindowDimensions = Dimensions.get('window');
const initialIsSmallScreen = initialWindowDimensions.width < 768;

// Add new styles for the header
const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: THEME.primary.dark,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.medium,
  },
  content: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  titleText: {
    color: THEME.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.select({ web: 'Cinzel, serif', default: 'System' }),
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  buttonActive: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    fontSize: 16,
    color: THEME.text.primary,
  },
  roomInfo: {
    backgroundColor: THEME.primary.light,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  roomText: {
    color: THEME.text.secondary,
    fontSize: 12,
  },
  dmBadge: {
    backgroundColor: THEME.secondary.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  dmBadgeText: {
    color: THEME.text.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Add main content styles after headerStyles
const mainStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary.main,
  },
  content: {
    flex: 1,
  },
  contentWrapper: {
    flexDirection: initialIsSmallScreen ? 'column' : 'row',
    maxWidth: 1600, // Increased to give more room
    marginHorizontal: 'auto',
    width: '100%',
    padding: 20,
    gap: 20,
  },
  toolsSection: {
    width: initialIsSmallScreen ? '100%' : 250, // Fixed width instead of flex
    minWidth: 250,
  },
  gridSection: {
    flex: 2, // Grid takes up more space
    backgroundColor: THEME.primary.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border.medium,
    overflow: 'hidden',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.medium,
    backgroundColor: THEME.primary.accent,
  },
  sectionTitle: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  gridControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: THEME.primary.main,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  controlIcon: {
    color: THEME.text.primary,
    fontSize: 16,
  },
});

// Add grid styles after mainStyles
const gridStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary.light,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: THEME.primary.accent,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.medium,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: THEME.primary.dark,
    borderRadius: 8,
  },
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border.light,
  },
  colorButtonSelected: {
    borderColor: THEME.secondary.main,
    borderWidth: 3,
  },
  gridContent: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: THEME.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.primary.dark,
  },
  cellActive: {
    borderColor: THEME.secondary.main,
    borderWidth: 2,
  },
  tokenContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tokenName: {
    fontSize: 11,  // Slightly smaller font
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 1,  // Reduced margin
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tokenStats: {
    fontSize: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 12,  // Add this to reduce vertical spacing
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border.medium,
  },
  leftPanel: {
    width: 250,
    marginRight: 16,
    display: initialIsSmallScreen ? 'none' : 'flex',
  },
});

// Add tools styles after gridStyles
const toolStyles = StyleSheet.create({
  panel: {
    backgroundColor: THEME.primary.light,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border.medium,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: THEME.primary.accent,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.medium,
  },
  title: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.secondary.main,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.secondary.light,
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    fontSize: 16,
    color: THEME.text.primary,
  }
});

// Add character panel styles after toolStyles
const characterStyles = StyleSheet.create({
  panel: {
    backgroundColor: THEME.primary.light,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: THEME.primary.dark,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  cardContent: {
    gap: 12,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: THEME.primary.accent,
    borderRadius: 6,
    padding: 12,
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: THEME.text.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 24,
    color: THEME.text.secondary,
    marginBottom: 12,
  },
  emptyText: {
    color: THEME.text.secondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  }
});

// Initial game state
const initialGameState = {
  tokens: {},
  layers: {
    grid: true,
    terrain: {},
    tokens: {},
    effects: {},
    fog: {}
  },
  initiative: [],
  inCombat: false,
  currentTurn: 0,
  settings: {
    gridSize: GRID_SIZE,
    showCoordinates: true,
  },
  partyLoot: {
    currency: { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 },
    items: [],
    currentViewer: null
  },
  characters: [],
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary.main,
    height: '100%',
    width: '100%',
  },
  header: {
    padding: initialIsSmallScreen ? 10 : 20,
    backgroundColor: THEME.primary.accent,
    width: '100%',
  },
  title: {
    fontSize: initialIsSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    color: THEME.text.primary,
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: initialIsSmallScreen ? 'center' : 'flex-start',
  },
  controlButton: {
    padding: initialIsSmallScreen ? 8 : 10,
    borderRadius: 5,
    minWidth: initialIsSmallScreen ? 80 : 100,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  mainArea: {
    flex: 1,
    flexDirection: initialIsSmallScreen ? 'column' : 'row',
    padding: initialIsSmallScreen ? 10 : 20,
    gap: 20,
    minHeight: '100%',
  },
  gridSection: {
    flex: 1,
    minHeight: initialIsSmallScreen ? 400 : '100%',
  },
  sidebar: {
    width: initialIsSmallScreen ? '100%' : 350,
    flexShrink: 0,
  },
  gridContainer: {
    backgroundColor: THEME.primary.dark,
    borderRadius: 8,
    padding: 10,
    alignSelf: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: THEME.primary.light,
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: initialIsSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: THEME.text.primary,
    marginBottom: 15,
  },
  input: {
    backgroundColor: THEME.primary.dark,
    color: THEME.text.primary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.primary.main,
    width: '100%',
    height: '100%',
  },
  loadingText: {
    color: THEME.text.primary,
    fontSize: 16,
    marginTop: 10,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceBox: {
    width: '100%',
    backgroundColor: THEME.primary.accent,
    borderRadius: 10,
    padding: initialIsSmallScreen ? 8 : 15,
  },
  diceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },
  diceButton: {
    padding: initialIsSmallScreen ? 5 : 10,
    backgroundColor: THEME.primary.main,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: initialIsSmallScreen ? 30 : 60,
  },
  diceHistory: {
    maxHeight: initialIsSmallScreen ? 100 : 200,
    marginTop: 10,
  },
  diceResultContainer: {
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: THEME.accent + '40',
  },
  diceResult: {
    color: THEME.text.primary,
  },
  diceTotal: {
    fontWeight: 'bold',
    color: THEME.secondary.main,
  },
  diceRolls: {
    color: THEME.text.primary + '80',
    fontSize: 12,
  },
  initiativeList: {
    backgroundColor: THEME.primary.accent,
    borderRadius: 10,
    padding: initialIsSmallScreen ? 8 : 15,
    width: '100%',
  },
  initiativeScroll: {
    maxHeight: initialIsSmallScreen ? 150 : 200,
  },
  initiativeItem: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    backgroundColor: THEME.primary.main,
  },
  currentInitiative: {
    backgroundColor: THEME.secondary.main,
  },
  initiativeText: {
    color: THEME.text.primary,
  },
  currentInitiativeText: {
    color: THEME.text.primary,
    fontWeight: 'bold',
  },
  zoomControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 10,
    display: initialIsSmallScreen ? 'flex' : 'none',
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  advantageButton: {
    backgroundColor: THEME.primary.main,
    padding: 8,
    borderRadius: 5,
  },
  advantageActive: {
    backgroundColor: THEME.secondary.main,
  },
  modifierInput: {
    backgroundColor: THEME.primary.main,
    color: THEME.text.primary,
    padding: 8,
    borderRadius: 5,
    width: 60,
    textAlign: 'center',
  },
  boxTitle: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: initialIsSmallScreen ? 2 : 5,
    marginBottom: initialIsSmallScreen ? 5 : 10,
  },
  colorButton: {
    width: initialIsSmallScreen ? 20 : 30,
    height: initialIsSmallScreen ? 20 : 30,
    borderRadius: initialIsSmallScreen ? 10 : 15,
    margin: initialIsSmallScreen ? 1 : 2,
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: THEME.secondary.main,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: THEME.text.primary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: THEME.primary.main,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text.primary,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: THEME.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: THEME.secondary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  hpControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  targetedCell: {
    borderColor: THEME.accent.green,
    borderWidth: 2,
  },
  distanceText: {
    color: THEME.text.secondary,
    fontSize: 12,
    marginTop: 10,
  },
  conditionManager: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.border.light,
    paddingTop: 15,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    backgroundColor: THEME.primary.main,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  conditionActive: {
    backgroundColor: THEME.secondary.main,
  },
  conditionIcon: {
    fontSize: initialIsSmallScreen ? 10 : 12,
  },
  conditionName: {
    color: THEME.text.primary,
    fontSize: 12,
  },
  durationSelector: {
    marginTop: 12,
  },
  durationButton: {
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  durationActive: {
    backgroundColor: THEME.secondary.main,
  },
  durationText: {
    color: THEME.text.primary,
    fontSize: 12,
  },
  saveManager: {
    padding: 16,
    backgroundColor: THEME.primary.dark,
    borderRadius: 8,
    marginBottom: 16,
  },
  saveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  saveActive: {
    backgroundColor: THEME.secondary.main,
  },
  saveName: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveModifier: {
    color: THEME.secondary.main,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dcContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dcInput: {
    backgroundColor: THEME.primary.light,
    color: THEME.text.primary,
    padding: 8,
    borderRadius: 5,
    width: 80,
    textAlign: 'center',
  },
  rollButton: {
    backgroundColor: THEME.secondary.main,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  rollText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  rollDisabled: {
    backgroundColor: THEME.border.medium,
  },
  damageCalculator: {
    padding: 16,
    backgroundColor: THEME.primary.dark,
    borderRadius: 8,
    marginBottom: 16,
  },
  calculatorControls: {
    gap: 12,
  },
  damageInput: {
    backgroundColor: THEME.primary.accent,
    color: THEME.text.primary,
    padding: 8,
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    fontSize: 14,
  },
  typeScroller: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: THEME.primary.accent,
    borderRadius: 6,
    marginBottom: 12,
  },
  typeButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary.main,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  typeActive: {
    borderColor: THEME.secondary.main,
    borderWidth: 2,
  },
  typeText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary.accent,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  healingButton: {
    backgroundColor: THEME.secondary.main,
  },
  actionText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionDisabled: {
    backgroundColor: THEME.border.medium,
  },
  aoeControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  aoeButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: THEME.primary.accent,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  aoeButtonActive: {
    backgroundColor: THEME.secondary.main,
  },
  aoeButtonText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  aoeTypeScroller: {
    marginTop: 12,
  },
  aoeTypeButton: {
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  aoeTypeActive: {
    backgroundColor: THEME.secondary.main,
  },
  aoeTypeText: {
    color: THEME.text.primary,
    fontSize: 12,
  },
  aoeSizeScroller: {
    marginTop: 8,
  },
  aoeSizeButton: {
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  aoeSizeActive: {
    backgroundColor: THEME.secondary.main,
  },
  aoeSizeText: {
    color: THEME.text.primary,
    fontSize: 12,
  },
  gridControls: {
    flexDirection: 'row',
    gap: 8,
  },
  activeControl: {
    backgroundColor: THEME.secondary.main,
    borderColor: THEME.secondary.light,
  },
  characterListItem: {
    padding: 4,
  },
  characterName: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  characterClass: {
    color: THEME.text.secondary,
    fontSize: 12,
    marginBottom: 2,
  },
  characterHP: {
    color: THEME.text.primary,
    fontSize: 14,
  },
  tokenAc: {
    fontSize: 10,
    textAlign: 'center',
    color: THEME.text.primary,
  },
  aoeCell: {
    backgroundColor: 'rgba(109, 40, 217, 0.2)', // Purple with opacity
    borderColor: THEME.secondary.main,
    borderWidth: 2,
  },
  aoeCenterCell: {
    backgroundColor: 'rgba(109, 40, 217, 0.4)', // Darker purple for center
    borderColor: THEME.secondary.main,
    borderWidth: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomInfo: {
    backgroundColor: THEME.primary.dark,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  roomText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  panel: {
    backgroundColor: THEME.primary.dark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  panelTitle: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAction: {
    backgroundColor: THEME.primary.main,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    color: THEME.text.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: THEME.primary.dark,
    padding: 12,
    borderRadius: 8,
  },
  gridTitle: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  gridLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    color: THEME.text.primary,
    fontSize: 14,
  },
  characterList: {
    maxHeight: 200,
  },
  characterItem: {
    backgroundColor: THEME.primary.main,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  characterInfo: {
    gap: 4,
  },
  characterStats: {
    color: THEME.text.secondary,
    fontSize: 12,
  },
});

const additionalStyles = StyleSheet.create({
  characterSheet: {
    backgroundColor: THEME.primary.accent,
    padding: 20,
    borderRadius: 10,
    width: initialIsSmallScreen ? '95%' : '80%',
    maxWidth: 800,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text.primary,
    marginBottom: 10,
  },
  abilityScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  abilityBox: {
    backgroundColor: THEME.primary.main,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: initialIsSmallScreen ? '30%' : 100,
    marginBottom: 10,
  },
  abilityLabel: {
    color: THEME.text.primary,
    fontWeight: 'bold',
  },
  abilityScore: {
    color: THEME.secondary.main,
    fontSize: 24,
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
    padding: 5,
  },
  abilityMod: {
    color: THEME.text.primary,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary.main,
    padding: 8,
    borderRadius: 5,
    minWidth: initialIsSmallScreen ? '45%' : 200,
  },
  proficientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  skillName: {
    color: THEME.text.primary,
    flex: 1,
  },
  skillMod: {
    color: THEME.secondary.main,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  closeButtonText: {
    color: THEME.text.primary,
    fontSize: 20,
  },
  lootSection: {
    backgroundColor: THEME.primary.main,
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyInput: {
    backgroundColor: THEME.primary.light,
    color: THEME.text.primary,
    padding: 8,
    borderRadius: 5,
    width: 80,
    textAlign: 'center',
  },
  currencyLabel: {
    color: THEME.text.primary,
    width: 30,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  itemInput: {
    flex: 1,
    backgroundColor: THEME.primary.light,
    color: THEME.text.primary,
    padding: 8,
    borderRadius: 5,
  },
  removeButton: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: THEME.accent.red,
  },
  addButton: {
    backgroundColor: THEME.accent.green,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  lootHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  addedBy: {
    color: THEME.text.primary,
    opacity: 0.6,
    fontSize: 12,
    marginTop: 4,
  },
  monsterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monsterButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  monsterName: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  monsterStats: {
    color: THEME.text.secondary,
    fontSize: 12,
  },
  monsterType: {
    color: THEME.text.secondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  }
});

const diceStyles = StyleSheet.create({
  content: {
    gap: 16,
  },
  controls: {
    backgroundColor: THEME.primary.dark,
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  controlGroup: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: THEME.primary.accent,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: THEME.secondary.main,
  },
  toggleText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    color: THEME.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    backgroundColor: THEME.primary.accent,
    color: THEME.text.primary,
    padding: 8,
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    fontSize: 14,
  },
  diceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  diceButton: {
    flex: 1,
    minWidth: 80,
    aspectRatio: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.border.medium,  // Changed from border.default
  },
  diceText: {
    color: THEME.text.primary,  // Changed from text.light
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  history: {
    marginTop: 16,
  },
  historyTitle: {
    color: THEME.text.primary,  // Changed from text.light
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  historyScroll: {
    maxHeight: 200,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: THEME.primary.dark,  // Changed from background.primary
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyDice: {
    color: THEME.text.primary,  // Changed from text.light
    fontSize: 14,
    fontWeight: '600',
  },
  historyRolls: {
    color: THEME.text.secondary,  // Changed from text.light + opacity
    fontSize: 12,
    marginTop: 4,
  },
  historyTotal: {
    color: THEME.secondary.main,  // Changed from accent
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  }
});

const statusStyles = StyleSheet.create({
  effectsContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.border.light,
    paddingTop: 15,
  },
  effectsTitle: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  effectButton: {
    backgroundColor: THEME.primary.main,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  effectActive: {
    backgroundColor: THEME.secondary.main,
  },
  effectText: {
    color: THEME.text.primary,
    fontSize: 12,
  },
  tokenEffects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 2,
  },
  effectIcon: {
    fontSize: initialIsSmallScreen ? 10 : 12,
  },
});

// Add initiative styles after diceStyles
const initiativeStyles = StyleSheet.create({
  content: {
    gap: 12,
  },
  list: {
    backgroundColor: THEME.primary.dark,
    borderRadius: 8,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.light,
  },
  itemActive: {
    backgroundColor: THEME.secondary.main + '20',
    borderLeftWidth: 4,
    borderLeftColor: THEME.secondary.main,
  },
  turnIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  turnNumber: {
    color: THEME.text.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemDetails: {
    color: THEME.text.secondary,
    fontSize: 12,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 24,
    color: THEME.text.secondary,
    marginBottom: 8,
  },
  emptyText: {
    color: THEME.text.secondary,
    textAlign: 'center',
  }
});

// Create a helper function to save game state
const saveGameState = async () => {
  if (firebaseRef.current) {
    try {
      await set(firebaseRef.current, {
        tokens,
        layers,
        initiative,
        inCombat,
        currentTurn,
        partyLoot,
        characters,
        settings: initialGameState.settings,
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('Error saving game state:', error);
      Alert.alert('Error', 'Failed to save game state');
    }
  }
};

// Add this component definition before the TokenModal component
const CharacterSheetModal = memo(({ visible, onClose, character, characters, onUpdate, onDelete, playerName, roomCode, THEME }) => {
  const [editedCharacter, setEditedCharacter] = useState(() => ({
    id: '',  // Initialize with empty string
    name: '',
    class: '',
    level: 1,
    owner: playerName,  // Set owner to playerName by default
    hp: 0,
    maxHp: 0,
    ac: 10,
    initiativeBonus: 0,
    proficiencyBonus: 2,
    abilityScores: {
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10
    },
    proficientSkills: [],
    currency: {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    items: [],
    inventory: []
  }));

  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (visible) {
      if (character) {
        // Editing existing character - preserve ID and owner
        setEditedCharacter({
          ...character,
          abilityScores: character.abilityScores || {
            STR: 10,
            DEX: 10,
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 10
          },
          proficientSkills: character.proficientSkills || [],
          currency: character.currency || {
            CP: 0,
            SP: 0,
            EP: 0,
            GP: 0,
            PP: 0
          },
          items: character.items || [],
          inventory: character.inventory || []
        });
      } else {
        // Creating new character - initialize with default values
        setEditedCharacter({
          id: `char-${Date.now()}`,
          name: '',
          class: '',
          level: 1,
          hp: 0,
          maxHp: 0,
          ac: 10,
          initiativeBonus: 0,
          proficiencyBonus: 2,
          owner: playerName,
          abilityScores: {
            STR: 10,
            DEX: 10,
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 10
          },
          proficientSkills: [],
          currency: {
            CP: 0,
            SP: 0,
            EP: 0,
            GP: 0,
            PP: 0
          },
          items: [],
          inventory: []
        });
      }
    }
  }, [visible, character, playerName]);

  const calculateModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const handleAbilityScoreChange = (ability, value) => {
    const newScore = parseInt(value) || 0;
    setEditedCharacter(prev => ({
      ...prev,
      abilityScores: {
        ...prev.abilityScores,
        [ability]: newScore
      }
    }));
  };

  const toggleProficiency = (skill) => {
    setEditedCharacter(prev => ({
      ...prev,
      proficientSkills: prev.proficientSkills.includes(skill)
        ? prev.proficientSkills.filter(s => s !== skill)
        : [...prev.proficientSkills, skill]
    }));
  };

  const getSkillModifier = (skill, ability) => {
    const abilityMod = calculateModifier(editedCharacter.abilityScores[ability]);
    const profBonus = editedCharacter.proficientSkills.includes(skill) ? editedCharacter.proficiencyBonus : 0;
    return abilityMod + profBonus;
  };

  // Add delete character function
  const handleDeleteCharacter = () => {
    if (deleteConfirmation !== character?.name) {
      Alert.alert('Error', 'Please enter the character name correctly to delete');
      return;
    }

    if (!roomCode) {
      Alert.alert('Error', 'Not connected to room');
      return;
    }

    const characterRef = ref(database, `rooms/${roomCode}/characters/${character.id}`);
    remove(characterRef)
      .then(() => {
        console.log('Character deleted successfully:', character.id);
        setDeleteConfirmation('');
        onDelete(character.id);
      })
      .catch((error) => {
        console.error('Error deleting character:', error);
        Alert.alert('Error', 'Failed to delete character');
      });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>
              {character ? 'Edit Character' : 'New Character'}
            </Text>
            <TouchableOpacity 
              style={modalStyles.closeButton}
              onPress={onClose}
            >
              <Text style={modalStyles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.content}>
            {/* Basic Info */}
            <View style={modalStyles.row}>
              <TextInput
                style={modalStyles.input}
                value={editedCharacter.name}
                onChangeText={(text) => setEditedCharacter(prev => ({...prev, name: text}))}
                placeholder="Character Name"
                placeholderTextColor={THEME.text.secondary}
              />
            </View>
            <View style={modalStyles.row}>
              <TextInput
                style={[modalStyles.input, { flex: 1 }]}
                value={editedCharacter.class}
                onChangeText={(text) => setEditedCharacter(prev => ({...prev, class: text}))}
                placeholder="Class"
                placeholderTextColor={THEME.text.secondary}
              />
              <TextInput
                style={[modalStyles.input, { width: 80 }]}
                value={String(editedCharacter.level)}
                onChangeText={(text) => setEditedCharacter(prev => ({...prev, level: parseInt(text) || 1}))}
                placeholder="Level"
                keyboardType="numeric"
                placeholderTextColor={THEME.text.secondary}
              />
            </View>

            {/* Combat Stats */}
            <Text style={modalStyles.sectionTitle}>Combat Stats</Text>
            <View style={modalStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.label}>HP</Text>
                <TextInput
                  style={modalStyles.input}
                  value={String(editedCharacter.hp || '')}
                  onChangeText={(text) => setEditedCharacter(prev => ({...prev, hp: parseInt(text) || 0}))}
                  placeholder="Current HP"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.text.secondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.label}>Max HP</Text>
                <TextInput
                  style={modalStyles.input}
                  value={String(editedCharacter.maxHp || '')}
                  onChangeText={(text) => setEditedCharacter(prev => ({...prev, maxHp: parseInt(text) || 0}))}
                  placeholder="Max HP"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.text.secondary}
                />
              </View>
            </View>
            <View style={modalStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.label}>AC</Text>
                <TextInput
                  style={modalStyles.input}
                  value={String(editedCharacter.ac || '')}
                  onChangeText={(text) => setEditedCharacter(prev => ({...prev, ac: parseInt(text) || 0}))}
                  placeholder="Armor Class"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.text.secondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.label}>Initiative Bonus</Text>
                <TextInput
                  style={modalStyles.input}
                  value={String(editedCharacter.initiativeBonus || '')}
                  onChangeText={(text) => setEditedCharacter(prev => ({...prev, initiativeBonus: parseInt(text) || 0}))}
                  placeholder="Initiative"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.text.secondary}
                />
              </View>
            </View>

            {/* Ability Scores */}
            <Text style={modalStyles.sectionTitle}>Ability Scores</Text>
            <View style={modalStyles.abilityScores}>
              {ABILITY_SCORES.map(ability => (
                <View key={ability} style={modalStyles.abilityBox}>
                  <Text style={modalStyles.abilityLabel}>{ability}</Text>
                  <TextInput
                    style={modalStyles.abilityScore}
                    value={String(editedCharacter.abilityScores[ability])}
                    onChangeText={(text) => handleAbilityScoreChange(ability, text)}
                    keyboardType="numeric"
                    maxLength={2}
                    selectTextOnFocus={true}
                  />
                  <Text style={modalStyles.abilityMod}>
                    {calculateModifier(editedCharacter.abilityScores[ability]) >= 0 ? '+' : ''}
                    {calculateModifier(editedCharacter.abilityScores[ability])}
                  </Text>
                </View>
              ))}
            </View>

            {/* Skills */}
            <Text style={modalStyles.sectionTitle}>Skills</Text>
            <View style={modalStyles.skillsList}>
              {Object.entries(SKILLS).map(([ability, skills]) =>
                skills.map(skill => (
                  <TouchableOpacity
                    key={skill}
                    style={modalStyles.skillItem}
                    onPress={() => toggleProficiency(skill)}
                  >
                    <View style={[
                      modalStyles.proficientDot,
                      { backgroundColor: editedCharacter.proficientSkills.includes(skill) ? THEME.secondary.main : THEME.border.light }
                    ]} />
                    <Text style={modalStyles.skillName}>{skill}</Text>
                    <Text style={modalStyles.skillMod}>
                      {getSkillModifier(skill, ability) >= 0 ? '+' : ''}
                      {getSkillModifier(skill, ability)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Add Delete Section only when editing an existing character */}
            {character && (
              <View style={modalStyles.deleteSection}>
                <Text style={[modalStyles.sectionTitle, { color: THEME.accent.red }]}>Delete Character</Text>
                <Text style={modalStyles.deleteText}>
                  To delete this character, type their name "{character.name}" below:
                </Text>
                <TextInput
                  style={[modalStyles.input, { marginVertical: 10 }]}
                  value={deleteConfirmation}
                  onChangeText={setDeleteConfirmation}
                  placeholder="Type character name to confirm"
                  placeholderTextColor={THEME.text.secondary}
                />
                <TouchableOpacity
                  style={[
                    modalStyles.deleteButton,
                    { opacity: deleteConfirmation !== character.name ? 0.5 : 1 }
                  ]}
                  onPress={handleDeleteCharacter}
                  disabled={deleteConfirmation !== character.name}
                >
                  <Text style={modalStyles.deleteButtonText}>Delete Character</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: THEME.accent.red }]}
              onPress={onClose}
            >
              <Text style={modalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: THEME.secondary.main }]}
              onPress={() => {
                console.log('Save button pressed');
                // Validate required fields
                if (!editedCharacter.name?.trim()) {
                  console.log('Character name is missing');
                  Alert.alert('Error', 'Character name is required');
                  return;
                }
                if (!editedCharacter.class?.trim()) {
                  console.log('Character class is missing');
                  Alert.alert('Error', 'Character class is required');
                  return;
                }
                
                console.log('Calling onUpdate with character:', editedCharacter);
                // Call onUpdate with the edited character data
                onUpdate(editedCharacter);
                onClose();
              }}
            >
              <Text style={modalStyles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Define ConditionManager component outside App
const ConditionManager = memo(({ token, onUpdate }) => {
  const [selectedDuration, setSelectedDuration] = useState(CONDITION_DURATIONS.ONE_ROUND);
  
  return (
    <View style={styles.conditionManager}>
      <Text style={styles.sectionTitle}>Conditions</Text>
      <View style={styles.conditionGrid}>
        {STATUS_EFFECTS.map(effect => (
          <TouchableOpacity
            key={effect.id}
            style={[
              styles.conditionButton,
              token.conditions?.some(c => c.id === effect.id) && styles.conditionActive
            ]}
            onPress={() => {
              const hasCondition = token.conditions?.some(c => c.id === effect.id);
              const newConditions = hasCondition
                ? token.conditions.filter(c => c.id !== effect.id)
                : [...(token.conditions || []), {
                    id: effect.id,
                    duration: selectedDuration,
                    startTime: Date.now()
                  }];
              onUpdate({ ...token, conditions: newConditions });
            }}
          >
            <Text style={styles.conditionIcon}>{effect.icon}</Text>
            <Text style={styles.conditionName}>{effect.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.durationSelector}>
        <Text style={styles.label}>Duration:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(CONDITION_DURATIONS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.durationButton,
                selectedDuration === value && styles.durationActive
              ]}
              onPress={() => setSelectedDuration(value)}
            >
              <Text style={styles.durationText}>
                {key.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
});

// Define SavingThrowManager component outside App
const SavingThrowManager = memo(({ token, onRoll }) => {
  const [selectedSave, setSelectedSave] = useState(null);
  const [dc, setDC] = useState('');
  
  const handleSave = () => {
    if (!selectedSave || !dc) return;
    
    const modifier = token.character?.[`${selectedSave.toLowerCase()}Mod`] || 0;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;
    const success = total >= parseInt(dc);
    
    onRoll({
      type: 'save',
      ability: selectedSave,
      roll,
      modifier,
      total,
      dc: parseInt(dc),
      success
    });
  };
  
  return (
    <View style={styles.saveManager}>
      <Text style={styles.sectionTitle}>Saving Throws</Text>
      <View style={styles.saveGrid}>
        {Object.entries(SAVE_TYPES).map(([key, name]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.saveButton,
              selectedSave === key && styles.saveActive
            ]}
            onPress={() => setSelectedSave(key)}
          >
            <Text style={styles.saveName}>{name}</Text>
            <Text style={styles.saveModifier}>
              {token.character?.[`${key.toLowerCase()}Mod`] >= 0 ? '+' : ''}
              {token.character?.[`${key.toLowerCase()}Mod`] || 0}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.dcContainer}>
        <TextInput
          style={styles.dcInput}
          value={dc}
          onChangeText={setDC}
          placeholder="DC"
          keyboardType="numeric"
          maxLength={2}
        />
        <TouchableOpacity
          style={[styles.rollButton, (!selectedSave || !dc) && styles.rollDisabled]}
          onPress={handleSave}
          disabled={!selectedSave || !dc}
        >
          <Text style={styles.rollText}>Roll Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Define DamageCalculator component outside App
const DamageCalculator = memo(({ token, onUpdate }) => {
  const [damageAmount, setDamageAmount] = useState('');
  const [damageType, setDamageType] = useState(DAMAGE_TYPES[0]);
  const [isHealing, setIsHealing] = useState(false);
  
  const handleDamage = () => {
    const amount = parseInt(damageAmount) || 0;
    if (amount === 0) return;
    
    const damage = isHealing ? -amount : amount;
    const newHP = Math.max(0, Math.min(token.hp - damage, token.maxHp));
    
    onUpdate({
      ...token,
      hp: newHP,
      lastDamage: isHealing ? null : {
        amount: damage,
        type: damageType,
        timestamp: Date.now()
      }
    });
    
    setDamageAmount('');
  };
  
  return (
    <View style={styles.damageCalculator}>
      <Text style={styles.sectionTitle}>
        {isHealing ? 'Healing' : 'Damage'} Calculator
      </Text>
      <View style={styles.calculatorControls}>
        <TextInput
          style={styles.damageInput}
          value={damageAmount}
          onChangeText={setDamageAmount}
          keyboardType="numeric"
          placeholder="Amount"
        />
        {!isHealing && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.typeScroller}
          >
            {DAMAGE_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  damageType === type && styles.typeActive
                ]}
                onPress={() => setDamageType(type)}
              >
                <Text style={styles.typeText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isHealing && styles.healingButton]}
            onPress={() => setIsHealing(!isHealing)}
          >
            <Text style={styles.actionText}>
              {isHealing ? '💚 Healing' : '⚔️ Damage'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, !damageAmount && styles.actionDisabled]}
            onPress={handleDamage}
            disabled={!damageAmount}
          >
            <Text style={styles.actionText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Define TokenModal component outside App
const TokenModal = memo(({ 
  showTokenModal, 
  setShowTokenModal, 
  selectedToken, 
  setSelectedToken, 
  tokens, 
  firebaseRef, 
  initialGameState, 
  layers, 
  initiative, 
  inCombat, 
  currentTurn, 
  THEME 
}) => {
  return (
    <Modal
      visible={showTokenModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTokenModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Token content here */}
          <DamageCalculator 
            token={selectedToken} 
            onUpdate={setSelectedToken} 
          />
          <SavingThrowManager 
            token={selectedToken}
            onRoll={(result) => {
              // Handle save roll
            }}
          />
          <ConditionManager 
            token={selectedToken}
            onUpdate={setSelectedToken}
          />
        </View>
      </View>
    </Modal>
  );
});

// Update the RoomModal styles
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: THEME.primary.dark,
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: THEME.border.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.medium,
    backgroundColor: THEME.primary.accent,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    color: THEME.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    color: THEME.text.primary,
    fontSize: 24,
  },
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: THEME.primary.main,
    color: THEME.text.primary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
    fontSize: 16,
    flex: 1,
  },
  label: {
    color: THEME.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    color: THEME.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
  },
  abilityScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  abilityBox: {
    backgroundColor: THEME.primary.main,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '30%',
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  abilityLabel: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  abilityScore: {
    backgroundColor: THEME.primary.accent,
    color: THEME.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  abilityMod: {
    color: THEME.secondary.main,
    fontSize: 16,
    fontWeight: 'bold',
  },
  skillsList: {
    marginBottom: 24,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary.main,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  proficientDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  skillName: {
    color: THEME.text.primary,
    fontSize: 16,
    flex: 1,
  },
  skillMod: {
    color: THEME.secondary.main,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border.medium,
    backgroundColor: THEME.primary.accent,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteSection: {
    marginTop: 20,
    padding: 10,
    borderWidth: 2,
    borderColor: THEME.accent.red,
    borderRadius: 5,
  },
  deleteText: {
    color: THEME.text.primary,
    fontSize: 14,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: THEME.accent.red,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

// Update the RoomModal component
const RoomModal = memo(({ 
  visible, 
  setShowRoomModal, 
  isConnected, 
  roomCode, 
  setRoomCode, 
  isJoining, 
  connectToRoom,
  THEME  
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowRoomModal(false)}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>Join Room</Text>
          <TextInput
            style={[modalStyles.input, {
              backgroundColor: THEME.primary.dark,
              color: THEME.text.primary,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: THEME.border.light,
              marginVertical: 16,
              fontSize: 16
            }]}
            value={roomCode}
            onChangeText={(text) => setRoomCode(text.trim().toLowerCase())}
            placeholder="Enter room code..."
            placeholderTextColor={THEME.text.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isJoining}
          />
          <TouchableOpacity
            style={[
              modalStyles.button,
              {
                backgroundColor: THEME.secondary.main,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 8
              },
              isJoining && { opacity: 0.7 }
            ]}
            onPress={() => {
              Keyboard.dismiss();
              connectToRoom(roomCode);
            }}
            disabled={isJoining}
          >
            {isJoining ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={THEME.text.primary} />
                <Text style={[modalStyles.buttonText, { marginLeft: 10 }]}>
                  Connecting...
                </Text>
              </View>
            ) : (
              <Text style={modalStyles.buttonText}>Join Room</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const PartyLootModal = memo(({ visible, onClose, partyLoot, playerName, onUpdate }) => {
  const [editedLoot, setEditedLoot] = useState({
    currency: {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    items: []
  });

  useEffect(() => {
    if (visible && partyLoot) {
      setEditedLoot({
        currency: partyLoot.currency || {
          CP: 0,
          SP: 0,
          EP: 0,
          GP: 0,
          PP: 0
        },
        items: partyLoot.items || []
      });
    }
  }, [visible, partyLoot]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <Text style={styles.modalTitle}>Party Loot</Text>
          
          <ScrollView>
            {/* Currency Section */}
            <View style={additionalStyles.lootSection}>
              {CURRENCY.map(type => (
                <View key={type} style={additionalStyles.currencyRow}>
                  <Text style={additionalStyles.currencyLabel}>{type}</Text>
                  <TextInput
                    style={additionalStyles.currencyInput}
                    value={String(editedLoot.currency[type] || 0)}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setEditedLoot(prev => ({
                        ...prev,
                        currency: {
                          ...prev.currency,
                          [type]: value
                        }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                </View>
              ))}
            </View>

            {/* Items Section */}
            <View style={additionalStyles.lootSection}>
              <View style={additionalStyles.lootHeader}>
                <Text style={additionalStyles.sectionTitle}>Items</Text>
                <TouchableOpacity
                  style={additionalStyles.addButton}
                  onPress={() => {
                    setEditedLoot(prev => ({
                      ...prev,
                      items: [...prev.items, { 
                        id: Date.now().toString(),
                        name: '',
                        quantity: 1,
                        addedBy: playerName 
                      }]
                    }));
                  }}
                >
                  <Text style={styles.buttonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {editedLoot.items.map((item, index) => (
                <View key={item.id || index} style={additionalStyles.itemRow}>
                  <TextInput
                    style={[additionalStyles.itemInput, { flex: 2 }]}
                    value={item.name}
                    onChangeText={(text) => {
                      const newItems = [...editedLoot.items];
                      newItems[index] = { ...item, name: text };
                      setEditedLoot(prev => ({ ...prev, items: newItems }));
                    }}
                    placeholder="Item name"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                  <TextInput
                    style={[additionalStyles.itemInput, { width: 60 }]}
                    value={String(item.quantity)}
                    onChangeText={(text) => {
                      const newItems = [...editedLoot.items];
                      newItems[index] = { ...item, quantity: parseInt(text) || 1 };
                      setEditedLoot(prev => ({ ...prev, items: newItems }));
                    }}
                    keyboardType="numeric"
                    placeholder="Qty"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                  <TouchableOpacity
                    style={additionalStyles.removeButton}
                    onPress={() => {
                      setEditedLoot(prev => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    <Text style={styles.buttonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: THEME.success }]}
              onPress={() => {
                onUpdate(editedLoot);
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Add this component definition before the App component
const GridZoomControls = memo(({ zoomLevel, setZoomLevel }) => {
  const debouncedZoom = debounce((newZoom) => {
    setZoomLevel(newZoom);
  }, 100);

  return (
    <View style={styles.zoomControls}>
      <TouchableOpacity
        style={styles.zoomButton}
        onPress={() => debouncedZoom(Math.max(0.5, zoomLevel - 0.1))}
      >
        <Text style={styles.buttonText}>-</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.zoomButton}
        onPress={() => debouncedZoom(Math.min(2, zoomLevel + 0.1))}
      >
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
});

// Add InventoryModal component
const InventoryModal = memo(({ visible, onClose, character, onUpdate, THEME }) => {
  const [editedInventory, setEditedInventory] = useState({
    currency: {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    inventory: []
  });

  useEffect(() => {
    if (visible && character) {
      setEditedInventory({
        currency: character.currency || {
          CP: 0,
          SP: 0,
          EP: 0,
          GP: 0,
          PP: 0
        },
        inventory: character.inventory || []
      });
    }
  }, [visible, character]);

  if (!visible || !character) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[modalStyles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <View style={[modalStyles.container, { width: '90%', maxWidth: 600 }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{character.name}'s Inventory</Text>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <Text style={modalStyles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '80%' }}>
            {/* Currency Section */}
            <View style={[modalStyles.section, { backgroundColor: THEME.primary.dark }]}>
              <Text style={modalStyles.sectionTitle}>Currency</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {Object.entries(editedInventory.currency).map(([type, amount]) => (
                  <View key={type} style={{ flexDirection: 'row', alignItems: 'center', minWidth: 120 }}>
                    <Text style={[modalStyles.label, { width: 30 }]}>{type}</Text>
                    <TextInput
                      style={[modalStyles.input, { flex: 1 }]}
                      value={String(amount)}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setEditedInventory(prev => ({
                          ...prev,
                          currency: {
                            ...prev.currency,
                            [type]: value
                          }
                        }));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={THEME.text.secondary}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Items Section */}
            <View style={[modalStyles.section, { backgroundColor: THEME.primary.dark, marginTop: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={modalStyles.sectionTitle}>Items</Text>
                <TouchableOpacity
                  style={[modalStyles.button, { backgroundColor: THEME.secondary.main, paddingHorizontal: 15, paddingVertical: 8 }]}
                  onPress={() => {
                    setEditedInventory(prev => ({
                      ...prev,
                      inventory: [...prev.inventory, { id: Date.now().toString(), name: '', quantity: 1, description: '' }]
                    }));
                  }}
                >
                  <Text style={modalStyles.buttonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {editedInventory.inventory.map((item, index) => (
                <View key={item.id} style={[modalStyles.itemRow, { marginBottom: 10 }]}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        style={[modalStyles.input, { flex: 1 }]}
                        value={item.name}
                        onChangeText={(text) => {
                          const newInventory = [...editedInventory.inventory];
                          newInventory[index] = { ...item, name: text };
                          setEditedInventory(prev => ({ ...prev, inventory: newInventory }));
                        }}
                        placeholder="Item name"
                        placeholderTextColor={THEME.text.secondary}
                      />
                      <TextInput
                        style={[modalStyles.input, { width: 60 }]}
                        value={String(item.quantity)}
                        onChangeText={(text) => {
                          const newInventory = [...editedInventory.inventory];
                          newInventory[index] = { ...item, quantity: parseInt(text) || 1 };
                          setEditedInventory(prev => ({ ...prev, inventory: newInventory }));
                        }}
                        keyboardType="numeric"
                        placeholder="Qty"
                        placeholderTextColor={THEME.text.secondary}
                      />
                      <TouchableOpacity
                        style={[modalStyles.button, { backgroundColor: THEME.accent.red, width: 30, height: 30, justifyContent: 'center' }]}
                        onPress={() => {
                          setEditedInventory(prev => ({
                            ...prev,
                            inventory: prev.inventory.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <Text style={modalStyles.buttonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[modalStyles.input, { height: 60 }]}
                      value={item.description || ''}
                      onChangeText={(text) => {
                        const newInventory = [...editedInventory.inventory];
                        newInventory[index] = { ...item, description: text };
                        setEditedInventory(prev => ({ ...prev, inventory: newInventory }));
                      }}
                      placeholder="Item description (optional)"
                      placeholderTextColor={THEME.text.secondary}
                      multiline
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[modalStyles.footer, { marginTop: 20 }]}>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: THEME.accent.red }]}
              onPress={onClose}
            >
              <Text style={modalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: THEME.secondary.main }]}
              onPress={() => {
                onUpdate(editedInventory);
                onClose();
              }}
            >
              <Text style={modalStyles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Add PlayerNameModal component
const PlayerNameModal = memo(({ visible, onSubmit }) => {
  const [name, setName] = useState('');
  const [dmSelected, setDmSelected] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Enter Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={THEME.text.secondary}
            autoCapitalize="words"
          />
          
          {/* Add DM Toggle */}
          <TouchableOpacity
            style={[
              modalStyles.button,
              { marginTop: 10, backgroundColor: dmSelected ? THEME.secondary.main : THEME.primary.accent }
            ]}
            onPress={() => setDmSelected(!dmSelected)}
          >
            <Text style={modalStyles.buttonText}>
              {dmSelected ? '🎲 DM Mode Selected' : '🎲 Join as DM?'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[modalStyles.button, { 
              backgroundColor: THEME.accent.green,
              width: '100%',
              marginTop: 10
            }]}
            onPress={() => onSubmit(name, dmSelected)}
            disabled={!name.trim()}
          >
            <Text style={modalStyles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// Add to styles
const viewerStyles = StyleSheet.create({
  viewersList: {
    marginTop: 15,
    padding: 10,
    backgroundColor: THEME.primary.main,
    borderRadius: 5,
  },
  viewersTitle: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  viewerName: {
    color: THEME.text.primary,
    opacity: 0.8,
    fontSize: 12,
    marginBottom: 2,
  },
});

// Update modernStyles
const modernStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary.main,
  },
  header: {
    backgroundColor: THEME.primary.light,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border.medium,
  },
  headerContent: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  title: {
    color: THEME.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mainContent: {
    flex: 1,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    padding: 20,
    flexDirection: initialIsSmallScreen ? 'column' : 'row',
    gap: 20,
  },
  sidebar: {
    width: initialIsSmallScreen ? '100%' : 350,
    gap: 20,
  },
  card: {
    backgroundColor: THEME.primary.light,  // Changed from background.secondary
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border.light,  // Changed from border.default
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: THEME.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: THEME.secondary.main,  // Changed from accent
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: THEME.text.primary,
    fontWeight: '600',
  },
  characterCard: {
    backgroundColor: THEME.primary.dark,  // Changed from background.card
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border.light,  // Changed from border.default
  },
  characterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  characterMeta: {
    color: THEME.text.secondary,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: THEME.primary.accent,  // Changed from background.elevated
    borderRadius: 8,
    padding: 12,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: THEME.text.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  gridContainer: {
    flex: 1,
    backgroundColor: THEME.primary.light,  // Changed from background.secondary
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border.light,  // Changed from border.default
  },
  dicePanel: {
    backgroundColor: THEME.primary.light,  // Changed from background.secondary
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border.light,  // Changed from border.default
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.primary.main,  // Changed from background.primary
    width: '100%',
    height: '100%',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: THEME.text.primary,
    fontSize: 16,
    marginLeft: 10,
  },
  headerControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: initialIsSmallScreen ? 'center' : 'flex-start',
  }
});

// Keep ErrorFallback as a pure component at root level
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Something went wrong</Text>
    <Text style={styles.errorMessage}>{error.message}</Text>
    <TouchableOpacity
      style={styles.errorButton}
      onPress={resetErrorBoundary}
    >
      <Text style={styles.errorButtonText}>Try again</Text>
    </TouchableOpacity>
  </View>
);

// Keep utility functions that don't use hooks at root level
const calculateDistance = (pos1, pos2) => {
  const [row1, col1] = pos1.split('-').map(Number);
  const [row2, col2] = pos2.split('-').map(Number);
  const horizontal = Math.abs(col1 - col2);
  const vertical = Math.abs(row1 - row2);
  return Math.max(horizontal, vertical) * 5;
};

// Add this before the App component
const Grid = memo(({ tokens, onCellPress, aoeMode, selectedAoe, setSelectedAoe, onToggle }) => {
  const [affectedCells, setAffectedCells] = useState([]);
  const [previewPosition, setPreviewPosition] = useState(null);

  const handleCellPress = useCallback((position) => {
    if (aoeMode) {
      const cells = calculateAffectedCells(position, selectedAoe.type, selectedAoe.size);
      setAffectedCells(cells);
      setPreviewPosition(position);
    } else {
      onCellPress(position);
    }
  }, [aoeMode, selectedAoe, onCellPress]);

  const renderCell = useCallback((rowIndex, colIndex) => {
    const position = `${rowIndex}-${colIndex}`;
    const token = Object.values(tokens).find(t => t.position === position);
    const isAffected = affectedCells.includes(position);
    const isPreview = previewPosition === position;
    
    return (
      <TouchableOpacity
        key={colIndex}
        style={[
          styles.cell,
          token && { backgroundColor: token.color || COLORS[0] },
          isAffected && styles.aoeCell,
          isPreview && styles.aoeCenterCell
        ]}
        onPress={() => handleCellPress(position)}
        activeOpacity={0.7}
      >
        {token && (
          <View style={styles.tokenContent}>
            <Text style={styles.tokenText} numberOfLines={1}>
              {token.name || 'Unknown'}
            </Text>
            {(token.hp !== undefined && token.maxHp !== undefined) && (
              <Text style={styles.tokenHp} numberOfLines={1}>
                HP: {token.hp}/{token.maxHp}
              </Text>
            )}
            {token.ac !== undefined && (
              <Text style={styles.tokenAc} numberOfLines={1}>
                AC: {token.ac}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [tokens, handleCellPress, affectedCells, previewPosition]);

  // Clear affected cells when AoE mode is disabled
  useEffect(() => {
    if (!aoeMode) {
      setAffectedCells([]);
      setPreviewPosition(null);
    }
  }, [aoeMode]);

  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: GRID_SIZE }).map((_, colIndex) => 
            renderCell(rowIndex, colIndex)
          )}
        </View>
      ))}
      {aoeMode && (
        <AoeControls
          aoeMode={aoeMode}
          selectedAoe={selectedAoe}
          onTypeChange={(type) => setSelectedAoe({
            type,
            size: AOE_SIZES[type][0]
          })}
          onSizeChange={(size) => setSelectedAoe(prev => ({ ...prev, size }))}
          onToggle={onToggle}
        />
      )}
    </View>
  );
});

// Add this utility function at the top with other utility functions
const generateUniqueId = () => {
  return `char-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Add MonsterSelectModal component before App component
const MonsterSelectModal = memo(({ visible, onClose, onSelect, THEME }) => {
  const monstersByCR = useMemo(() => {
    const groups = {
      low: [],
      medium: [],
      high: []
    };
    
    Object.entries(BASIC_MONSTERS).forEach(([key, monster]) => {
      const cr = parseFloat(monster.cr.replace('/', '.'));
      if (cr <= 2) groups.low.push({ id: key, ...monster });
      else if (cr <= 8) groups.medium.push({ id: key, ...monster });
      else groups.high.push({ id: key, ...monster });
    });
    
    return groups;
  }, []);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: '90%', maxWidth: 600 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={styles.modalTitle}>Select Monster</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: THEME.text.primary, fontSize: 24 }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '80%' }}>
            {/* Low CR Monsters */}
            <Text style={[styles.sectionTitle, { color: THEME.text.primary }]}>Low CR (0-2)</Text>
            <View style={additionalStyles.monsterGrid}>
              {monstersByCR.low.map(monster => (
                <TouchableOpacity
                  key={monster.id}
                  style={[additionalStyles.monsterButton, { backgroundColor: THEME.primary.dark }]}
                  onPress={() => onSelect(monster)}
                >
                  <Text style={additionalStyles.monsterName}>{monster.name}</Text>
                  <Text style={additionalStyles.monsterStats}>
                    HP: {monster.hp} AC: {monster.ac}
                  </Text>
                  <Text style={additionalStyles.monsterType}>
                    CR: {monster.cr} • {monster.type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Medium CR Monsters */}
            <Text style={[styles.sectionTitle, { color: THEME.text.primary, marginTop: 20 }]}>Medium CR (3-8)</Text>
            <View style={additionalStyles.monsterGrid}>
              {monstersByCR.medium.map(monster => (
                <TouchableOpacity
                  key={monster.id}
                  style={[additionalStyles.monsterButton, { backgroundColor: THEME.primary.dark }]}
                  onPress={() => onSelect(monster)}
                >
                  <Text style={additionalStyles.monsterName}>{monster.name}</Text>
                  <Text style={additionalStyles.monsterStats}>
                    HP: {monster.hp} AC: {monster.ac}
                  </Text>
                  <Text style={additionalStyles.monsterType}>
                    CR: {monster.cr} • {monster.type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* High CR Monsters */}
            <Text style={[styles.sectionTitle, { color: THEME.text.primary, marginTop: 20 }]}>High CR (9+)</Text>
            <View style={additionalStyles.monsterGrid}>
              {monstersByCR.high.map(monster => (
                <TouchableOpacity
                  key={monster.id}
                  style={[additionalStyles.monsterButton, { backgroundColor: THEME.primary.dark }]}
                  onPress={() => onSelect(monster)}
                >
                  <Text style={additionalStyles.monsterName}>{monster.name}</Text>
                  <Text style={additionalStyles.monsterStats}>
                    HP: {monster.hp} AC: {monster.ac}
                  </Text>
                  <Text style={additionalStyles.monsterType}>
                    CR: {monster.cr} • {monster.type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// Update the DiceResultModal component
const DiceResultModal = memo(({ roll, visible, onClose, advantage }) => {
  if (!roll || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{
          backgroundColor: THEME.primary.dark,
          padding: 20,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: THEME.secondary.main,
          alignItems: 'center',
          minWidth: 200,
          maxWidth: '80%',
        }}>
          <Text style={{
            color: THEME.text.primary,
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 10,
          }}>
            Rolling {roll.quantity > 1 ? `${roll.quantity} × ` : ''}d{roll.dice}
            {roll.modifier !== 0 && ` (${roll.modifier >= 0 ? '+' : ''}${roll.modifier})`}
          </Text>
          <Text style={{
            color: THEME.secondary.main,
            fontSize: 48,
            fontWeight: 'bold',
            marginBottom: 10,
          }}>
            {roll.total}
          </Text>
          <ScrollView style={{ maxHeight: 150 }}>
            {roll.individualRolls.map((individualRoll, index) => (
              <Text key={index} style={{
                color: THEME.text.secondary,
                fontSize: 16,
                marginBottom: 4,
              }}>
                Die {index + 1}: {individualRoll.rolls.join(', ')} → {individualRoll.finalRoll}
              </Text>
            ))}
          </ScrollView>
          <View style={{
            marginTop: 8,
            alignItems: 'center',
            gap: 4,
          }}>
            {roll.modifier !== 0 && (
              <Text style={{
                color: THEME.text.secondary,
                fontSize: 16,
              }}>
                Total = {roll.total - roll.modifier} {roll.modifier >= 0 ? '+' : ''}{roll.modifier}
              </Text>
            )}
            {advantage !== 'normal' && (
              <Text style={{
                color: THEME.text.secondary,
                fontSize: 14,
                fontStyle: 'italic',
              }}>
                {advantage === 'advantage' ? 'With Advantage' : 'With Disadvantage'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const App = () => {
  // State for modals and player info
  const [showPlayerNameModal, setShowPlayerNameModal] = useState(true);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isDM, setIsDM] = useState(false);  // Add isDM state
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // State for game elements
  const [tokens, setTokens] = useState({});
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [diceHistory, setDiceHistory] = useState([]);
  const [selectedDice, setSelectedDice] = useState(20);
  const [advantage, setAdvantage] = useState('normal'); // 'normal', 'advantage', 'disadvantage'
  const [modifier, setModifier] = useState(0);
  const [showMonsterSelect, setShowMonsterSelect] = useState(false);
  const [pendingPosition, setPendingPosition] = useState(null);

  // Add near other state declarations in App component
  const [aoeMode, setAoeMode] = useState(false);
  const [selectedAoe, setSelectedAoe] = useState({
    type: AOE_TYPES.CIRCLE,
    size: AOE_SIZES[AOE_TYPES.CIRCLE][0]
  });

  // Firebase ref
  const firebaseRef = useRef(null);

  // In the App component, add new state:
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [currentRoll, setCurrentRoll] = useState(null);

  // First, add a new state for dice quantity in App component after other state declarations
  const [diceQuantity, setDiceQuantity] = useState(1);

  const handleAoeModeToggle = () => {
    if (!aoeMode) {
      // Reset to default values when enabling AoE mode
      setSelectedAoe({
        type: AOE_TYPES.CIRCLE,
        size: AOE_SIZES[AOE_TYPES.CIRCLE][0]
      });
    }
    setAoeMode(!aoeMode);
  };

  // Update the handleRoll function to handle multiple dice
  const handleRoll = useCallback(() => {
    const allRolls = [];
    const numRolls = advantage === 'normal' ? 1 : 2;
    let totalSum = 0;
    
    // Roll each die separately
    for (let d = 0; d < diceQuantity; d++) {
      const rolls = [];
      for (let i = 0; i < numRolls; i++) {
        rolls.push(Math.floor(Math.random() * selectedDice) + 1);
      }
      
      const finalRoll = advantage === 'advantage' 
        ? Math.max(...rolls) 
        : advantage === 'disadvantage' 
          ? Math.min(...rolls) 
          : rolls[0];
      
      totalSum += finalRoll;
      allRolls.push({ rolls, finalRoll });
    }
    
    const total = totalSum + modifier;
    
    const newRoll = {
      dice: selectedDice,
      quantity: diceQuantity,
      individualRolls: allRolls,
      modifier,
      total,
      timestamp: Date.now()
    };
    
    setDiceHistory(prev => [newRoll, ...prev].slice(0, 10));
    setCurrentRoll(newRoll);
    setShowDiceResult(true);
  }, [selectedDice, advantage, modifier, diceQuantity]);

  // Handle cell click for grid
  const handleCellPress = useCallback((position) => {
    if (!roomCode || !isConnected) {
      Alert.alert('Error', 'Not connected to room');
      return;
    }

    // Find any token at this position
    const existingToken = Object.entries(tokens).find(([_, token]) => token.position === position);
    if (existingToken) {
      const [tokenId, token] = existingToken;
      // If user is DM or token owner, remove it
      if (isDM || token.owner === playerName) {
        console.log('Removing token:', tokenId, 'at position:', position);
        // Remove token directly from the tokens path
        const tokenRef = ref(database, `rooms/${roomCode}/tokens/${tokenId}`);
        remove(tokenRef)
          .then(() => {
            console.log('Token removed successfully');
            // Update local state to reflect removal
            const updatedTokens = { ...tokens };
            delete updatedTokens[tokenId];
            setTokens(updatedTokens);
          })
          .catch((error) => {
            console.error('Error removing token:', error);
            Alert.alert('Error', 'Failed to remove token');
          });
        return;
      }
      return;
    }

    // For DMs - show monster selection
    if (isDM) {
      setPendingPosition(position);
      setShowMonsterSelect(true);
      return;
    } 
    // For players - they can only place their own character token
    else {
      // Find the player's character
      const playerCharacter = characters.find(char => char.owner === playerName);
      
      if (!playerCharacter) {
        Alert.alert('Error', 'Create a character first before placing a token');
        return;
      }

      // Remove any existing tokens owned by this player first
      Object.entries(tokens).forEach(([tokenId, token]) => {
        if (token.owner === playerName && !token.isDM) {
          const tokenRef = ref(database, `rooms/${roomCode}/tokens/${tokenId}`);
          remove(tokenRef)
            .then(() => console.log('Removed old player token'))
            .catch(error => console.error('Error removing old token:', error));
        }
      });

      // Create new token for player's character
      const newToken = {
        id: `token-${Date.now()}`,
        name: playerCharacter.name,
        position,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        hp: playerCharacter.hp || 0,
        maxHp: playerCharacter.maxHp || 0,
        ac: playerCharacter.ac || 10,
        owner: playerName,
        isDM: false
      };

      // Add the new token
      const tokenRef = ref(database, `rooms/${roomCode}/tokens/${newToken.id}`);
      set(tokenRef, newToken)
        .catch((error) => {
          console.error('Error placing token:', error);
          Alert.alert('Error', 'Failed to place token');
        });
    }
  }, [selectedCharacter, playerName, isDM, roomCode, isConnected, characters, tokens]);

  // Handle character update
  const handleCharacterUpdate = useCallback((updatedCharacter) => {
    if (!roomCode) {
      Alert.alert('Error', 'Not connected to room. Please join a room first.');
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Not connected to Firebase. Please try reconnecting.');
      return;
    }

    // Validate required fields
    if (!updatedCharacter.name?.trim()) {
      Alert.alert('Error', 'Character name is required');
      return;
    }
    if (!updatedCharacter.class?.trim()) {
      Alert.alert('Error', 'Character class is required');
      return;
    }

    // Generate an ID for new characters or use existing
    const characterId = updatedCharacter.id || generateUniqueId();
    
    // Ensure all required fields have valid values while preserving existing data
    const finalCharacter = {
      ...updatedCharacter,
      id: characterId,
      name: updatedCharacter.name.trim(),
      class: updatedCharacter.class.trim(),
      level: updatedCharacter.level || 1,
      hp: updatedCharacter.hp ?? 0,
      maxHp: updatedCharacter.maxHp ?? 0,
      ac: updatedCharacter.ac ?? 10,
      initiativeBonus: updatedCharacter.initiativeBonus ?? 0,
      proficiencyBonus: updatedCharacter.proficiencyBonus ?? 2,
      abilityScores: updatedCharacter.abilityScores || {
        STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
      },
      proficientSkills: updatedCharacter.proficientSkills || [],
      currency: updatedCharacter.currency || {
        CP: 0, SP: 0, EP: 0, GP: 0, PP: 0
      },
      items: updatedCharacter.items || [],
      inventory: updatedCharacter.inventory || [],
      owner: updatedCharacter.owner || playerName,
      lastUpdated: Date.now()
    };

    // Update character in Firebase
    const characterRef = ref(database, `rooms/${roomCode}/characters/${characterId}`);
    set(characterRef, finalCharacter)
      .then(() => {
        console.log('Character saved successfully:', characterId);
        // Update local state immediately for better UX
        setCharacters(prev => {
          const filtered = prev.filter(c => c.id !== characterId);
          return [...filtered, finalCharacter].sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
        });
      })
      .catch((error) => {
        console.error('Error saving character:', error);
        Alert.alert('Error', 'Failed to save character. Please try again.');
      });
  }, [roomCode, playerName, isConnected]);

  // Connect to room function
  const connectToRoom = useCallback((code) => {
    setIsJoining(true);
    
    // Set up Firebase reference
    const roomRef = ref(database, `rooms/${code}`);
    firebaseRef.current = roomRef;

    // Set roomCode immediately
    setRoomCode(code);

    // Initial load of data
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Only set characters if they exist and have valid entries
        if (data.characters && Object.keys(data.characters).length > 0) {
          const charactersList = Object.values(data.characters)
            .filter(char => char.name && char.name.trim())
            .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
          setCharacters(charactersList);
        }
        // Only set tokens if they exist and are not empty
        if (data.tokens && Object.keys(data.tokens).length > 0) {
          setTokens(data.tokens);
        }
      }

      // Set up real-time listener for tokens
      const tokensRef = ref(database, `rooms/${code}/tokens`);
      onValue(tokensRef, (snapshot) => {
        if (snapshot.exists()) {
          setTokens(snapshot.val());
        } else {
          setTokens({});
        }
      });

      // Set up real-time listener for characters
      const charactersRef = ref(database, `rooms/${code}/characters`);
      onValue(charactersRef, (snapshot) => {
        if (snapshot.exists()) {
          const charactersData = snapshot.val();
          const charactersList = Object.values(charactersData)
            .filter(char => char.name && char.name.trim())
            .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
          setCharacters(charactersList);
        } else {
          setCharacters([]);
        }
      });

      // Clean up function to remove listeners when disconnecting
      const cleanup = () => {
        off(tokensRef);
        off(charactersRef);
      };

      setIsConnected(true);
      setShowRoomModal(false);
      setIsJoining(false);

      return cleanup;
    }).catch((error) => {
      console.error("Error connecting to room:", error);
      Alert.alert("Error", "Failed to connect to room");
      setIsJoining(false);
      setRoomCode(''); // Clear roomCode on error
    });
  }, []);

  // Add handleMonsterSelect function:
  const handleMonsterSelect = useCallback((monster) => {
    if (!pendingPosition) return;

    const newToken = {
      id: `token-${Date.now()}`,
      name: monster.name,
      position: pendingPosition,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      hp: monster.hp,
      maxHp: monster.maxHp,
      ac: monster.ac,
      owner: playerName,
      isDM: true,
      type: monster.type,
      cr: monster.cr
    };

    const tokenRef = ref(database, `rooms/${roomCode}/tokens/${newToken.id}`);
    set(tokenRef, newToken)
      .then(() => {
        setShowMonsterSelect(false);
        setPendingPosition(null);
      })
      .catch((error) => {
        console.error('Error placing monster token:', error);
        Alert.alert('Error', 'Failed to place monster token');
      });
  }, [pendingPosition, playerName, roomCode]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>D&D Combat Tracker</Text>
          <View style={styles.roomInfo}>
            <Text style={styles.roomText}>Room: {roomCode}</Text>
            <Text style={styles.roomText}>{playerName} {isDM && '(DM)'}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: THEME.secondary.main }]}
            onPress={() => setShowCharacterSheet(true)}
          >
            <Text style={styles.buttonText}>Add Character</Text>
          </TouchableOpacity>
          {isDM && (
            <>
              <TouchableOpacity 
                style={[
                  styles.controlButton, 
                  { backgroundColor: aoeMode ? THEME.secondary.main : THEME.accent.blue }
                ]}
                onPress={() => setAoeMode(!aoeMode)}
              >
                <Text style={styles.buttonText}>
                  {aoeMode ? '🎯 AoE Mode Active' : 'Toggle AoE Mode'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.controlButton, { backgroundColor: THEME.accent.green }]}
                onPress={() => {
                  // TODO: Add initiative tracking
                  Alert.alert('Coming Soon', 'Initiative tracking will be added in the next update!');
                }}
              >
                <Text style={styles.buttonText}>Start Combat</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainArea}>
        {/* Sidebar for Characters and Dice */}
        <View style={styles.sidebar}>
          {/* Quick Actions Panel */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => setShowCharacterSheet(true)}
              >
                <Text style={styles.quickActionIcon}>👤</Text>
                <Text style={styles.quickActionText}>Add Character</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => {
                  // Find the character owned by this player
                  const playerCharacter = characters.find(c => c.owner === playerName);
                  if (playerCharacter) {
                    setSelectedCharacter(playerCharacter);
                    setShowInventoryModal(true);
                  } else {
                    Alert.alert('No Character Found', 'Please create a character first to manage inventory.');
                  }
                }}
              >
                <Text style={styles.quickActionIcon}>🎪</Text>
                <Text style={styles.quickActionText}>My Inventory</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => Alert.alert('Coming Soon', 'Party inventory will be added soon!')}
              >
                <Text style={styles.quickActionIcon}>🎒</Text>
                <Text style={styles.quickActionText}>Party Inventory</Text>
              </TouchableOpacity>
              {isDM && (
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => setShowMonsterSelect(true)}
                >
                  <Text style={styles.quickActionIcon}>👾</Text>
                  <Text style={styles.quickActionText}>Add Monster</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Character List */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Characters</Text>
            <ScrollView style={styles.characterList}>
              {characters.map((character) => (
                <TouchableOpacity
                  key={character.id}
                  style={styles.characterItem}
                  onPress={() => {
                    setSelectedCharacter(character);
                    setShowCharacterSheet(true);
                  }}
                >
                  <View style={styles.characterInfo}>
                    <Text style={styles.characterName}>{character.name}</Text>
                    <Text style={styles.characterClass}>{character.class} {character.level}</Text>
                    <Text style={styles.characterStats}>
                      HP: {character.hp}/{character.maxHp} • AC: {character.ac}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Dice Roller */}
          <View style={[styles.diceBox, { marginTop: 20 }]}>
            <Text style={styles.boxTitle}>Dice Roller</Text>
            {/* Dice Type Selection */}
            <View style={[styles.diceButtons, { marginBottom: 10 }]}>
              {DICE_TYPES.map(dice => (
                <TouchableOpacity
                  key={dice.sides}
                  style={[
                    styles.diceButton,
                    {
                      backgroundColor: selectedDice === dice.sides ? dice.color : THEME.primary.main,
                      borderWidth: 1,
                      borderColor: THEME.border.light,
                      padding: 12,
                      minWidth: 50,
                      marginBottom: 5
                    }
                  ]}
                  onPress={() => setSelectedDice(dice.sides)}
                >
                  <Text style={[styles.buttonText, { fontSize: 16 }]}>d{dice.sides}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Roll Controls */}
            <View style={[styles.diceControls, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.advantageButton,
                    advantage === 'advantage' && styles.advantageActive,
                    { padding: 12, borderRadius: 6 }
                  ]}
                  onPress={() => setAdvantage(prev => prev === 'advantage' ? 'normal' : 'advantage')}
                >
                  <Text style={styles.buttonText}>Advantage</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.advantageButton,
                    advantage === 'disadvantage' && styles.advantageActive,
                    { padding: 12, borderRadius: 6 }
                  ]}
                  onPress={() => setAdvantage(prev => prev === 'disadvantage' ? 'normal' : 'disadvantage')}
                >
                  <Text style={styles.buttonText}>Disadvantage</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modifier and Roll Button */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TextInput
                style={[
                  styles.modifierInput,
                  {
                    flex: 1,
                    backgroundColor: THEME.primary.main,
                    borderWidth: 1,
                    borderColor: THEME.border.light,
                    padding: 12,
                    fontSize: 16
                  }
                ]}
                value={String(modifier)}
                onChangeText={(text) => setModifier(parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="Modifier"
                placeholderTextColor={THEME.text.secondary}
              />
              <TextInput
                style={[
                  styles.modifierInput,
                  {
                    width: 80,
                    backgroundColor: THEME.primary.main,
                    borderWidth: 1,
                    borderColor: THEME.border.light,
                    padding: 12,
                    fontSize: 16
                  }
                ]}
                value={String(diceQuantity)}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  setDiceQuantity(Math.max(1, Math.min(num, 20))); // Limit to 1-20 dice
                }}
                keyboardType="numeric"
                placeholder="# of dice"
                placeholderTextColor={THEME.text.secondary}
              />
              <TouchableOpacity
                style={[
                  styles.diceButton,
                  {
                    flex: 2,
                    backgroundColor: THEME.secondary.main,
                    padding: 12,
                    borderRadius: 6
                  }
                ]}
                onPress={handleRoll}
              >
                <Text style={[styles.buttonText, { fontSize: 16 }]}>Roll</Text>
              </TouchableOpacity>
            </View>

            {/* Roll History */}
            <View style={{ flex: 1, backgroundColor: THEME.primary.main, borderRadius: 6, padding: 10 }}>
              <ScrollView style={styles.diceHistory}>
                {diceHistory.map((roll, index) => (
                  <View key={index} style={[styles.diceResultContainer, { 
                    padding: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: THEME.border.light,
                    flexDirection: 'column'
                  }]}>
                    <Text style={[styles.diceResult, { fontSize: 16, color: THEME.text.primary, marginBottom: 4 }]}>
                      {roll.quantity}d{roll.dice}: <Text style={{ color: THEME.secondary.main, fontWeight: 'bold' }}>{roll.total}</Text>
                    </Text>
                    <Text style={[styles.diceRolls, { color: THEME.text.secondary }]}>
                      {roll.individualRolls.map(r => r.finalRoll).join(', ')}
                      {roll.modifier !== 0 && ` (${roll.modifier >= 0 ? '+' : ''}${roll.modifier})`}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Grid Section */}
        <View style={styles.gridSection}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridTitle}>Combat Grid</Text>
            <View style={styles.gridLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: THEME.accent.red }]} />
                <Text style={styles.legendText}>Enemy</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: THEME.accent.blue }]} />
                <Text style={styles.legendText}>Player</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: THEME.accent.purple }]} />
                <Text style={styles.legendText}>AoE</Text>
              </View>
            </View>
          </View>
          <Grid 
            tokens={tokens} 
            onCellPress={handleCellPress}
            aoeMode={aoeMode}
            selectedAoe={selectedAoe}
            setSelectedAoe={setSelectedAoe}
            onToggle={handleAoeModeToggle}
          />
        </View>
      </View>

      {/* Player Name Modal */}
      <PlayerNameModal
        visible={showPlayerNameModal}
        onSubmit={(name, dmMode) => {
          setPlayerName(name);
          setIsDM(dmMode);  // Set isDM state
          setShowPlayerNameModal(false);
          setShowRoomModal(true);
        }}
      />

      {/* Room Modal */}
      <RoomModal
        visible={showRoomModal}
        setShowRoomModal={setShowRoomModal}
        isConnected={isConnected}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        isJoining={isJoining}
        connectToRoom={connectToRoom}
        THEME={THEME}
      />

      {/* Character Sheet Modal */}
      <CharacterSheetModal
        visible={showCharacterSheet}
        onClose={() => {
          setShowCharacterSheet(false);
          setSelectedCharacter(null);
        }}
        character={selectedCharacter}
        characters={characters}
        onUpdate={handleCharacterUpdate}
        onDelete={(characterId) => {
          const characterRef = ref(database, `rooms/${roomCode}/characters/${characterId}`);
          remove(characterRef);
        }}
        playerName={playerName}
        roomCode={roomCode}
        THEME={THEME}
      />

      {/* Monster Select Modal */}
      <MonsterSelectModal
        visible={showMonsterSelect}
        onClose={() => {
          setShowMonsterSelect(false);
          setPendingPosition(null);
        }}
        onSelect={handleMonsterSelect}
        THEME={THEME}
      />

      {/* Dice Result Modal */}
      <DiceResultModal
        roll={currentRoll}
        visible={showDiceResult}
        onClose={() => setShowDiceResult(false)}
        advantage={advantage}
      />

      {/* Inventory Modal */}
      <InventoryModal
        visible={showInventoryModal}
        onClose={() => {
          setShowInventoryModal(false);
          setSelectedCharacter(null);
        }}
        character={selectedCharacter}
        onUpdate={(updatedInventory) => {
          if (selectedCharacter) {
            handleCharacterUpdate({
              ...selectedCharacter,
              currency: updatedInventory.currency,
              inventory: updatedInventory.inventory
            });
          }
        }}
        THEME={THEME}
      />
    </SafeAreaView>
  );
};

App.displayName = 'App';

export default App;