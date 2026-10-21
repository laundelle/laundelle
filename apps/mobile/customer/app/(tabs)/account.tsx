import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/context/AuthContext';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Laundelle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="My Account" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'G'}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {user?.name || (user as any)?.full_name || (isAuthenticated ? 'Laundelle Customer' : 'Guest Customer')}
          </Text>
          <Text style={styles.profileEmail}>
            {user?.email || 'Sign in to access your saved addresses & history'}
          </Text>
          {(user as any)?.customerId || (user as any)?.publicId ? (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>ID: {(user as any)?.customerId || (user as any)?.publicId}</Text>
            </View>
          ) : null}
        </View>

        {!isAuthenticated ? (
          <Card style={styles.signInCard}>
            <Text style={styles.signInCardTitle}>Access Your Account</Text>
            <Text style={styles.signInCardSubtitle}>
              Sign in to manage doorstep addresses, custom wash preferences, and payments.
            </Text>
            <Button
              title="Sign In or Register"
              onPress={() => router.push('/(auth)/login')}
              style={styles.signInBtn}
            />
          </Card>
        ) : null}

        {/* Section: Laundry Preferences */}
        <Text style={styles.sectionHeading}>Laundry Preferences</Text>
        <Card>
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Ionicons name="sparkles-outline" size={20} color={Colors.accent} />
              <View>
                <Text style={styles.prefTitle}>Detergent Choice</Text>
                <Text style={styles.prefSubtitle}>
                  {user?.preferences?.detergent || 'Standard Eco Sensitive'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Ionicons name="leaf-outline" size={20} color={Colors.success} />
              <View>
                <Text style={styles.prefTitle}>Fabric Softener</Text>
                <Text style={styles.prefSubtitle}>
                  {user?.preferences?.softener || 'Standard Fresh Floral'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>

          <View style={styles.prefDivider} />

          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Ionicons name="shirt-outline" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.prefTitle}>Shirt Finishing</Text>
                <Text style={styles.prefSubtitle}>
                  {user?.preferences?.starchedShirts || 'On Hanger (No Starch)'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
        </Card>

        {/* Section: Support & Legal */}
        <Text style={styles.sectionHeading}>Help & Information</Text>
        <Card>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.menuText}>Customer Support & FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.prefDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="shield-outline" size={20} color={Colors.primary} />
              <Text style={styles.menuText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.prefDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={styles.menuText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {isAuthenticated ? (
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutBtn}
            icon={<Ionicons name="log-out-outline" size={18} color={Colors.danger} />}
            textStyle={{ color: Colors.danger }}
          />
        ) : null}

        <Text style={styles.versionText}>Laundelle Customer App v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.surface,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  idBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ice,
  },
  idText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  signInCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  signInCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  signInCardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  signInBtn: {
    width: '100%',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  prefSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  prefDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  logoutBtn: {
    marginTop: Spacing.lg,
    borderColor: Colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
