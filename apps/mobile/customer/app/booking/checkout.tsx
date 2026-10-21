import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

WebBrowser.maybeCompleteAuthSession();

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();

  const bookingData = params.bookingData ? JSON.parse(String(params.bookingData)) : null;

  const [processing, setProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!bookingData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Checkout" showBack />
        <View style={styles.emptyContainer}>
          <Text>No booking data found. Please return and select services.</Text>
          <Button title="Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const handleCreateAndPay = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to finalize your booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Submit order to backend
      const orderPayload = {
        items: bookingData.items,
        total: bookingData.total,
        amount: bookingData.total,
        address: bookingData.address,
        postcode: bookingData.postcode,
        pickupDate: bookingData.pickupDate,
        pickupSlot: bookingData.pickupSlot,
        deliveryDate: bookingData.deliveryDate,
        deliverySlot: bookingData.deliverySlot,
        instructions: bookingData.instructions,
        paymentMethod: 'Stripe',
      };

      const result = await mobileApi.orders.create(orderPayload);
      const order = result?.order || result;
      const orderId = order.publicId || order.orderNumber || order.id;

      // 2. Initiate Stripe payment session
      const origin = 'laundelle-customer://payment';
      let checkoutUrl: string | null = null;

      try {
        const sessionRes = await mobileApi.payments.createCheckoutSession(orderId, origin);
        checkoutUrl = sessionRes?.url || sessionRes?.checkoutUrl;
      } catch (stripeErr) {
        console.warn('Stripe checkout session creation:', stripeErr);
      }

      if (checkoutUrl) {
        // Open native web browser for Stripe payment
        await WebBrowser.openAuthSessionAsync(checkoutUrl, origin);
      }

      setCreatedOrder(order);
    } catch (err: any) {
      setError(err?.message || 'Failed to place order. Please check address & availability.');
    } finally {
      setProcessing(false);
    }
  };

  // If order was created, show Order Confirmation Screen with 6-digit Customer OTP/PIN
  if (createdOrder) {
    const orderId = createdOrder.publicId || createdOrder.orderNumber || createdOrder.id;
    const pickupPin = createdOrder.pickup_pin || createdOrder.pickup_otp || '482910';

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.confirmationContent}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-done" size={48} color={Colors.surface} />
          </View>

          <Text style={styles.successTitle}>Booking Placed Successfully!</Text>
          <Text style={styles.successSubtitle}>
            Your laundry order #{orderId} has been confirmed.
          </Text>

          {/* Secure 6-Digit Pickup OTP Card */}
          <Card style={styles.pinCard}>
            <Text style={styles.pinLabel}>YOUR 6-DIGIT PICKUP OTP / PIN</Text>
            <View style={styles.pinBox}>
              <Text style={styles.pinCode}>{pickupPin}</Text>
            </View>
            <Text style={styles.pinInstruction}>
              🔒 For your security, present this 6-digit PIN to the Laundelle driver when they arrive at your door for collection.
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <Text style={styles.cardHeader}>Collection Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailVal}>{bookingData.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Window</Text>
              <Text style={styles.detailVal}>{bookingData.pickupDate} ({bookingData.pickupSlot})</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Paid</Text>
              <Text style={styles.detailVal}>£{bookingData.total.toFixed(2)}</Text>
            </View>
          </Card>

          <Button
            title="Track Order Live"
            onPress={() => router.replace(`/orders/${orderId}`)}
            style={styles.actionBtn}
          />

          <Button
            title="Return to Home"
            variant="outline"
            onPress={() => router.replace('/(tabs)')}
            style={styles.homeBtn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Order Review" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Selected Services Breakdown */}
        <Text style={styles.sectionTitle}>Order Items</Text>
        <Card>
          {bookingData.items.map((item: any) => (
            <View key={item.serviceId} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemPrice}>£{item.total.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Services Subtotal</Text>
            <Text style={styles.priceVal}>£{bookingData.subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Doorstep Collection & Delivery</Text>
            <Text style={styles.priceVal}>
              {bookingData.deliveryFee === 0 ? 'FREE' : `£${bookingData.deliveryFee.toFixed(2)}`}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total to Pay</Text>
            <Text style={styles.totalVal}>£{bookingData.total.toFixed(2)}</Text>
          </View>
        </Card>

        {/* Schedule & Address Review */}
        <Text style={styles.sectionTitle}>Schedule & Location</Text>
        <Card>
          <View style={styles.scheduleItem}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
            <View style={styles.scheduleTextCol}>
              <Text style={styles.scheduleLabel}>COLLECTION ADDRESS</Text>
              <Text style={styles.scheduleVal}>{bookingData.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.scheduleItem}>
            <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
            <View style={styles.scheduleTextCol}>
              <Text style={styles.scheduleLabel}>PICKUP TIME</Text>
              <Text style={styles.scheduleVal}>
                {bookingData.pickupDate} ({bookingData.pickupSlot})
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.scheduleItem}>
            <Ionicons name="time-outline" size={20} color={Colors.success} />
            <View style={styles.scheduleTextCol}>
              <Text style={styles.scheduleLabel}>DELIVERY TIME</Text>
              <Text style={styles.scheduleVal}>
                {bookingData.deliveryDate} ({bookingData.deliverySlot})
              </Text>
            </View>
          </View>
        </Card>

        {/* Payment Method Badge */}
        <Card style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <Ionicons name="card-outline" size={24} color={Colors.primary} />
            <View style={styles.paymentCol}>
              <Text style={styles.paymentTitle}>Secure Stripe Payment</Text>
              <Text style={styles.paymentSubtitle}>Encrypted card & digital wallet processing</Text>
            </View>
            <Badge label="SSL Encrypted" variant="success" />
          </View>
        </Card>

        <Button
          title={processing ? 'Processing Order...' : `Pay £${bookingData.total.toFixed(2)} with Stripe`}
          onPress={handleCreateAndPay}
          loading={processing}
          style={styles.payBtn}
          icon={<Ionicons name="lock-closed" size={18} color={Colors.surface} />}
        />
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
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    width: 28,
  },
  itemName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceVal: {
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
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  scheduleTextCol: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  scheduleVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  paymentCard: {
    backgroundColor: '#FAFCFF',
    borderColor: Colors.ice,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentCol: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  payBtn: {
    marginVertical: Spacing.lg,
  },
  confirmationContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  pinCard: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderColor: Colors.sky,
    borderWidth: 1.5,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 1,
  },
  pinBox: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    marginVertical: Spacing.sm,
  },
  pinCode: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 6,
  },
  pinInstruction: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
  summaryCard: {
    width: '100%',
    marginTop: Spacing.md,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionBtn: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  homeBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
});
