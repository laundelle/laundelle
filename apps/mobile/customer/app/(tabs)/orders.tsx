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
import { Header } from '../../src/components/Header';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await mobileApi.orders.get();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const activeOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );
  const completedOrders = orders.filter(
    (o) => o.status === 'completed' || o.status === 'cancelled'
  );

  const displayed = tab === 'active' ? activeOrders : completedOrders;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'success';
      case 'cancelled':
      case 'pickup_failed':
      case 'delivery_failed':
        return 'danger';
      case 'washing':
      case 'drying':
      case 'ironing':
      case 'sorting':
      case 'processing':
        return 'warning';
      case 'out_for_delivery':
      case 'pickup_in_progress':
      case 'laundry_collected':
        return 'info';
      default:
        return 'primary';
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="My Orders" />
        <View style={styles.authPromptContainer}>
          <Ionicons name="lock-closed-outline" size={56} color={Colors.accent} />
          <Text style={styles.authTitle}>Sign In to View Orders</Text>
          <Text style={styles.authSubtitle}>
            Track real-time collection, laundry processing, and delivery status.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={styles.signInBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="My Orders" />

      {/* Tabs Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setTab('active')}
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('completed')}
          style={[styles.tabBtn, tab === 'completed' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>
            History ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {displayed.length === 0 ? (
          <EmptyState
            icon={tab === 'active' ? 'cube-outline' : 'archive-outline'}
            title={tab === 'active' ? 'No Active Orders' : 'No Order History'}
            message={
              tab === 'active'
                ? 'You do not have any active laundry collections or deliveries scheduled.'
                : 'Completed orders will appear here once delivered.'
            }
            actionTitle="Book a Collection"
            onAction={() => router.push('/booking')}
          />
        ) : (
          displayed.map((order) => {
            const canonicalId = order.publicId || order.orderNumber || order.id;
            return (
              <TouchableOpacity
                key={canonicalId}
                activeOpacity={0.85}
                style={styles.orderCard}
                onPress={() => router.push(`/orders/${canonicalId}`)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>#{canonicalId}</Text>
                    <Text style={styles.orderDate}>
                      {order.created_at || order.createdAt
                        ? new Date(order.created_at || order.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recent'}
                    </Text>
                  </View>
                  <Badge
                    label={String(order.status || 'Pending').replace(/_/g, ' ')}
                    variant={getStatusVariant(order.status)}
                  />
                </View>

                {/* Pickup & Delivery Window */}
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleCol}>
                    <Text style={styles.scheduleLabel}>COLLECTION</Text>
                    <Text style={styles.scheduleVal}>
                      {order.pickupDate || 'Scheduled'} {order.pickupSlot || order.pickupTime || ''}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                  <View style={styles.scheduleCol}>
                    <Text style={styles.scheduleLabel}>DELIVERY</Text>
                    <Text style={styles.scheduleVal}>
                      {order.deliveryDate || 'Scheduled'} {order.deliverySlot || order.deliveryTime || ''}
                    </Text>
                  </View>
                </View>

                {/* Footer with Total and View Tracking */}
                <View style={styles.cardFooter}>
                  <Text style={styles.orderTotal}>
                    £{Number(order.total || order.amount || 0).toFixed(2)}
                  </Text>
                  <View style={styles.viewLink}>
                    <Text style={styles.viewLinkText}>Track Details</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContainer: {
    padding: Spacing.md,
    gap: 12,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  scheduleCol: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  scheduleVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  authSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: Spacing.xl,
  },
  signInBtn: {
    minWidth: 180,
  },
});
