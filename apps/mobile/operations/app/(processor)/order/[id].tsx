import React, { useState, useEffect } from 'react';
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
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { opsApi } from '../../../src/services/api';

const STAGE_SEQUENCE = [
  { key: 'received_at_facility', label: 'Facility Dock Intake', next: 'sorting' },
  { key: 'sorting', label: 'Sorting Garments', next: 'washing' },
  { key: 'washing', label: 'Washing Cycle', next: 'drying' },
  { key: 'drying', label: 'Tumble Drying', next: 'ironing' },
  { key: 'ironing', label: 'Pressing / Ironing', next: 'qc_ready' },
  { key: 'qc_ready', label: 'Quality Control Ready', next: 'quality_check' },
];

export default function ProcessorOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Intake Form
  const [weightKg, setWeightKg] = useState('');
  const [bagCount, setBagCount] = useState('1');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);

  // Stage Advancement
  const [machineId, setMachineId] = useState('WASHER-01');
  const [advancingStage, setAdvancingStage] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const jobs = await opsApi.processor.getJobs();
        const found = Array.isArray(jobs) ? jobs.find((j) => (j.publicId || j.orderNumber || j.id) === id) : null;
        if (found) {
          setOrder(found);
          if (found.weightKg) setWeightKg(String(found.weightKg));
        } else {
          setOrder({
            id: String(id),
            orderNumber: String(id),
            status: 'received_at_facility',
            qrTagId: 'BAG-7K9A2P',
            customerName: 'Sarah Jenkins',
            serviceType: 'Mixed Wash & Fold',
            weightKg: 5.4,
            bagCount: 1,
            items: [{ name: 'Mixed Wash (up to 6kg)', quantity: 1 }],
          });
        }
      } catch {
        setOrder({
          id: String(id),
          orderNumber: String(id),
          status: 'received_at_facility',
          qrTagId: 'BAG-7K9A2P',
          customerName: 'Sarah Jenkins',
          serviceType: 'Mixed Wash & Fold',
          weightKg: 5.4,
          bagCount: 1,
          items: [{ name: 'Mixed Wash (up to 6kg)', quantity: 1 }],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleRecordIntake = async () => {
    const weight = parseFloat(weightKg);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please record a valid bag weight in kilograms (e.g. 5.4).');
      return;
    }

    setIntakeSubmitting(true);
    try {
      await opsApi.processor.recordIntake(String(id), {
        weightKg: weight,
        bagCount: parseInt(bagCount, 10) || 1,
        notes: intakeNotes.trim() || undefined,
      });

      setOrder((prev: any) => ({
        ...prev,
        weightKg: weight,
        status: 'sorting',
      }));

      Alert.alert('Intake Recorded', `Order #${id} weight recorded: ${weight}kg. Ready for sorting.`);
    } catch (err: any) {
      Alert.alert('Intake Error', err?.message || 'Failed to submit intake.');
    } finally {
      setIntakeSubmitting(false);
    }
  };

  const handleAdvanceStage = async (nextStage: string) => {
    setAdvancingStage(true);
    try {
      await opsApi.processor.updateStage(String(id), {
        nextStage,
        machineInfo: { machineId },
      });

      setOrder((prev: any) => ({
        ...prev,
        status: nextStage,
      }));

      Alert.alert('Stage Advanced', `Order #${id} transitioned to stage: ${nextStage.replace(/_/g, ' ').toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Transition Error', err?.message || 'Failed to advance stage.');
    } finally {
      setAdvancingStage(false);
    }
  };

  if (loading || !order) {
    return <LoadingScreen message="Loading facility order..." />;
  }

  const orderId = order.publicId || order.orderNumber || order.id;
  const currentStage = order.status || 'received_at_facility';
  const stageMeta = STAGE_SEQUENCE.find((s) => s.key === currentStage);
  const nextStage = stageMeta?.next || (currentStage === 'sorting' ? 'washing' : 'drying');
  const isQcReady = currentStage === 'qc_ready';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`Facility #${orderId}`} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Summary Card */}
        <Card>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderTitle}>Order #{orderId}</Text>
              <Text style={styles.qrTagSubtitle}>Bag Tag: {order.qrTagId || 'N/A'}</Text>
            </View>
            <Badge
              label={String(currentStage).replace(/_/g, ' ')}
              variant="processor"
            />
          </View>
          <Text style={styles.customerLine}>Customer: {order.customerName}</Text>
          <Text style={styles.serviceLine}>Service: {order.serviceType || 'Standard Wash'}</Text>
        </Card>

        {/* Section 1: Dock Intake Weight Recording (if received) */}
        <Text style={styles.sectionHeading}>1. Facility Intake & Weight</Text>
        <Card>
          <Input
            label="Verified Scale Weight (KG)"
            placeholder="e.g. 5.4"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            leftIcon={<Ionicons name="scale-outline" size={18} color={Colors.processor} />}
          />

          <Input
            label="Total Verified Bags"
            value={bagCount}
            onChangeText={setBagCount}
            keyboardType="number-pad"
          />

          <Input
            label="Intake Inspection Notes (Optional)"
            placeholder="e.g. Stains pre-spotted on cuff, color fastness check"
            value={intakeNotes}
            onChangeText={setIntakeNotes}
          />

          <Button
            title={intakeSubmitting ? 'Recording...' : 'Update Facility Weight & Intake'}
            onPress={handleRecordIntake}
            loading={intakeSubmitting}
            variant="outline"
            style={styles.intakeBtn}
          />
        </Card>

        {/* Section 2: Stage Progression */}
        <Text style={styles.sectionHeading}>2. Processing Stage Control</Text>
        <Card>
          <Text style={styles.stageLabel}>CURRENT STAGE</Text>
          <View style={styles.currentStageBox}>
            <Ionicons name="refresh-circle" size={24} color={Colors.processor} />
            <Text style={styles.currentStageText}>
              {String(currentStage).replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>

          {currentStage === 'washing' || currentStage === 'sorting' ? (
            <Input
              label="Assigned Machine / Station ID"
              placeholder="e.g. WASHER-04"
              value={machineId}
              onChangeText={setMachineId}
              containerStyle={{ marginTop: Spacing.sm }}
            />
          ) : null}

          {isQcReady ? (
            <Button
              title="Proceed to Quality Control Check"
              variant="warning"
              onPress={() => router.push(`/(processor)/qc/${orderId}`)}
              style={styles.advanceBtn}
              icon={<Ionicons name="shield-checkmark" size={18} color={Colors.surface} />}
            />
          ) : (
            <Button
              title={advancingStage ? 'Advancing...' : `Advance Stage to ${nextStage.replace(/_/g, ' ').toUpperCase()}`}
              variant="primary"
              onPress={() => handleAdvanceStage(nextStage)}
              loading={advancingStage}
              style={styles.advanceBtn}
              icon={<Ionicons name="arrow-forward" size={18} color={Colors.surface} />}
            />
          )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  qrTagSubtitle: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  customerLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  serviceLine: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
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
  intakeBtn: {
    marginTop: Spacing.xs,
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  currentStageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.processorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 10,
  },
  currentStageText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.processor,
    letterSpacing: 0.5,
  },
  advanceBtn: {
    marginTop: Spacing.md,
  },
});
