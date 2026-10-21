import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/theme/colors';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { OtpInput } from '../../../src/components/OtpInput';
import { opsApi } from '../../../src/services/api';

const DELIVERY_EXCEPTION_REASONS = [
  'Customer not at home / No answer',
  'Premises access blocked (intercom / gate)',
  'Wrong delivery address',
  'Customer requested reschedule at door',
];

export default function DeliveryVerificationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [otp, setOtp] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Exception modal state
  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(DELIVERY_EXCEPTION_REASONS[0]);
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [reportingException, setReportingException] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmDelivery = async () => {
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the customer 6-digit Delivery PIN.');
      return;
    }

    if (!recipientName.trim()) {
      setErrorMessage('Please enter the recipient or customer name.');
      return;
    }

    setSubmitting(true);

    try {
      await opsApi.driver.confirmDelivery(String(id), {
        pin: otp,
        otp: otp,
        recipientName: recipientName.trim(),
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Delivery Confirmed',
        `Order #${id} has been successfully delivered and handed over to ${recipientName.trim()}.`,
        [
          {
            text: 'Return to Route',
            onPress: () => router.replace('/(driver)'),
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Delivery verification failed. Please verify the customer PIN.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportFailure = async () => {
    setReportingException(true);
    try {
      await opsApi.driver.failDelivery(String(id), {
        reason: selectedReason,
        notes: exceptionNotes.trim() || undefined,
      });

      setExceptionModalVisible(false);
      Alert.alert(
        'Delivery Marked Failed',
        `Delivery exception registered: "${selectedReason}". Dispatch has been notified.`,
        [
          {
            text: 'Return to Route',
            onPress: () => router.replace('/(driver)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Exception Error', err?.message || 'Failed to submit exception.');
    } finally {
      setReportingException(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Delivery Verification" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Step 1: 6-Digit Delivery OTP */}
        <Card style={styles.stepCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={20} color={Colors.success} />
            <Text style={styles.cardTitle}>1. Enter 6-Digit Delivery PIN</Text>
          </View>
          <Text style={styles.stepSubtitle}>
            Ask the recipient for the 6-digit Delivery PIN shown on their Laundelle order screen:
          </Text>

          <OtpInput value={otp} onChange={setOtp} length={6} disabled={submitting} />
        </Card>

        {/* Step 2: Recipient Details */}
        <Card style={styles.stepCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>2. Recipient Information</Text>
          </View>

          <Input
            label="Name of Person Receiving"
            placeholder="e.g. David Sterling (or Neighbor Mr. Smith)"
            value={recipientName}
            onChangeText={setRecipientName}
          />

          <Input
            label="Delivery Notes (Optional)"
            placeholder="e.g. Handed to customer at front door"
            value={notes}
            onChangeText={setNotes}
          />
        </Card>

        {/* Submit Button */}
        <Button
          title={submitting ? 'Verifying with Server...' : 'Confirm Clean Laundry Delivery'}
          onPress={handleConfirmDelivery}
          loading={submitting}
          variant="success"
          style={styles.submitBtn}
          icon={<Ionicons name="checkmark-done" size={20} color={Colors.surface} />}
        />

        {/* Exception / Issue Button */}
        <Button
          title="Report Delivery Issue / Customer Not Home"
          variant="ghost"
          onPress={() => setExceptionModalVisible(true)}
          style={styles.failBtn}
          textStyle={{ color: Colors.danger }}
          icon={<Ionicons name="warning-outline" size={18} color={Colors.danger} />}
        />
      </ScrollView>

      {/* Exception Reporting Modal */}
      <Modal visible={exceptionModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Delivery Exception</Text>
              <TouchableOpacity onPress={() => setExceptionModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select reason for delivery attempt failure:</Text>

            {DELIVERY_EXCEPTION_REASONS.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selected ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Input
              label="Additional Notes"
              placeholder="e.g. Waited 10 mins outside, phoned twice"
              value={exceptionNotes}
              onChangeText={setExceptionNotes}
              containerStyle={{ marginTop: Spacing.sm }}
            />

            <Button
              title="Submit Exception & Mark Failed"
              variant="danger"
              onPress={handleReportFailure}
              loading={reportingException}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
      </Modal>
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
    fontWeight: '600',
    flex: 1,
  },
  stepCard: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  stepSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  failBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardAlt,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    backgroundColor: Colors.ice,
  },
  reasonText: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
