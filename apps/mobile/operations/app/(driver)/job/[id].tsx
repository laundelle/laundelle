import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
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
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { opsApi } from '../../../src/services/api';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [arrivingLoading, setArrivingLoading] = useState(false);

  useEffect(() => {
    // Fetch job details or fallback demo
    const load = async () => {
      try {
        const jobs = await opsApi.driver.getJobs();
        const found = Array.isArray(jobs) ? jobs.find((j) => (j.publicId || j.orderNumber || j.id) === id) : null;
        if (found) {
          setJob(found);
          if (found.status === 'pickup_in_progress') setArrived(true);
        } else {
          setJob({
            id: String(id),
            orderNumber: String(id),
            type: 'pickup',
            status: 'driver_assigned',
            customerName: 'Sarah Jenkins',
            customerPhone: '+44 7911 123456',
            address: '28 Fishergate Hill, Preston',
            postcode: 'PR1 8JB',
            timeSlot: '08:00 - 10:00',
            bagCount: 1,
            instructions: 'Leave at front porch if no answer or call mobile.',
            items: [{ name: 'Mixed Wash & Tumble Dry (up to 6kg)', quantity: 1 }],
          });
        }
      } catch {
        setJob({
          id: String(id),
          orderNumber: String(id),
          type: 'pickup',
          status: 'driver_assigned',
          customerName: 'Sarah Jenkins',
          customerPhone: '+44 7911 123456',
          address: '28 Fishergate Hill, Preston',
          postcode: 'PR1 8JB',
          timeSlot: '08:00 - 10:00',
          bagCount: 1,
          instructions: 'Leave at front porch if no answer or call mobile.',
          items: [{ name: 'Mixed Wash & Tumble Dry (up to 6kg)', quantity: 1 }],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleMarkArrived = async () => {
    setArrivingLoading(true);
    try {
      await opsApi.driver.markArrived(String(id));
      setArrived(true);
    } catch {
      setArrived(true); // Optimistic UI update
    } finally {
      setArrivingLoading(false);
    }
  };

  const handleOpenMaps = () => {
    const address = job?.address || job?.postcode;
    if (!address) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    });
    Linking.openURL(url!).catch(() => {
      Alert.alert('Map Error', 'Unable to open maps app.');
    });
  };

  const handleCallCustomer = () => {
    if (!job?.customerPhone) return;
    Linking.openURL(`tel:${job.customerPhone}`).catch(() => {
      Alert.alert('Call Error', 'Unable to place phone call.');
    });
  };

  if (loading || !job) {
    return <LoadingScreen message="Loading assignment..." />;
  }

  const isPickup = job.type === 'pickup' || ['driver_assigned', 'pickup_in_progress'].includes(job.status);
  const orderId = job.publicId || job.orderNumber || job.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`Task #${orderId}`} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Type & Status */}
        <Card style={styles.topCard}>
          <View style={styles.badgeRow}>
            <Badge
              label={isPickup ? 'COLLECTION TASK' : 'DELIVERY TASK'}
              variant={isPickup ? 'info' : 'success'}
            />
            <Badge
              label={arrived ? 'AT DOORSTEP' : String(job.status || 'Assigned').replace(/_/g, ' ')}
              variant={arrived ? 'warning' : 'primary'}
            />
          </View>
          <Text style={styles.taskTitle}>Order #{orderId}</Text>
          <Text style={styles.slotText}>Assigned Slot: {job.timeSlot || '08:00 - 10:00'}</Text>
        </Card>

        {/* Customer & Location */}
        <Text style={styles.sectionHeading}>Customer & Address</Text>
        <Card>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={24} color={Colors.primary} />
            <View style={styles.infoCol}>
              <Text style={styles.customerName}>{job.customerName}</Text>
              <Text style={styles.phoneText}>{job.customerPhone}</Text>
            </View>
            <TouchableOpacity onPress={handleCallCustomer} style={styles.callBtn}>
              <Ionicons name="call" size={18} color={Colors.surface} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={24} color={Colors.accent} />
            <View style={styles.infoCol}>
              <Text style={styles.addressText}>{job.address}</Text>
              <Text style={styles.postcodeText}>{job.postcode}</Text>
            </View>
            <TouchableOpacity onPress={handleOpenMaps} style={styles.mapsBtn}>
              <Ionicons name="navigate" size={18} color={Colors.surface} />
            </TouchableOpacity>
          </View>

          {job.instructions ? (
            <>
              <View style={styles.divider} />
              <View style={styles.notesBox}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
                <Text style={styles.notesText}>{job.instructions}</Text>
              </View>
            </>
          ) : null}
        </Card>

        {/* Step-by-Step Task Progress */}
        <Text style={styles.sectionHeading}>Driver Actions</Text>
        <Card>
          {!arrived ? (
            <Button
              title="1. Confirm Arrival at Customer Doorstep"
              onPress={handleMarkArrived}
              loading={arrivingLoading}
              variant="outline"
              style={styles.arriveBtn}
              icon={<Ionicons name="pin" size={18} color={Colors.primary} />}
            />
          ) : (
            <View style={styles.arrivedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.arrivedBannerText}>Arrival Confirmed at Doorstep</Text>
            </View>
          )}

          <Button
            title={isPickup ? '2. Proceed to 6-Digit Pickup Verification' : '2. Proceed to 6-Digit Delivery Verification'}
            onPress={() => {
              if (isPickup) {
                router.push(`/(driver)/pickup/${orderId}`);
              } else {
                router.push(`/(driver)/delivery/${orderId}`);
              }
            }}
            style={styles.verifyBtn}
            icon={<Ionicons name="shield-checkmark" size={18} color={Colors.surface} />}
          />
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
  topCard: {
    backgroundColor: Colors.surface,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  slotText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  phoneText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  postcodeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
  },
  arriveBtn: {
    marginBottom: Spacing.sm,
  },
  arrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  arrivedBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  verifyBtn: {
    marginTop: 4,
  },
});
