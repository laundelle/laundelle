import React, { useState, useMemo } from 'react';
import { Calendar, AlertTriangle, Check, X } from 'lucide-react';
import { Order } from '@laundelle/types';
import { getAvailablePickupSlots, formatDateToYyyyMmDd } from '@laundelle/validations';

interface RescheduleCancelModalProps {
  isOpen: boolean;
  order: Order | null;
  mode: 'reschedule' | 'cancel';
  onClose: () => void;
  onConfirmReschedule: (orderId: string, newDate: string, newSlot: string) => void;
  onConfirmCancel: (orderId: string, reason: string) => void;
}

export const RescheduleCancelModal: React.FC<RescheduleCancelModalProps> = ({
  isOpen,
  order,
  mode,
  onClose,
  onConfirmReschedule,
  onConfirmCancel
}) => {
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 12:00 PM');
  const [cancelReason, setCancelReason] = useState('Schedule change / Not at home');
  const [customReason, setCustomReason] = useState('');

  const targetDateIso = useMemo(() => {
    const d = new Date();
    if (selectedDate === 'Tomorrow') d.setDate(d.getDate() + 1);
    else if (selectedDate === 'In 2 Days') d.setDate(d.getDate() + 2);
    else if (selectedDate === 'In 3 Days') d.setDate(d.getDate() + 3);
    return formatDateToYyyyMmDd(d);
  }, [selectedDate]);

  const availableSlots = useMemo(() => {
    return getAvailablePickupSlots(targetDateIso);
  }, [targetDateIso]);

  if (!isOpen || !order) return null;

  const isEligibleToCancel = !['washing', 'drying', 'folding_steaming', 'qc_ready', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status);
  const isEligibleToReschedule = ['booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pending_payment'].includes(order.status);
  const isEligibleToModify = mode === 'cancel' ? isEligibleToCancel : isEligibleToReschedule;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-hidden shadow-2xl transition-all border border-gray-100 flex flex-col my-auto">
        {/* Header */}
        <div className={`p-5 sm:p-6 text-white shrink-0 ${mode === 'cancel' ? 'bg-red-600' : 'bg-[#03045E]'} relative`}>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1 opacity-90">
            {mode === 'cancel' ? <AlertTriangle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            <span>{mode === 'cancel' ? 'Cancel Booking' : 'Reschedule Collection Slot'}</span>
          </div>
          <h2 className="text-xl font-heading font-extrabold">Order #{order.id}</h2>
          <p className="text-xs opacity-80 mt-0.5">Current Slot: {order.pickupDate} ({order.pickupSlot})</p>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {!isEligibleToModify ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <strong className="block font-bold">Modifications Unavailable</strong>
              <p>
                This order is currently in <strong>{order.statusLabel}</strong>. Because our facility team or driver has already begun processing your items, you cannot reschedule or cancel directly from the app.
              </p>
              <p className="text-[11px] text-amber-700">
                Please contact our 24/7 care hotline at <strong>+44 7700 900888</strong> for manual adjustments.
              </p>
            </div>
          ) : mode === 'reschedule' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  New Collection Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Tomorrow', 'In 2 Days', 'In 3 Days'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedDate === d
                          ? 'border-[#03045E] bg-[#CAF0F8] text-[#03045E] shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  New Time Window
                </label>
                <div className="space-y-2">
                  {availableSlots.map(({ slot, disabled, reason }) => (
                    <button
                      key={slot}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full p-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
                        disabled
                          ? 'opacity-40 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedSlot === slot
                          ? 'border-[#03045E] bg-[#CAF0F8] text-[#03045E] shadow-xs cursor-pointer'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 cursor-pointer'
                      }`}
                    >
                      <span>{slot}{disabled && reason ? ` (${reason})` : ''}</span>
                      {selectedSlot === slot && !disabled && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onConfirmReschedule(order.id, selectedDate, selectedSlot)}
                  className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Save New Collection Time
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-xl text-xs text-red-800">
                Are you sure you want to cancel this booking? A 100% refund will be credited instantly back to your {order.paymentMethod}.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-hidden"
                >
                  <option value="Schedule change / Not at home">Schedule change / Not at home</option>
                  <option value="Placed order by mistake">Placed order by mistake</option>
                  <option value="Need different service">Need different service</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              {cancelReason === 'Other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Tell us why..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              )}

              <div className="pt-2">
                <button
                  onClick={() => onConfirmCancel(order.id, cancelReason === 'Other' ? customReason : cancelReason)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Confirm Full Cancellation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
