import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { PostcodeChecker } from '../../src/components/PostcodeChecker';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [verifiedPostcode, setVerifiedPostcode] = useState<string | null>(null);

  const fetchActiveOrders = async () => {
    if (!isAuthenticated) return;
    try {
      const orders = await mobileApi.orders.get();
      if (Array.isArray(orders)) {
        const active = orders.filter(
          (o: any) => o.status !== 'completed' && o.status !== 'cancelled'
        );
        setActiveOrders(active);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchActiveOrders();
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveOrders();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navBar}>
        <View style={styles.brandGroup}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>L</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>LAUNDELLE</Text>
            <Text style={styles.greeting}>
              {user?.name || (user as any)?.full_name ? `Hello, ${user?.name || (user as any)?.full_name}` : 'Welcome Guest'}
            </Text>
          </View>
        </View>

        {!isAuthenticated ? (
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Order Progress Banner if customer has orders in progress */}
        {activeOrders.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.activeOrderCard}
            onPress={() => router.push(`/orders/${activeOrders[0].id || activeOrders[0].orderNumber}`)}
          >
            <View style={styles.orderHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.activeOrderTitle}>Active Order In Progress</Text>
              <Badge
                label={String(activeOrders[0].status || 'In Transit').replace(/_/g, ' ')}
                variant="info"
              />
            </View>
            <Text style={styles.orderNumber}>
              Order #{activeOrders[0].orderNumber || activeOrders[0].id}
            </Text>
            <Text style={styles.orderPrompt}>
              Tap to view pickup OTP and real-time tracking →
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Hero Section */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroTagline}>UK PREMIER LAUNDRY</Text>
          <Text style={styles.heroTitle}>Crisp, Clean Garments Delivered to Your Door</Text>
          <Text style={styles.heroDescription}>
            Professional wash, dry cleaning, and hand-finish ironing with complimentary door-to-door collection.
          </Text>

          <Button
            title="Book a Collection"
            onPress={() => router.push('/booking')}
            style={styles.bookCta}
            icon={<Ionicons name="calendar-outline" size={18} color={Colors.surface} />}
          />
        </View>

        {/* Postcode Availability Checker */}
        <PostcodeChecker
          onEligible={(code) => {
            setVerifiedPostcode(code);
          }}
        />

        {/* Service Categories Quick Nav */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesGrid}>
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => router.push('/booking')}
          >
            <View style={[styles.catIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="water-outline" size={28} color="#0284C7" />
            </View>
            <Text style={styles.catTitle}>Wash & Fold</Text>
            <Text style={styles.catSubtitle}>Everyday clothes by weight</Text>
            <Text style={styles.catPrice}>From £15.00</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => router.push('/booking')}
          >
            <View style={[styles.catIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shirt-outline" size={28} color="#D97706" />
            </View>
            <Text style={styles.catTitle}>Dry Cleaning</Text>
            <Text style={styles.catSubtitle}>Suits, dresses & delicates</Text>
            <Text style={styles.catPrice}>From £8.50</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => router.push('/booking')}
          >
            <View style={[styles.catIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="flame-outline" size={28} color="#16A34A" />
            </View>
            <Text style={styles.catTitle}>Ironing Only</Text>
            <Text style={styles.catSubtitle}>Crisp shirts & linens</Text>
            <Text style={styles.catPrice}>From £2.20 / item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => router.push('/booking')}
          >
            <View style={[styles.catIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="bed-outline" size={28} color="#9333EA" />
            </View>
            <Text style={styles.catTitle}>Duvets & Bedding</Text>
            <Text style={styles.catSubtitle}>Bulky items & comforters</Text>
            <Text style={styles.catPrice}>From £18.00</Text>
          </TouchableOpacity>
        </View>

        {/* Value Highlights */}
        <View style={styles.highlightsContainer}>
          <View style={styles.highlightItem}>
            <Ionicons name="time-outline" size={22} color={Colors.accent} />
            <Text style={styles.highlightTitle}>24-48h Turnaround</Text>
            <Text style={styles.highlightText}>Swift processing and scheduled delivery slots.</Text>
          </View>
          <View style={styles.highlightItem}>
            <Ionicons name="leaf-outline" size={22} color={Colors.success} />
            <Text style={styles.highlightTitle}>Eco-Friendly Cleaning</Text>
            <Text style={styles.highlightText}>Gentle on fabrics, biodegradable detergents.</Text>
          </View>
          <View style={styles.highlightItem}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
            <Text style={styles.highlightTitle}>OTP Secured Handover</Text>
            <Text style={styles.highlightText}>6-digit code protects pickup and delivery custody.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  logoLetter: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  signInBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ice,
  },
  signInBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  activeOrderCard: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    borderRadius: BorderRadius.md,
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
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: 6,
  },
  activeOrderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  orderPrompt: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 6,
    fontWeight: '600',
  },
  heroBanner: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTagline: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.sky,
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.surface,
    lineHeight: 28,
  },
  heroDescription: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
    marginVertical: Spacing.sm,
  },
  bookCta: {
    backgroundColor: Colors.accent,
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  catSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginVertical: 4,
  },
  catPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  highlightsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    gap: 16,
  },
  highlightItem: {
    flexDirection: 'column',
    gap: 2,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  highlightText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
