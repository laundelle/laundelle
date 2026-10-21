import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useOpsAuth } from '../../src/context/AuthContext';

export default function AccessDeniedScreen() {
  const { user, logout } = useOpsAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-outline" size={60} color={Colors.danger} />
        </View>

        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>
          This mobile application is strictly restricted to field Drivers and plant Processors.
        </Text>

        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>AUTHENTICATED ACCOUNT</Text>
          <Text style={styles.infoEmail}>{user?.email || 'Unknown User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Role: {user?.role || 'Unauthorized'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.instructions}>
            • Plant Managers and System Administrators must access the Laundelle Operations Web Portal via a browser.
            {'\n'}• Customer accounts must use the Laundelle Customer Mobile App.
          </Text>
        </Card>

        <Button
          title="Sign Out of This Account"
          onPress={logout}
          variant="outline"
          style={styles.signOutBtn}
          icon={<Ionicons name="log-out-outline" size={18} color={Colors.primary} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.danger,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  infoCard: {
    width: '100%',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  infoEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  instructions: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  signOutBtn: {
    width: '100%',
  },
});
