import { IdPrefix } from './prefixes';

export type CustomerId = `CUS-${string}`;
export type StaffId = `STF-${string}`;
export type OrderId = `ORD-${string}`;
export type OrderItemId = `ITM-${string}`;
export type PlantId = `PLT-${string}`;
export type PaymentId = `PAY-${string}`;
export type SubscriptionId = `SUB-${string}`;
export type InvoiceId = `INV-${string}`;
export type RefundId = `REF-${string}`;
export type StoreCreditId = `CRD-${string}`;
export type BagId = `BAG-${string}`;
export type VehicleId = `VEH-${string}`;
export type MachineId = `MAC-${string}`;
export type MachineRunId = `RUN-${string}`;
export type PickupAttemptId = `PKA-${string}`;
export type DeliveryAttemptId = `DLA-${string}`;
export type CodRecordId = `COD-${string}`;
export type IncidentId = `INC-${string}`;
export type SupportTicketId = `TKT-${string}`;
export type EvidenceId = `EV-${string}`;
export type AuditEventId = `AUD-${string}`;
export type AddressId = `ADR-${string}`;
export type NotificationId = `NOT-${string}`;
export type AlertId = `ALT-${string}`;
export type NoteId = `NTE-${string}`;
export type FlagId = `FLG-${string}`;
export type BookingSlotId = `SLT-${string}`;
export type DeviceId = `DEV-${string}`;
export type OfflineOperationId = `OP-${string}`;
export type ServiceId = `SVC-${string}`;
export type ExceptionId = `EXC-${string}`;
export type PrivacyRequestId = `PRV-${string}`;

export interface ParsedId {
  prefix: IdPrefix;
  randomPart: string;
  canonicalId: string;
  isValid: boolean;
  entityName: string;
}

export const PREFIX_LENGTH_MAP: Record<IdPrefix, number> = {
  CUS: 12,
  STF: 8,
  ORD: 10,
  ITM: 8,
  PLT: 8,
  PAY: 14,
  SUB: 12,
  INV: 10,
  REF: 10,
  CRD: 8,
  BAG: 8,
  VEH: 8,
  MAC: 8,
  RUN: 8,
  PKA: 8,
  DLA: 8,
  COD: 8,
  INC: 8,
  TKT: 8,
  EV: 12,
  AUD: 12,
  ADR: 10,
  NOT: 12,
  ALT: 8,
  NTE: 8,
  FLG: 8,
  SLT: 8,
  DEV: 8,
  OP: 12,
  VAS: 8,
  VMT: 8,
  DOC: 8,
  MAT: 8,
  ITX: 8,
  TRF: 8,
  SVC: 8,
  EXC: 8,
  PRV: 8
};
