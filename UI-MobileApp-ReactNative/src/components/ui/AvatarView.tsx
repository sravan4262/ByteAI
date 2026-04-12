import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../constants/colors';
import { AvatarVariant } from '../../types/models';

const SIZE_MAP = { sm: 28, md: 36, lg: 48, xl: 72 };
const FONT_MAP = { sm: 10, md: 13, lg: 16, xl: 24 };

const GRADIENTS: Record<AvatarVariant, readonly [string, string]> = {
  cyan:   ['#0e7490', '#06b6d4'],
  purple: ['#7e22ce', '#a855f7'],
  green:  ['#15803d', '#22c55e'],
  orange: ['#c2410c', '#f97316'],
};

interface Props {
  initials: string;
  variant?: AvatarVariant;
  size?: keyof typeof SIZE_MAP;
  imageUrl?: string;
}

export function AvatarView({ initials, variant = 'cyan', size = 'md', imageUrl }: Props) {
  const px = SIZE_MAP[size];
  const fs = FONT_MAP[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.base, { width: px, height: px, borderRadius: px / 2 }]}
      />
    );
  }

  return (
    <LinearGradient
      colors={GRADIENTS[variant]}
      style={[styles.base, { width: px, height: px, borderRadius: px / 2 }]}
    >
      <Text style={[styles.text, { fontSize: fs }]}>{initials.toUpperCase()}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
