import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  flat: {
    backgroundColor: Colors.cardAlt,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
