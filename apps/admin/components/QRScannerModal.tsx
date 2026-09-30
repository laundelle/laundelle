import React, { useState } from 'react';
import { X, QrCode, CheckCircle, AlertTriangle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expectedQrCode?: string;
  onScanSuccess: (scannedQr: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  title,
  expectedQrCode,
  onScanSuccess,
}) => {
  const [inputQr, setInputQr] = useState('');
  const [scanResult, setScanResult] = useState<'idle' | 'match' | 'mismatch'>('idle');

  if (!isOpen) return null;

  const cleanCode = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        return parsed.orderId || parsed.id || parsed.qr || trimmed;
      }
    } catch {}
    return trimmed.replace(/^["']|["']$/g, '');
  };

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const qr = detectedCodes[0].rawValue;
      if (!qr) return;

      setInputQr(qr);
      const isMatch = !expectedQrCode || cleanCode(qr) === cleanCode(expectedQrCode) || qr === expectedQrCode;
      
      if (!isMatch) {
        setScanResult('mismatch');
      } else {
        setScanResult('match');
        // Automatically succeed if it matches or if we don't have an expected QR code
        setTimeout(() => {
          onScanSuccess(qr);
        }, 800);
      }
    }
  };

  const handleConfirmScan = () => {
    if (scanResult === 'match' || !expectedQrCode) {
      onScanSuccess(inputQr);
    }
  };

  const handleManualVerify = () => {
      if (!inputQr.trim()) return;
      const isMatch = !expectedQrCode || cleanCode(inputQr) === cleanCode(expectedQrCode) || inputQr === expectedQrCode;
      if (!isMatch) {
          setScanResult('mismatch');
      } else {
          setScanResult('match');
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#03045E]">{title}</h3>
            <p className="text-xs text-gray-500">Point camera at QR code</p>
          </div>
        </div>

        {/* Real Camera Scanner */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center border-4 border-[#00B4D8]">
            {scanResult === 'idle' ? (
                <Scanner 
                    onScan={handleScan}
                    formats={['qr_code']}
                    components={{
                        zoom: true,
                        finder: true
                    }}
                    styles={{
                        container: { width: '100%', height: '300px' }
                    }}
                />
            ) : (
                <div className="w-full h-[300px] flex items-center justify-center bg-slate-900">
                    <span className="text-white font-bold">{scanResult === 'match' ? 'Matched!' : 'Mismatch!'}</span>
                </div>
            )}
        </div>

        {/* Manual Input Fallback */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700">Or Type Code Manually</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputQr}
              onChange={(e) => {
                setInputQr(e.target.value);
                setScanResult('idle');
              }}
              placeholder="e.g. QR-BAG-9021"
              className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#03045E] focus:outline-hidden border border-gray-200"
            />
            <button
              onClick={handleManualVerify}
              disabled={!inputQr.trim()}
              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Result Feedback Messages */}
        {scanResult === 'match' && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-900">✓ QR Code Matched/Scanned!</p>
            </div>
          </div>
        )}

        {scanResult === 'mismatch' && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-900">⚠ QR Mismatch Warning!</p>
              <p className="text-[11px] text-red-700">
                Scanned QR <span className="font-mono font-bold truncate max-w-[150px] inline-block align-bottom">{inputQr}</span> does NOT match!
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmScan}
            disabled={scanResult === 'mismatch' || !inputQr.trim()}
            className="w-1/2 py-3 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-bold cursor-pointer shadow-md transition-all disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
