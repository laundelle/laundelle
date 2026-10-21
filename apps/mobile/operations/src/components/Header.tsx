import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme/colors';

interface HeaderProps {
  title?: string;
  roleBadge?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'LAUNDELLE OPS',
  roleBadge,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>OPS</Text>
          </View>
        )}
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {roleBadge ? (
            <Text style={styles.roleSub}>{roleBadge}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>{rightAction}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: 4,
  },
  logoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  logoText: {
    color: Colors.surface,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  roleSub: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
