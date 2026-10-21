import React, { useState, useEffect } from 'react';
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
import { isValidUkPostcodeOrDistrict, normalizeUkPostcode } from '@laundelle/utils';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

interface BasketItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const AVAILABLE_SERVICES = [
  { id: 'SVC-WF-6KG', name: 'Wash & Fold (Up to 6kg)', price: 15.0 },
  { id: 'SVC-WF-10KG', name: 'Family Wash (Up to 10kg)', price: 24.0 },
  { id: 'SVC-DC-SUIT', name: '2-Piece Suit Dry Clean', price: 16.5 },
  { id: 'SVC-DC-SHIRT', name: 'Shirt Wash & Press', price: 3.5 },
  { id: 'SVC-BD-DUVET', name: 'Double Duvet Cleaning', price: 22.0 },
];

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '14:00 - 16:00',
  '18:00 - 20:00',
];

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();

  const [basket, setBasket] = useState<Record<string, number>>({});
  const [addressLine, setAddressLine] = useState('');
  const [postcode, setPostcode] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupSlot, setPickupSlot] = useState(TIME_SLOTS[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliverySlot, setDeliverySlot] = useState(TIME_SLOTS[1]);
  const [instructions, setInstructions] = useState('');
  const [coverageChecking, setCoverageChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default dates: Pickup tomorrow, Delivery 2 days later
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);

    setPickupDate(tomorrow.toISOString().split('T')[0]);
    setDeliveryDate(dayAfter.toISOString().split('T')[0]);

    if (params.preselectedId) {
      setBasket({ [String(params.preselectedId)]: 1 });
    } else {
      setBasket({ 'SVC-WF-6KG': 1 });
    }

    if (user?.addresses && user.addresses.length > 0) {
      const primary: any = user.addresses[0];
      const streetPart = primary.street ? `${primary.flatNo ? primary.flatNo + ', ' : ''}${primary.street}` : (primary.line1 || primary.address || '');
      setAddressLine(streetPart);
      setPostcode(primary.pincode || primary.postcode || '');
    }
  }, [params.preselectedId, user]);

  const updateQty = (id: string, delta: number) => {
    setBasket((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[id];
      } else {
        copy[id] = next;
      }
      return copy;
    });
  };

  const calculateSubtotal = () => {
    let sum = 0;
    Object.entries(basket).forEach(([id, qty]) => {
      const item = AVAILABLE_SERVICES.find((s) => s.id === id);
      if (item) sum += item.price * qty;
    });
    return sum;
  };

  const handleProceed = async () => {
    setError(null);

    const subtotal = calculateSubtotal();
    if (subtotal <= 0) {
      setError('Please select at least one laundry service.');
      return;
    }

    if (!addressLine.trim()) {
      setError('Please provide your street address.');
      return;
    }

    if (!isValidUkPostcodeOrDistrict(postcode.trim())) {
      setError('Please enter a valid UK postcode (e.g. PR1 4UD).');
      return;
    }

    const canonicalPostcode = normalizeUkPostcode(postcode.trim());

    // Validate coverage via backend before proceeding
    setCoverageChecking(true);
    try {
      const coverage = await mobileApi.customer.checkCoverage(canonicalPostcode);
      const isAvailable = Boolean(coverage?.available || coverage?.covered || coverage?.plant);

      if (!isAvailable) {
        setError(`We currently do not service postcode ${canonicalPostcode}. Please check our coverage area.`);
        setCoverageChecking(false);
        return;
      }
    } catch {
      // Allow proceeding if offline with standard notice
    } finally {
      setCoverageChecking(false);
    }

    const itemsSummary = Object.entries(basket).map(([id, qty]) => {
      const svc = AVAILABLE_SERVICES.find((s) => s.id === id)!;
      return {
        serviceId: id,
        name: svc.name,
        unitPrice: svc.price,
        quantity: qty,
        total: svc.price * qty,
      };
    });

    const deliveryFee = subtotal >= 25 ? 0 : 3.95;
    const grandTotal = subtotal + deliveryFee;

    // Navigate to checkout review screen
    router.push({
      pathname: '/booking/checkout',
      params: {
        bookingData: JSON.stringify({
          items: itemsSummary,
          subtotal,
          deliveryFee,
          total: grandTotal,
          address: `${addressLine.trim()}, ${canonicalPostcode}`,
          postcode: canonicalPostcode,
          pickupDate,
          pickupSlot,
          deliveryDate,
          deliverySlot,
          instructions: instructions.trim(),
        }),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Schedule Collection" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Step 1: Select Services */}
        <Text style={styles.stepTitle}>1. Select Services</Text>
        <Card>
          {AVAILABLE_SERVICES.map((svc) => {
            const qty = basket[svc.id] || 0;
            return (
              <View key={svc.id} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.servicePrice}>£{svc.price.toFixed(2)}</Text>
                </View>

                <View style={styles.counterRow}>
                  <TouchableOpacity
                    onPress={() => updateQty(svc.id, -1)}
                    style={[styles.counterBtn, qty === 0 && styles.counterBtnDisabled]}
                    disabled={qty === 0}
                  >
                    <Ionicons name="remove" size={18} color={qty > 0 ? Colors.primary : Colors.textMuted} />
                  </TouchableOpacity>

                  <Text style={styles.counterVal}>{qty}</Text>

                  <TouchableOpacity
                    onPress={() => updateQty(svc.id, 1)}
                    style={styles.counterBtn}
                  >
                    <Ionicons name="add" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Estimated Subtotal:</Text>
            <Text style={styles.subtotalValue}>£{calculateSubtotal().toFixed(2)}</Text>
          </View>
        </Card>

        {/* Step 2: Doorstep Address */}
        <Text style={styles.stepTitle}>2. Collection Address</Text>
        <Card>
          <Input
            label="Street Address / Building"
            placeholder="e.g. 14 Preston High Street, Flat 2B"
            value={addressLine}
            onChangeText={setAddressLine}
          />
          <Input
            label="UK Postcode"
            placeholder="e.g. PR1 4UD"
            value={postcode}
            onChangeText={(v) => setPostcode(v.toUpperCase())}
            autoCapitalize="characters"
          />
          <Input
            label="Driver Access Notes (Optional)"
            placeholder="e.g. Ring buzzer 4, leave in safe porch"
            value={instructions}
            onChangeText={setInstructions}
          />
        </Card>

        {/* Step 3: Slots Selection */}
        <Text style={styles.stepTitle}>3. Time Slots</Text>
        <Card>
          <Text style={styles.slotSectionHeader}>Pickup Slot ({pickupDate})</Text>
          <View style={styles.slotGrid}>
            {TIME_SLOTS.map((slot) => {
              const selected = pickupSlot === slot;
              return (
                <TouchableOpacity
                  key={`pickup-${slot}`}
                  onPress={() => setPickupSlot(slot)}
                  style={[styles.slotPill, selected && styles.slotPillSelected]}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.slotSectionHeader}>Delivery Slot ({deliveryDate})</Text>
          <View style={styles.slotGrid}>
            {TIME_SLOTS.map((slot) => {
              const selected = deliverySlot === slot;
              return (
                <TouchableOpacity
                  key={`deliv-${slot}`}
                  onPress={() => setDeliverySlot(slot)}
                  style={[styles.slotPill, selected && styles.slotPillSelected]}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button
          title={coverageChecking ? 'Verifying Coverage...' : 'Review & Checkout'}
          onPress={handleProceed}
          loading={coverageChecking}
          style={styles.proceedBtn}
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
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
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
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  serviceInfo: {
    flex: 1,
    paddingRight: 10,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  servicePrice: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.ice,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterVal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  subtotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  slotSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  slotTextSelected: {
    color: Colors.surface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  proceedBtn: {
    marginVertical: Spacing.lg,
  },
});
