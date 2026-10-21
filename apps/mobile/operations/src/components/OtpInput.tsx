import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
}) => {
  const inputRef = useRef<TextInput>(null);

  const digits = value.split('');
  const boxArray = Array.from({ length }, (_, i) => i);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={styles.boxesRow}
      >
        {boxArray.map((idx) => {
          const char = digits[idx] || '';
          const isCurrent = idx === digits.length;
          const isFilled = Boolean(char);

          return (
            <View
              key={idx}
              style={[
                styles.box,
                isCurrent && styles.boxCurrent,
                isFilled && styles.boxFilled,
              ]}
            >
              <Text style={styles.digitText}>{char}</Text>
            </View>
          );
        })}
      </TouchableOpacity>

      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const sanitized = text.replace(/[^0-9]/g, '').slice(0, length);
          onChange(sanitized);
        }}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        style={styles.hiddenInput}
        autoFocus
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxCurrent: {
    borderColor: Colors.accent,
    backgroundColor: '#FAFCFF',
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.iceLight,
  },
  digitText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
