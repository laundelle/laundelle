import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme/colors';
import { Button } from './Button';

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

export const ErrorRetry: React.FC<ErrorRetryProps> = ({
  message = 'An unexpected error occurred while communicating with Laundelle servers.',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={48} color={Colors.danger} />
      <Text style={styles.title}>Connection Issue</Text>
      <Text style={styles.message}>{message}</Text>
      <Button
        title="Retry Connection"
        onPress={onRetry}
        variant="outline"
        size="sm"
        style={styles.retryBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.danger,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryBtn: {
    minWidth: 160,
  },
});
