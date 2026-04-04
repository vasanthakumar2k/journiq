import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

const EditEntryScreen = ({ navigation, route }) => {
  const { entry } = route.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Entry</Text>
      <TextInput style={styles.input} defaultValue={entry?.title} />
      <TextInput style={[styles.input, styles.contentInput]} multiline defaultValue={entry?.content} />
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Update Entry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.md, backgroundColor: theme.colors.background },
  title: { fontSize: theme.fonts.sizes.xl, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  input: { backgroundColor: theme.colors.white, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  contentInput: { height: 200, textAlignVertical: 'top' },
  button: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  buttonText: { color: theme.colors.white, fontWeight: 'bold' },
});

export default EditEntryScreen;
