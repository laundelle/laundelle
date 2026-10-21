import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { useOpsAuth } from '../../src/context/AuthContext';
import { opsApi } from '../../src/services/api';

const STAGE_FILTERS = [
  { key: 'all', label: 'All Facility' },
  { key: 'intake', label: 'Dock Intake' },
  { key: 'washing', label: 'Washing' },
  { key: 'drying', label: 'Drying' },
  { key: 'ironing', label: 'Ironing' },
  { key: 'qc_ready', label: 'QC Ready' },
];

export default function ProcessorDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useOpsAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await opsApi.processor.getJobs();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch {
      // Fallback demo queue for processor workflow testing
      setOrders([
        {
          id: 'ORD-7K9A2P',
          orderNumber: 'ORD-7K9A2P',
          status: 'received_at_facility',
          stage: 'received_at_facility',
          qrTagId: 'BAG-7K9A2P',
          weightKg: 5.4,
          bagCount: 1,
          customerName: 'Sarah Jenkins',
          serviceType: 'Wash & Fold',
          deliveryDate: 'Tomorrow 14:00',
        },
        {
          id: 'ORD-5X1N8K',
          orderNumber: 'ORD-5X1N8K',
          status: 'washing',
          stage: 'washing',
          qrTagId: 'BAG-5X1N8K',
          weightKg: 8.2,
          bagCount: 2,
          customerName: 'Marcus Brown',
          serviceType: 'Duvets & Linens',
          machineId: 'WASHER-04',
          deliveryDate: 'Friday 10:00',
        },
        {
          id: 'ORD-3P9W7L',
          orderNumber: 'ORD-3P9W7L',
          status: 'qc_ready',
          stage: 'qc_ready',
          qrTagId: 'BAG-3P9W7L',
          weightKg: 3.1,
          bagCount: 1,
          customerName: 'Eleanor Vance',
          serviceType: 'Dry Clean & Press',
          deliveryDate: 'Today 18:00',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'intake') return o.status === 'received_at_facility' || o.status === 'laundry_collected';
    if (selectedFilter === 'washing') return o.status === 'washing' || o.status === 'sorting';
    if (selectedFilter === 'drying') return o.status === 'drying';
    if (selectedFilter === 'ironing') return o.status === 'ironing' || o.status === 'folding';
    if (selectedFilter === 'qc_ready') return o.status === 'qc_ready' || o.status === 'quality_check';
    return true;
  });

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'qc_ready':
      case 'quality_check':
        return 'warning';
      case 'ready_for_delivery':
        return 'success';
      case 'washing':
      case 'drying':
      case 'ironing':
        return 'info';
      default:
        return 'primary';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Plant Processing"
        roleBadge="FACILITY OPERATOR"
        rightAction={
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Sign Out', 'Sign out of Processor Terminal?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]);
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        }
      />

      {/* Facility Header Card */}
      <View style={styles.facilityBanner}>
        <View style={styles.facilityIconCircle}>
          <Ionicons name="business" size={24} color={Colors.surface} />
        </View>
        <View style={styles.facilityTextCol}>
          <Text style={styles.facilityTitle}>
            {user?.plantName || 'Regional Plant Facility #01'}
          </Text>
          <Text style={styles.operatorText}>
            Operator: {user?.name || 'Staff Member'} ({user?.id || 'PROC-01'})
          </Text>
        </View>
        <TouchableOpacity
          style={styles.quickScanBtn}
          onPress={() => router.push('/(processor)/scan')}
        >
          <Ionicons name="qr-code" size={18} color={Colors.surface} />
          <Text style={styles.quickScanText}>Intake</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STAGE_FILTERS.map((f) => {
            const isSelected = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedFilter(f.key)}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon="layers-outline"
            title="No Orders in this Stage"
            message="There are no active orders currently queued in this stage for your facility."
            actionTitle="Scan New Intake"
            onAction={() => router.push('/(processor)/scan')}
          />
        ) : (
          filteredOrders.map((order) => {
            const orderId = order.publicId || order.orderNumber || order.id;
            const isQcReady = order.status === 'qc_ready';

            return (
              <Card key={orderId} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderId}>#{orderId}</Text>
                    <Text style={styles.tagText}>QR Tag: {order.qrTagId || 'N/A'}</Text>
                  </View>
                  <Badge
                    label={String(order.status || 'Received').replace(/_/g, ' ')}
                    variant={getStageBadgeVariant(order.status)}
                  />
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>SERVICE</Text>
                    <Text style={styles.metaVal}>{order.serviceType || 'Standard Wash'}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>WEIGHT</Text>
                    <Text style={styles.metaVal}>{order.weightKg ? `${order.weightKg} kg` : 'Unweighted'}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>BAGS</Text>
                    <Text style={styles.metaVal}>{order.bagCount || 1} Bag</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {isQcReady ? (
                    <Button
                      title="Inspect & Quality Check"
                      variant="warning"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => router.push(`/(processor)/qc/${orderId}`)}
                      icon={<Ionicons name="shield-checkmark" size={16} color={Colors.surface} />}
                    />
                  ) : (
                    <Button
                      title="Manage Processing Stage"
                      variant="primary"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => router.push(`/(processor)/order/${orderId}`)}
                      icon={<Ionicons name="arrow-forward" size={16} color={Colors.surface} />}
                    />
                  )}
                </View>
              </Card>
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
  logoutBtn: {
    padding: 6,
  },
  facilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  facilityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityTextCol: {
    flex: 1,
  },
  facilityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.surface,
  },
  operatorText: {
    fontSize: 11,
    color: Colors.ice,
    marginTop: 2,
  },
  quickScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.processor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  quickScanText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.processor,
    borderColor: Colors.processor,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.surface,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: 8,
  },
  orderCard: {
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  tagText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardAlt,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
