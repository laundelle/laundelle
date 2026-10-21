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
import { QrScannerModal } from '../../../src/components/QrScannerModal';
import { opsApi } from '../../../src/services/api';

const EXCEPTION_REASONS = [
  'Customer unavailable / No answer at door',
  'Premises access blocked (gates / intercom)',
  'Laundry not ready for collection',
  'Customer cancelled order at door',
];

export default function PickupVerificationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [otp, setOtp] = useState('');
  const [qrTagId, setQrTagId] = useState('');
  const [bagCount, setBagCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Exception modal state
  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(EXCEPTION_REASONS[0]);
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [reportingException, setReportingException] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmPickup = async () => {
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit Customer Pickup PIN.');
      return;
    }

    if (!qrTagId.trim()) {
      setErrorMessage('Please scan or enter the Laundry Bag QR Tag ID.');
      return;
    }

    const bags = parseInt(bagCount, 10);
    if (isNaN(bags) || bags < 1) {
      setErrorMessage('Bag count must be at least 1.');
      return;
    }

    setSubmitting(true);

    try {
      // Authoritative backend confirmation
      const result = await opsApi.driver.confirmPickup(String(id), {
        pin: otp,
        otp: otp,
        qrTagId: qrTagId.trim().toUpperCase(),
        bagCount: bags,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Pickup Verified',
        `Order #${id} has been verified and securely collected into facility custody.`,
        [
          {
            text: 'Return to Route',
            onPress: () => router.replace('/(driver)'),
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Verification failed. Please verify the customer PIN or check network.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportFailure = async () => {
    setReportingException(true);
    try {
      await opsApi.driver.failPickup(String(id), {
        reason: selectedReason,
        notes: exceptionNotes.trim() || undefined,
      });

      setExceptionModalVisible(false);
      Alert.alert(
        'Pickup Marked as Failed',
        `Exception recorded: "${selectedReason}". Dispatch & customer have been notified.`,
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
      <Header title="Pickup Verification" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Step 1: 6-Digit OTP Verification */}
        <Card style={styles.stepCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>1. Enter 6-Digit Customer PIN</Text>
          </View>
          <Text style={styles.stepSubtitle}>
            Ask the customer for the 6-digit code shown on their Laundelle app:
          </Text>

          <OtpInput value={otp} onChange={setOtp} length={6} disabled={submitting} />
        </Card>

        {/* Step 2: Bag QR Tag & Bags */}
        <Card style={styles.stepCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="qr-code-outline" size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>2. Attach & Scan Bag QR Tag</Text>
          </View>
          <Text style={styles.stepSubtitle}>
            Fasten a Laundelle tracking tag to the laundry bag and scan or enter the code:
          </Text>

          <View style={styles.qrRow}>
            <Input
              placeholder="e.g. BAG-7K9A2P"
              value={qrTagId}
              onChangeText={(v) => setQrTagId(v.toUpperCase())}
              autoCapitalize="characters"
              containerStyle={styles.qrInputContainer}
            />
            <Button
              title="Scan"
              onPress={() => setScannerVisible(true)}
              variant="secondary"
              size="md"
              icon={<Ionicons name="camera-outline" size={18} color={Colors.primary} />}
              style={styles.scanBtn}
            />
          </View>

          <Input
            label="Total Bags Collected"
            value={bagCount}
            onChangeText={setBagCount}
            keyboardType="number-pad"
          />

          <Input
            label="Driver Pickup Notes (Optional)"
            placeholder="e.g. Heavily soiled shirts included, 1 blue hanger bag"
            value={notes}
            onChangeText={setNotes}
          />
        </Card>

        {/* Submit Button */}
        <Button
          title={submitting ? 'Verifying with Server...' : 'Confirm Doorstep Collection'}
          onPress={handleConfirmPickup}
          loading={submitting}
          style={styles.submitBtn}
          icon={<Ionicons name="checkmark-done" size={20} color={Colors.surface} />}
        />

        {/* Exception / Issue Button */}
        <Button
          title="Report Pickup Issue / Customer Unavailable"
          variant="ghost"
          onPress={() => setExceptionModalVisible(true)}
          style={styles.failBtn}
          textStyle={{ color: Colors.danger }}
          icon={<Ionicons name="warning-outline" size={18} color={Colors.danger} />}
        />
      </ScrollView>

      {/* QR Scanner Camera Modal */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(scannedCode) => setQrTagId(scannedCode)}
        title="Scan Laundry Bag Tag"
        prompt="Position the bag QR tag within the target box"
      />

      {/* Exception Reporting Modal */}
      <Modal visible={exceptionModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Pickup Exception</Text>
              <TouchableOpacity onPress={() => setExceptionModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select reason for collection failure:</Text>

            {EXCEPTION_REASONS.map((reason) => {
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
              placeholder="e.g. Knocked twice and phoned customer at 08:15"
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
  qrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  qrInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  scanBtn: {
    minWidth: 80,
    height: 48,
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
