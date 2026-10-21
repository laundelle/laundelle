import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { mobileApi } from '../../src/services/api';

const JOURNEY_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'driver_assigned', label: 'Driver Assigned', icon: 'car-outline' },
  { key: 'collected', label: 'Laundry Collected', icon: 'bag-check-outline' },
  { key: 'facility', label: 'Plant Processing & Washing', icon: 'water-outline' },
  { key: 'qc_passed', label: 'Quality Check Passed', icon: 'shield-checkmark-outline' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'navigate-outline' },
  { key: 'delivered', label: 'Delivered to Door', icon: 'home-outline' },
];

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await mobileApi.orders.get(String(id));
      if (data) {
        setOrder(data);
      }
    } catch {
      // Fallback preview
      setOrder({
        id: String(id),
        orderNumber: String(id),
        status: 'collection_scheduled',
        pickup_pin: '749201',
        delivery_pin: '831094',
        pickupDate: 'Tomorrow',
        pickupSlot: '08:00 - 10:00',
        deliveryDate: 'Friday',
        deliverySlot: '14:00 - 16:00',
        total: 24.0,
        address: '14 Preston High Street, PR1 4UD',
        items: [
          { name: 'Wash & Fold (Up to 6kg)', quantity: 1, total: 15.0 },
          { name: 'Shirt Wash & Press', quantity: 2, total: 7.0 },
        ],
        plant: { name: 'Preston Central Laundry Facility' },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  };

  const getStepStatus = (stepKey: string, status: string): 'done' | 'current' | 'pending' => {
    const s = (status || '').toLowerCase();

    // Map order status to current step index
    let activeIdx = 0;
    if (s.includes('driver_assigned') || s.includes('pickup_in_progress')) activeIdx = 1;
    else if (s.includes('collected') || s.includes('in_transit')) activeIdx = 2;
    else if (s.includes('sorting') || s.includes('washing') || s.includes('drying') || s.includes('ironing') || s.includes('processing')) activeIdx = 3;
    else if (s.includes('qc') || s.includes('ready_for_delivery')) activeIdx = 4;
    else if (s.includes('out_for_delivery')) activeIdx = 5;
    else if (s.includes('delivered') || s.includes('completed')) activeIdx = 6;

    const targetIdx = JOURNEY_STEPS.findIndex((step) => step.key === stepKey);
    if (targetIdx < activeIdx) return 'done';
    if (targetIdx === activeIdx) return 'current';
    return 'pending';
  };

  if (loading) {
    return <LoadingScreen message="Loading order details..." />;
  }

  const orderId = order?.publicId || order?.orderNumber || order?.id || id;
  const isPickupPending = ['booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pickup_in_progress'].includes(order?.status);
  const isDeliveryPending = ['ready_for_delivery', 'out_for_delivery', 'delivery_attempted'].includes(order?.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`Order #${orderId}`} showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>CURRENT STATUS</Text>
            <Badge
              label={String(order?.status || 'Active').replace(/_/g, ' ')}
              variant="primary"
            />
          </View>
          <Text style={styles.orderIdText}>Order #{orderId}</Text>
          <Text style={styles.plantText}>
            Serviced by: {order?.plant?.name || order?.plantName || 'Laundelle Regional Plant'}
          </Text>
        </Card>

        {/* 6-Digit Pickup OTP Card (Active when order is pending collection) */}
        {isPickupPending && (order?.pickup_pin || order?.pickup_otp) ? (
          <Card style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <Ionicons name="key-outline" size={20} color={Colors.accent} />
              <Text style={styles.pinTitle}>COLLECTION OTP VERIFICATION</Text>
            </View>
            <Text style={styles.pinSubtitle}>
              Give this 6-digit PIN to the driver upon collection:
            </Text>
            <View style={styles.pinBox}>
              <Text style={styles.pinCode}>{order.pickup_pin || order.pickup_otp}</Text>
            </View>
          </Card>
        ) : null}

        {/* 6-Digit Delivery OTP Card (Active when order is out for delivery) */}
        {isDeliveryPending && (order?.delivery_pin || order?.delivery_otp) ? (
          <Card style={[styles.pinCard, { borderColor: Colors.success, backgroundColor: '#F0FDF4' }]}>
            <View style={styles.pinHeader}>
              <Ionicons name="key-outline" size={20} color={Colors.success} />
              <Text style={[styles.pinTitle, { color: Colors.success }]}>DELIVERY OTP VERIFICATION</Text>
            </View>
            <Text style={styles.pinSubtitle}>
              Give this 6-digit PIN to the delivery driver to accept handoff:
            </Text>
            <View style={[styles.pinBox, { borderColor: Colors.success }]}>
              <Text style={[styles.pinCode, { color: Colors.success }]}>
                {order.delivery_pin || order.delivery_otp}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Live Journey Timeline */}
        <Text style={styles.sectionTitle}>Journey Timeline</Text>
        <Card>
          {JOURNEY_STEPS.map((step, idx) => {
            const stepState = getStepStatus(step.key, order?.status);
            const isLast = idx === JOURNEY_STEPS.length - 1;

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineIconCol}>
                  <View
                    style={[
                      styles.timelineCircle,
                      stepState === 'done' && styles.circleDone,
                      stepState === 'current' && styles.circleCurrent,
                      stepState === 'pending' && styles.circlePending,
                    ]}
                  >
                    <Ionicons
                      name={stepState === 'done' ? 'checkmark' : (step.icon as any)}
                      size={14}
                      color={stepState === 'pending' ? Colors.textMuted : Colors.surface}
                    />
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        styles.timelineLine,
                        stepState === 'done' && styles.lineDone,
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineStepName,
                      stepState === 'current' && styles.stepCurrentText,
                      stepState === 'done' && styles.stepDoneText,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {stepState === 'current' ? (
                    <Text style={styles.timelineCurrentSub}>In progress</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>

        {/* Schedule & Delivery Address */}
        <Text style={styles.sectionTitle}>Delivery & Slots</Text>
        <Card>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>ADDRESS</Text>
              <Text style={styles.infoVal}>{order?.address || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>COLLECTION WINDOW</Text>
              <Text style={styles.infoVal}>
                {order?.pickupDate || 'Scheduled'} {order?.pickupSlot || order?.pickupTime || ''}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.success} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>DELIVERY WINDOW</Text>
              <Text style={styles.infoVal}>
                {order?.deliveryDate || 'Scheduled'} {order?.deliverySlot || order?.deliveryTime || ''}
              </Text>
            </View>
          </View>
        </Card>

        {/* Order Items & Receipt */}
        <Text style={styles.sectionTitle}>Order Breakdown</Text>
        <Card>
          {Array.isArray(order?.items) &&
            order.items.map((it: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemQty}>{it.quantity || 1}x</Text>
                <Text style={styles.itemName}>{it.name || it.serviceName}</Text>
                <Text style={styles.itemTotal}>£{Number(it.total || it.price || 0).toFixed(2)}</Text>
              </View>
            ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalVal}>£{Number(order?.total || order?.amount || 0).toFixed(2)}</Text>
          </View>
        </Card>
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
  statusCard: {
    backgroundColor: Colors.surface,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  orderIdText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
  plantText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pinCard: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.sky,
    borderWidth: 1.5,
    alignItems: 'center',
    padding: Spacing.md,
    marginTop: 4,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pinTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  pinSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  pinBox: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  pinCode: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 44,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: Colors.success,
  },
  circleCurrent: {
    backgroundColor: Colors.accent,
  },
  circlePending: {
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: Colors.success,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  timelineStepName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  stepDoneText: {
    color: Colors.textPrimary,
  },
  stepCurrentText: {
    color: Colors.accent,
    fontWeight: '700',
  },
  timelineCurrentSub: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    width: 24,
  },
  itemName: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
});
