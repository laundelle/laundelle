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

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useOpsAuth();

  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pickups' | 'deliveries'>('all');
  const [availability, setAvailability] = useState<'available' | 'busy' | 'offline'>('available');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await opsApi.driver.getJobs();
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch {
      // Fallback demo assignments for driver workflow testing
      setJobs([
        {
          id: 'ORD-7K9A2P',
          orderNumber: 'ORD-7K9A2P',
          type: 'pickup',
          status: 'driver_assigned',
          customerName: 'Sarah Jenkins',
          customerPhone: '+44 7911 123456',
          address: '28 Fishergate Hill, Preston',
          postcode: 'PR1 8JB',
          timeSlot: '08:00 - 10:00',
          bagCount: 1,
          instructions: 'Leave at front porch if no answer or call mobile.',
        },
        {
          id: 'ORD-8M3X1V',
          orderNumber: 'ORD-8M3X1V',
          type: 'delivery',
          status: 'out_for_delivery',
          customerName: 'David Sterling',
          customerPhone: '+44 7922 987654',
          address: '42 Winckley Square, Preston',
          postcode: 'PR1 3JJ',
          timeSlot: '10:00 - 12:00',
          bagCount: 2,
          instructions: 'Ring intercom 14, buzzer works.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleUpdateAvailability = async (nextState: 'available' | 'busy' | 'offline') => {
    setAvailability(nextState);
    try {
      await opsApi.driver.updateAvailability(nextState);
    } catch {
      // ignore
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'pickups') return j.type === 'pickup' || ['driver_assigned', 'pickup_in_progress'].includes(j.status);
    if (filter === 'deliveries') return j.type === 'delivery' || ['ready_for_delivery', 'out_for_delivery'].includes(j.status);
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Driver Route"
        roleBadge="FIELD LOGISTICS"
        rightAction={
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Sign Out', 'Sign out of Driver Terminal?', [
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Driver Profile & Status Card */}
        <Card style={styles.driverProfileCard}>
          <View style={styles.driverInfoRow}>
            <View style={styles.avatarBox}>
              <Ionicons name="car" size={24} color={Colors.surface} />
            </View>
            <View style={styles.driverTextCol}>
              <Text style={styles.driverName}>{user?.name || 'Driver'}</Text>
              <Text style={styles.driverMeta}>Driver ID: {user?.id || 'DRV-CURRENT'}</Text>
            </View>
            <Badge
              label={availability}
              variant={availability === 'available' ? 'success' : availability === 'busy' ? 'warning' : 'neutral'}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.availLabel}>AVAILABILITY STATUS</Text>
          <View style={styles.availButtonGroup}>
            {(['available', 'busy', 'offline'] as const).map((st) => {
              const isSelected = availability === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => handleUpdateAvailability(st)}
                  style={[styles.availBtn, isSelected && styles.availBtnSelected]}
                >
                  <Text style={[styles.availBtnText, isSelected && styles.availBtnTextSelected]}>
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Task Filter Pills */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All Jobs ({jobs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('pickups')}
            style={[styles.filterPill, filter === 'pickups' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'pickups' && styles.filterTextActive]}>
              Pickups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('deliveries')}
            style={[styles.filterPill, filter === 'deliveries' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'deliveries' && styles.filterTextActive]}>
              Deliveries
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task List */}
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon="car-outline"
            title="No Active Assignments"
            message="You have no pickups or deliveries assigned right now. You will receive assignments through the dispatch queue."
          />
        ) : (
          filteredJobs.map((job) => {
            const isPickup = job.type === 'pickup' || ['driver_assigned', 'pickup_in_progress'].includes(job.status);
            const orderId = job.publicId || job.orderNumber || job.id;

            return (
              <Card key={orderId} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobBadgeGroup}>
                    <Badge
                      label={isPickup ? 'PICKUP' : 'DELIVERY'}
                      variant={isPickup ? 'info' : 'success'}
                    />
                    <Text style={styles.jobId}>#{orderId}</Text>
                  </View>
                  <Text style={styles.jobTimeSlot}>{job.timeSlot || 'Scheduled Window'}</Text>
                </View>

                <View style={styles.customerRow}>
                  <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.customerName}>{job.customerName || 'Customer'}</Text>
                </View>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={16} color={Colors.accent} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {job.address || 'Address'}
                  </Text>
                </View>

                {job.instructions ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>Note: {job.instructions}</Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Button
                    title={isPickup ? 'Start Pickup' : 'Start Delivery'}
                    onPress={() => router.push(`/(driver)/job/${orderId}`)}
                    size="sm"
                    style={{ flex: 1 }}
                    icon={<Ionicons name="arrow-forward" size={16} color={Colors.surface} />}
                  />
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
  scrollContent: {
    padding: Spacing.md,
  },
  driverProfileCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.driver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTextCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  driverMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  availLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  availButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  availBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  availBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  availBtnTextSelected: {
    color: Colors.surface,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.surface,
  },
  jobCard: {
    marginBottom: Spacing.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobId: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  jobTimeSlot: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: Colors.cardAlt,
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
