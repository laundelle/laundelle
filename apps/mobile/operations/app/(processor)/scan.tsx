import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Header } from '../../src/components/Header';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function ProcessorScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);
    const code = data.trim().toUpperCase();
    router.push(`/(processor)/order/${code}`);
  };

  const handleManualLookup = () => {
    if (!manualCode.trim()) return;
    const code = manualCode.trim().toUpperCase();
    router.push(`/(processor)/order/${code}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Facility QR Intake" showBack />

      {!showManual && permission?.granted ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />

          <View style={styles.overlay}>
            <View style={styles.targetFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.promptText}>
              Scan Laundry Bag Tag or Invoice QR Code to intake into plant
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.manualContainer}>
          <Ionicons name="qr-code-outline" size={64} color={Colors.processor} />
          <Text style={styles.manualTitle}>Facility Order Lookup</Text>
          <Text style={styles.manualSubtitle}>
            {!permission?.granted
              ? 'Camera permission is required for live barcode scanning. Enter the Bag QR Tag ID or Order Number manually:'
              : 'Enter the Bag Tag Code or Order ID:'}
          </Text>

          <Input
            placeholder="e.g. BAG-7K9A2P or ORD-7K9A2P"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            containerStyle={styles.manualInput}
          />

          <Button
            title="Lookup Order for Intake"
            onPress={handleManualLookup}
            style={styles.lookupBtn}
          />

          {!permission?.granted ? (
            <Button
              title="Grant Camera Permission"
              variant="outline"
              onPress={requestPermission}
              style={styles.permBtn}
            />
          ) : null}
        </View>
      )}

      {/* Footer Switcher */}
      <View style={styles.footerBar}>
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => {
            setScanned(false);
            setShowManual(!showManual);
          }}
        >
          <Ionicons
            name={showManual ? 'camera-outline' : 'keypad-outline'}
            size={18}
            color={Colors.surface}
          />
          <Text style={styles.switchBtnText}>
            {showManual ? 'Switch to Camera Scanner' : 'Switch to Manual Input'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000814',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  targetFrame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.sky,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  promptText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    lineHeight: 18,
  },
  manualContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  manualSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  manualInput: {
    width: '100%',
  },
  lookupBtn: {
    width: '100%',
  },
  permBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  footerBar: {
    padding: Spacing.md,
    backgroundColor: '#000814',
    alignItems: 'center',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  switchBtnText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
