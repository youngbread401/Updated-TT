import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { THEME } from '../theme';

const ABILITY_SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const SKILLS = {
  STR: ['Athletics'],
  DEX: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
  INT: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
  WIS: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
  CHA: ['Deception', 'Intimidation', 'Performance', 'Persuasion']
};

const CharacterSheet = ({ character, onUpdate, onClose }) => {
  const [stats, setStats] = useState(character?.stats || {
    name: '',
    class: '',
    level: 1,
    hp: 10,
    maxHp: 10,
    ac: 10,
    proficiencyBonus: 2,
    abilityScores: ABILITY_SCORES.reduce((acc, ability) => ({
      ...acc,
      [ability]: 10
    }), {}),
    skills: Object.values(SKILLS).flat().reduce((acc, skill) => ({
      ...acc,
      [skill]: false
    }), {})
  });

  const calculateModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const getSkillModifier = (skill) => {
    const ability = Object.entries(SKILLS).find(([_, skills]) => 
      skills.includes(skill)
    )[0];
    
    const abilityMod = calculateModifier(stats.abilityScores[ability]);
    const profBonus = stats.skills[skill] ? stats.proficiencyBonus : 0;
    
    return abilityMod + profBonus;
  };

  const handleAbilityScoreChange = (ability, value) => {
    const newValue = Math.max(1, Math.min(20, parseInt(value) || 0));
    setStats(prev => ({
      ...prev,
      abilityScores: {
        ...prev.abilityScores,
        [ability]: newValue
      }
    }));
  };

  const toggleProficiency = (skill) => {
    setStats(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: !prev.skills[skill]
      }
    }));
  };

  const handleSave = () => {
    onUpdate(stats);
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Character Sheet</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Info */}
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            value={stats.name}
            onChangeText={(text) => setStats(prev => ({ ...prev, name: text }))}
            placeholder="Character Name"
            placeholderTextColor={THEME.text.secondary}
          />
          <TextInput
            style={styles.input}
            value={stats.class}
            onChangeText={(text) => setStats(prev => ({ ...prev, class: text }))}
            placeholder="Class"
            placeholderTextColor={THEME.text.secondary}
          />
          <TextInput
            style={styles.input}
            value={String(stats.level)}
            onChangeText={(text) => setStats(prev => ({ ...prev, level: parseInt(text) || 1 }))}
            placeholder="Level"
            keyboardType="numeric"
            placeholderTextColor={THEME.text.secondary}
          />
        </View>

        {/* Combat Stats */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.label}>HP</Text>
              <TextInput
                style={styles.statInput}
                value={String(stats.hp)}
                onChangeText={(text) => setStats(prev => ({ ...prev, hp: parseInt(text) || 0 }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.stat}>
              <Text style={styles.label}>Max HP</Text>
              <TextInput
                style={styles.statInput}
                value={String(stats.maxHp)}
                onChangeText={(text) => setStats(prev => ({ ...prev, maxHp: parseInt(text) || 0 }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.stat}>
              <Text style={styles.label}>AC</Text>
              <TextInput
                style={styles.statInput}
                value={String(stats.ac)}
                onChangeText={(text) => setStats(prev => ({ ...prev, ac: parseInt(text) || 0 }))}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Ability Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ability Scores</Text>
          <View style={styles.abilityScores}>
            {ABILITY_SCORES.map(ability => (
              <View key={ability} style={styles.abilityScore}>
                <Text style={styles.abilityLabel}>{ability}</Text>
                <TextInput
                  style={styles.abilityInput}
                  value={String(stats.abilityScores[ability])}
                  onChangeText={(text) => handleAbilityScoreChange(ability, text)}
                  keyboardType="numeric"
                />
                <Text style={styles.modifier}>
                  {calculateModifier(stats.abilityScores[ability]) >= 0 ? '+' : ''}
                  {calculateModifier(stats.abilityScores[ability])}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          {Object.entries(SKILLS).map(([ability, skillList]) => (
            <View key={ability} style={styles.skillGroup}>
              <Text style={styles.skillAbility}>{ability}</Text>
              {skillList.map(skill => (
                <TouchableOpacity
                  key={skill}
                  style={styles.skill}
                  onPress={() => toggleProficiency(skill)}
                >
                  <View style={[
                    styles.proficiencyDot,
                    stats.skills[skill] && styles.proficient
                  ]} />
                  <Text style={styles.skillName}>{skill}</Text>
                  <Text style={styles.skillModifier}>
                    {getSkillModifier(skill) >= 0 ? '+' : ''}
                    {getSkillModifier(skill)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Character</Text>
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
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    backgroundColor: THEME.primary.main,
    color: THEME.text.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    color: THEME.text.primary,
    fontSize: 14,
    marginBottom: 5,
  },
  statInput: {
    backgroundColor: THEME.primary.main,
    color: THEME.text.primary,
    padding: 10,
    borderRadius: 6,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  abilityScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  abilityScore: {
    width: '30%',
    marginBottom: 15,
    alignItems: 'center',
  },
  abilityLabel: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  abilityInput: {
    backgroundColor: THEME.primary.main,
    color: THEME.text.primary,
    padding: 10,
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: THEME.border.light,
  },
  modifier: {
    color: THEME.text.primary,
    fontSize: 14,
    marginTop: 5,
  },
  skillGroup: {
    marginBottom: 15,
  },
  skillAbility: {
    color: THEME.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  skill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  proficiencyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border.light,
    marginRight: 10,
  },
  proficient: {
    backgroundColor: THEME.accent.green,
    borderColor: THEME.accent.green,
  },
  skillName: {
    color: THEME.text.primary,
    flex: 1,
  },
  skillModifier: {
    color: THEME.text.primary,
    width: 30,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: THEME.accent.green,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: {
    color: THEME.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CharacterSheet; 