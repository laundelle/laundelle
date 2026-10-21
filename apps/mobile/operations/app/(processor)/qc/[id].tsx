import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../src/theme/colors';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { opsApi } from '../../../src/services/api';

const CHECKLIST_ITEMS = [
  { id: 'clean', label: 'All visible stains removed & garments thoroughly clean' },
  { id: 'integrity', label: 'No missing buttons, zipper damage, or fabric tears' },
  { id: 'finishing', label: 'Pressed & folded to Laundelle standards / hung as requested' },
  { id: 'packaging', label: 'Placed in protective bag with order QR tag sealed' },
];

export default function QualityControlScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    clean: true,
    integrity: true,
    finishing: true,
    packaging: true,
  });

  const [qcNotes, setQcNotes] = useState('');
  const [rewashReason, setRewashReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const allPassed = CHECKLIST_ITEMS.every((item) => checkedItems[item.id]);

  const handlePassQc = async () => {
    if (!allPassed) {
      Alert.alert(
        'Checklist Incomplete',
        'All quality inspection criteria must be verified before passing this order for delivery.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await opsApi.processor.qualityCheck(String(id), {
        status: 'passed',
        notes: qcNotes.trim() || undefined,
        checklist: checkedItems,
      });

      Alert.alert(
        'Quality Check Passed',
        `Order #${id} has passed quality inspection and is now queued for delivery dispatch.`,
        [
          {
            text: 'Return to Plant Queue',
            onPress: () => router.replace('/(processor)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('QC Error', err?.message || 'Failed to submit quality check.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRewash = async () => {
    if (!rewashReason.trim()) {
      Alert.alert('Rewash Reason Required', 'Please enter why this order needs to be rewashed.');
      return;
    }

    setSubmitting(true);
    try {
      await opsApi.processor.qualityCheck(String(id), {
        status: 'rewash',
        notes: qcNotes.trim() || undefined,
        reason: rewashReason.trim(),
      });

      Alert.alert(
        'Sent for Rewash',
        `Order #${id} has been returned to the washing queue with notes.`,
        [
          {
            text: 'Return to Plant Queue',
            onPress: () => router.replace('/(processor)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('QC Error', err?.message || 'Failed to submit rewash.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`QC Check #${id}`} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <Card style={styles.topCard}>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.warning} />
            <Text style={styles.titleText}>Garment Quality Assurance</Text>
          </View>
          <Text style={styles.subtitleText}>
            Inspect all items carefully against Laundelle five-star garment presentation standards.
          </Text>
        </Card>

        {/* Inspection Checklist */}
        <Text style={styles.sectionHeading}>Quality Inspection Criteria</Text>
        <Card>
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = Boolean(checkedItems[item.id]);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleCheck(item.id)}
                style={styles.checkRow}
              >
                <Ionicons
                  name={isChecked ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isChecked ? Colors.success : Colors.borderDark}
                />
                <Text style={[styles.checkLabel, isChecked && styles.checkLabelDone]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        <Card>
          <Input
            label="Inspector Notes (Optional)"
            placeholder="e.g. Silk blouse steamed with gentle heat"
            value={qcNotes}
            onChangeText={setQcNotes}
          />
        </Card>

        {/* Pass QC Action */}
        <Button
          title={submitting ? 'Submitting...' : 'Pass QC & Ready for Delivery'}
          variant="success"
          onPress={handlePassQc}
          loading={submitting}
          style={styles.passBtn}
          icon={<Ionicons name="checkmark-done" size={20} color={Colors.surface} />}
        />

        {/* Rewash Form */}
        <View style={styles.rewashBox}>
          <Text style={styles.rewashTitle}>Requires Rewash?</Text>
          <Input
            placeholder="Enter reason: stubborn collar stain, lint, etc."
            value={rewashReason}
            onChangeText={setRewashReason}
          />
          <Button
            title="Return Order for Rewash"
            variant="danger"
            size="sm"
            onPress={handleRewash}
            loading={submitting}
            icon={<Ionicons name="refresh" size={16} color={Colors.surface} />}
          />
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
  scrollContent: {
    padding: Spacing.md,
  },
  topCard: {
    backgroundColor: Colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  subtitleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  checkLabelDone: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  passBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  rewashBox: {
    backgroundColor: Colors.cardAlt,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  rewashTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
    marginBottom: Spacing.xs,
  },
});
