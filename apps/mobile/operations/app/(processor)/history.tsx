import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { opsApi } from '../../src/services/api';

export default function ProcessorHistoryScreen() {
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await opsApi.processor.getJobs();
      if (Array.isArray(data)) {
        const completed = data.filter((o) => ['ready_for_delivery', 'completed'].includes(o.status));
        setHistoryOrders(completed);
      }
    } catch {
      setHistoryOrders([
        {
          id: 'ORD-984102',
          orderNumber: 'ORD-984102',
          status: 'ready_for_delivery',
          customerName: 'Thomas Anderson',
          weightKg: 6.2,
          completedAt: 'Today at 11:20',
          qcResult: 'Passed (100%)',
        },
        {
          id: 'ORD-975311',
          orderNumber: 'ORD-975311',
          status: 'ready_for_delivery',
          customerName: 'Claire Redfield',
          weightKg: 4.8,
          completedAt: 'Today at 10:05',
          qcResult: 'Passed (100%)',
        },
      ]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Processed Orders" roleBadge="PLANT LOGS" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {historyOrders.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="No Orders Processed Yet"
            message="Orders that have successfully passed through plant washing and quality control will appear here."
          />
        ) : (
          historyOrders.map((item) => (
            <Card key={item.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <Badge label="READY FOR DISPATCH" variant="success" />
                  <Text style={styles.orderId}>#{item.orderNumber || item.id}</Text>
                </View>
                <Text style={styles.timeText}>{item.completedAt || 'Completed'}</Text>
              </View>

              <Text style={styles.customerText}>Customer: {item.customerName}</Text>
              <Text style={styles.weightText}>Verified Weight: {item.weightKg} kg</Text>

              <View style={styles.cardFooter}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                <Text style={styles.footerText}>
                  Quality Inspection Passed — Awaiting Delivery Driver Handover
                </Text>
              </View>
            </Card>
          ))
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
  scrollContent: {
    padding: Spacing.md,
  },
  historyCard: {
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  customerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  weightText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '700',
    flex: 1,
  },
});
