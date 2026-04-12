import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../constants/colors';

interface Props {
  language: string;
  filename?: string;
  content: string;
  maxHeight?: number;
}

const LANG_COLORS: Record<string, string> = {
  typescript: C.accent, javascript: '#f7df1e', python: '#3572A5',
  go: '#00ADD8', rust: '#CE422B', swift: '#F05138',
  sql: C.green, java: '#B07219', css: '#563d7c', html: '#e34c26',
};

export function CodeBlock({ language, filename, content, maxHeight = 160 }: Props) {
  const langColor = LANG_COLORS[language.toLowerCase()] ?? C.text3;

  const handleCopy = () => {
    // Clipboard.setStringAsync(content)
    Alert.alert('Copied', 'Code copied to clipboard');
  };

  return (
    <View style={styles.container}>
      {/* Title bar */}
      <View style={styles.titleBar}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: C.red }]} />
          <View style={[styles.dot, { backgroundColor: C.orange }]} />
          <View style={[styles.dot, { backgroundColor: C.green }]} />
        </View>
        <Text style={styles.filename}>{filename ?? 'snippet'}</Text>
        <View style={styles.rightRow}>
          <View style={[styles.langBadge, { borderColor: langColor + '60' }]}>
            <Text style={[styles.langText, { color: langColor }]}>{language.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={handleCopy} hitSlop={8}>
            <Ionicons name="copy-outline" size={14} color={C.text3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Code content */}
      <ScrollView
        style={[styles.codeScroll, { maxHeight }]}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.code}>{content}</Text>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.codeBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.element,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  filename: { flex: 1, fontSize: 10, color: C.text3, fontFamily: 'Menlo' },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  langText: { fontSize: 8, fontWeight: '700', fontFamily: 'Menlo' },
  codeScroll: { padding: 12 },
  code: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: '#c9d1d9',
    lineHeight: 20,
  },
});
