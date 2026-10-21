import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../theme/colors';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'driver' | 'processor' | 'neutral';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'driver':
        return { bg: Colors.driverLight, text: Colors.driver };
      case 'processor':
        return { bg: Colors.processorLight, text: Colors.processor };
      case 'primary':
        return { bg: Colors.ice, text: Colors.primary };
      case 'success':
        return { bg: Colors.successLight, text: Colors.success };
      case 'warning':
        return { bg: Colors.warningLight, text: Colors.warning };
      case 'danger':
        return { bg: Colors.dangerLight, text: Colors.danger };
      case 'info':
        return { bg: Colors.infoLight, text: Colors.info };
      case 'neutral':
      default:
        return { bg: Colors.cardAlt, text: Colors.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
