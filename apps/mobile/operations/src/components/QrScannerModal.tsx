import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Input } from './Input';
import { Button } from './Button';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  prompt?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Order QR Tag',
  prompt = 'Align camera with the QR code on the laundry bag or invoice',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);
    onScan(data.trim());
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    onScan(manualCode.trim().toUpperCase());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={Colors.surface} />
          </TouchableOpacity>
        </View>

        {!showManual && permission?.granted ? (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Reticle Overlay */}
            <View style={styles.overlay}>
              <View style={styles.scannerTarget}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.promptText}>{prompt}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.manualFallback}>
            <Ionicons name="qr-code-outline" size={64} color={Colors.accent} />
            <Text style={styles.manualTitle}>Manual QR / Tag Input</Text>
            <Text style={styles.manualSubtitle}>
              {!permission?.granted
                ? 'Camera access is not permitted or unavailable on this device. Enter the QR tag code or Order ID below.'
                : 'Enter the bag tag code or order number manually:'}
            </Text>

            <Input
              placeholder="e.g. BAG-7K9A2P or ORD-992140"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              containerStyle={styles.manualInput}
            />

            <Button
              title="Submit Tag Code"
              onPress={handleManualSubmit}
              style={styles.submitBtn}
            />

            {!permission?.granted ? (
              <Button
                title="Enable Camera Permission"
                variant="outline"
                onPress={requestPermission}
                style={styles.permBtn}
              />
            ) : null}
          </View>
        )}

        {/* Bottom Switcher */}
        <View style={styles.footer}>
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
              {showManual ? 'Use Camera Scanner' : 'Switch to Manual Entry'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000814',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: Spacing.sm,
    backgroundColor: '#000814',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.surface,
  },
  closeBtn: {
    padding: 6,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scannerTarget: {
    width: 260,
    height: 260,
    position: 'relative',
    backgroundColor: 'transparent',
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
  manualFallback: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  manualSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  manualInput: {
    width: '100%',
  },
  submitBtn: {
    width: '100%',
  },
  permBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: '#000814',
    alignItems: 'center',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  switchBtnText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
