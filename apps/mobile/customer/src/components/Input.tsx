import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          Boolean(error) && styles.errorWrapper,
        ]}
      >
        {leftIcon ? <View style={styles.iconContainer}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon ? <View style={styles.iconContainer}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  focusedWrapper: {
    borderColor: Colors.accent,
    backgroundColor: '#FAFCFF',
  },
  errorWrapper: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
