import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ServiceItem } from '@laundelle/types';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { mobileApi } from '../../src/services/api';

const FALLBACK_SERVICES: ServiceItem[] = [
  {
    id: 'SVC-WF-6KG',
    name: 'Mixed Wash & Tumble Dry (up to 6kg)',
    category: 'wash_and_fold',
    price: 15.0,
    unit: 'bag',
    description: 'Everyday casual clothes, towels and cottons washed at 30°C and neatly folded.',
    popular: true,
  } as any,
  {
    id: 'SVC-WF-10KG',
    name: 'Family Wash & Tumble Dry (up to 10kg)',
    category: 'wash_and_fold',
    price: 24.0,
    unit: 'bag',
    description: 'Large family laundry load, sorted into whites and darks, tumble dried and packed.',
    popular: false,
  } as any,
  {
    id: 'SVC-DC-SUIT',
    name: 'Two-Piece Suit Dry Clean',
    category: 'dry_cleaning',
    price: 16.5,
    unit: 'suit',
    description: 'Expert eco-solvent dry cleaning, stain pre-treatment, and hand steam pressing.',
    popular: true,
  } as any,
  {
    id: 'SVC-DC-SHIRT',
    name: 'Shirt Wash & Hand Press (Hanger)',
    category: 'dry_cleaning',
    price: 3.5,
    unit: 'piece',
    description: 'Collar and cuff pre-spotting, precision pressed and returned crisp on wire hangers.',
    popular: false,
  } as any,
  {
    id: 'SVC-IR-5PC',
    name: 'Ironing Only (5 Items)',
    category: 'ironing',
    price: 11.0,
    unit: 'bundle',
    description: 'Professional steam ironing for shirts, trousers, or dresses.',
    popular: false,
  } as any,
  {
    id: 'SVC-BD-DUVET-DBL',
    name: 'Double Feather/Synthetic Duvet',
    category: 'bedding',
    price: 22.0,
    unit: 'item',
    description: 'Deep sanitary washing in high-capacity machines with thorough drying to restore fluffiness.',
    popular: true,
  } as any,
];

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>(FALLBACK_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = async () => {
    try {
      const items = await mobileApi.customer.getServices();
      if (Array.isArray(items) && items.length > 0) {
        setServices(items);
      }
    } catch {
      // Fallback already preloaded
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  const categories = [
    { key: 'all', label: 'All Services' },
    { key: 'wash_and_fold', label: 'Wash & Fold' },
    { key: 'dry_cleaning', label: 'Dry Cleaning' },
    { key: 'ironing', label: 'Ironing' },
    { key: 'bedding', label: 'Bedding' },
  ];

  const filtered = services.filter((s: any) => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Laundelle Services" />

      {/* Category Pills */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[styles.catPill, isSelected && styles.catPillSelected]}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.map((item: any) => (
          <View key={item.id} style={styles.serviceCard}>
            <View style={styles.cardHeader}>
              <View style={styles.titleCol}>
                <Text style={styles.serviceName}>{item.name}</Text>
                {item.popular ? <Badge label="Most Popular" variant="primary" style={styles.popularBadge} /> : null}
              </View>
              <Text style={styles.servicePrice}>
                £{Number(item.price || 0).toFixed(2)}
              </Text>
            </View>

            <Text style={styles.serviceDesc}>{item.description}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.turnaroundCol}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.turnaroundText}>24-48h processing</Text>
              </View>

              <Button
                title="Book Service"
                size="sm"
                onPress={() => {
                  router.push({
                    pathname: '/booking',
                    params: { preselectedId: item.id },
                  });
                }}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  categoryBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardAlt,
  },
  catPillSelected: {
    backgroundColor: Colors.primary,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catPillTextSelected: {
    color: Colors.surface,
  },
  listContainer: {
    padding: Spacing.md,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleCol: {
    flex: 1,
    paddingRight: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  popularBadge: {
    marginTop: 4,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  serviceDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  turnaroundCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  turnaroundText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
