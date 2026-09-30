import { getDb } from '@/lib/mongodb';
import {
  Vehicle,
  VehicleAssignment,
  VehicleDocument,
  VehicleMaintenanceRecord,
  VehicleStatus,
  DocumentStatus,
  DocumentType
} from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { AuditService } from './AuditService';
import { AlertService } from './AlertService';
import crypto from 'crypto';
import { generateVehicleId, generateId } from '@laundelle/ids';

export class VehicleService {
  /**
   * Helper: Calculates document status and days until expiry.
   * <= 30 days: WARNING
   * <= 7 days: URGENT
   * < 0 days: EXPIRED_BLOCKED
   */
  static evaluateDocumentStatus(expiryDateStr: string): { status: DocumentStatus; daysUntilExpiry: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDateStr);
    expiry.setHours(23, 59, 59, 999);

    const diffMs = expiry.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let status: DocumentStatus = 'VALID';
    if (daysUntilExpiry < 0) {
      status = 'EXPIRED_BLOCKED';
    } else if (daysUntilExpiry <= 7) {
      status = 'URGENT';
    } else if (daysUntilExpiry <= 30) {
      status = 'WARNING';
    }

    return { status, daysUntilExpiry };
  }

  /**
   * Creates a new vehicle in the fleet.
   */
  static async createVehicle(
    data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'documents'> & { documents?: Partial<VehicleDocument>[] },
    actor: { id: string; role: string }
  ): Promise<Vehicle> {
    const db = await getDb();

    // Check registration uniqueness
    const existing = await db.collection('vehicles').findOne({
      registrationNumber: data.registrationNumber.trim().toUpperCase()
    });
    if (existing) {
      throw new BadRequestError(`Vehicle registration ${data.registrationNumber} already exists.`);
    }

    const id = generateVehicleId();
    const now = new Date().toISOString();

    const formattedDocs: VehicleDocument[] = (data.documents || []).map((doc) => {
      const evaluation = VehicleService.evaluateDocumentStatus(doc.expiryDate || now);
      const docId = doc.id || generateId('DOC');
      return {
        id: docId,
        publicId: docId,
        type: doc.type || 'OTHER',
        documentNumber: doc.documentNumber,
        expiryDate: doc.expiryDate || now,
        fileUrl: doc.fileUrl,
        verifiedBy: doc.verifiedBy,
        verifiedAt: doc.verifiedAt,
        status: evaluation.status,
        daysUntilExpiry: evaluation.daysUntilExpiry,
        notes: doc.notes
      };
    });

    const vehicle: Vehicle = {
      id,
      registrationNumber: data.registrationNumber.trim().toUpperCase(),
      make: data.make,
      model: data.model,
      year: data.year,
      type: data.type || 'VAN',
      status: data.status || 'ACTIVE',
      plantId: data.plantId,
      plantName: data.plantName,
      capacityKg: Number(data.capacityKg) || 500,
      capacityBags: Number(data.capacityBags) || 50,
      currentDriverId: data.currentDriverId,
      currentDriverName: data.currentDriverName,
      documents: formattedDocs,
      currentMileageKm: data.currentMileageKm || 0,
      nextServiceDueKm: data.nextServiceDueKm,
      nextServiceDueDate: data.nextServiceDueDate,
      fuelType: data.fuelType,
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('vehicles').insertOne(vehicle);

    await AuditService.recordEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VEHICLE_CREATED',
      entityType: 'VEHICLE',
      entityId: id,
      after: vehicle
    });

    return vehicle;
  }

  /**
   * Retrieves vehicle by id or registrationNumber.
   */
  static async getVehicle(vehicleIdOrReg: string): Promise<Vehicle | null> {
    const db = await getDb();
    const vehicle = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleIdOrReg }, { registrationNumber: vehicleIdOrReg.trim().toUpperCase() }]
    });
    if (!vehicle) return null;

    // Refresh document statuses dynamically on load
    const updatedDocs = (vehicle.documents || []).map((doc: VehicleDocument) => {
      const evaluation = VehicleService.evaluateDocumentStatus(doc.expiryDate);
      return { ...doc, status: evaluation.status, daysUntilExpiry: evaluation.daysUntilExpiry };
    });

    return { ...(vehicle as unknown as Vehicle), documents: updatedDocs };
  }

  /**
   * Lists fleet vehicles with optional filtering.
   */
  static async listVehicles(filter: { plantId?: string; status?: VehicleStatus } = {}): Promise<Vehicle[]> {
    const db = await getDb();
    const query: any = {};
    if (filter.plantId) query.plantId = filter.plantId;
    if (filter.status) query.status = filter.status;

    const vehicles = await db.collection('vehicles').find(query).sort({ registrationNumber: 1 }).toArray();

    return vehicles.map((v) => {
      const updatedDocs = (v.documents || []).map((doc: VehicleDocument) => {
        const evaluation = VehicleService.evaluateDocumentStatus(doc.expiryDate);
        return { ...doc, status: evaluation.status, daysUntilExpiry: evaluation.daysUntilExpiry };
      });
      return { ...(v as unknown as Vehicle), documents: updatedDocs };
    });
  }

  /**
   * Checks vehicle safety and document status.
   * If any document is EXPIRED_BLOCKED, operations are prohibited.
   */
  static async checkVehicleSafety(vehicleId: string): Promise<{
    operational: boolean;
    vehicle: Vehicle;
    blockedDocuments: VehicleDocument[];
    warningDocuments: VehicleDocument[];
  }> {
    const vehicle = await VehicleService.getVehicle(vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle ${vehicleId} not found.`);
    }

    const blockedDocuments = vehicle.documents.filter((d) => d.status === 'EXPIRED_BLOCKED');
    const warningDocuments = vehicle.documents.filter((d) => d.status === 'WARNING' || d.status === 'URGENT');

    const operational = blockedDocuments.length === 0 && vehicle.status === 'ACTIVE';

    return {
      operational,
      vehicle,
      blockedDocuments,
      warningDocuments
    };
  }

  /**
   * Assigns a driver to a vehicle with safety validation, full lineage history, and audit log.
   */
  static async assignDriver(params: {
    vehicleId: string;
    driverId: string;
    driverName: string;
    plantId: string;
    assignedBy: string;
    reason?: string;
    mileageStartKm?: number;
  }): Promise<VehicleAssignment> {
    const db = await getDb();

    // 1. Safety check: Expired documents block driver assignment
    const safety = await VehicleService.checkVehicleSafety(params.vehicleId);
    if (!safety.operational) {
      if (safety.blockedDocuments.length > 0) {
        const docNames = safety.blockedDocuments.map((d) => d.type).join(', ');
        throw new BadRequestError(
          `Cannot assign driver: Vehicle ${safety.vehicle.registrationNumber} has expired documents (${docNames}) and is blocked for safety.`
        );
      }
      if (safety.vehicle.status !== 'ACTIVE') {
        throw new BadRequestError(
          `Cannot assign driver: Vehicle ${safety.vehicle.registrationNumber} is currently ${safety.vehicle.status}.`
        );
      }
    }

    const now = new Date().toISOString();

    // 2. Unassign any driver currently assigned to this vehicle
    const existingVehicleAssignment = await db.collection('vehicle_assignments').findOne({
      vehicleId: params.vehicleId,
      status: 'ACTIVE'
    });
    if (existingVehicleAssignment) {
      await db.collection('vehicle_assignments').updateOne(
        { id: existingVehicleAssignment.id },
        {
          $set: {
            status: 'COMPLETED',
            unassignedAt: now,
            unassignedBy: params.assignedBy,
            reason: 'Reassigned to another driver'
          }
        }
      );
    }

    // 3. Unassign this driver from any other vehicle they might currently be driving
    const existingDriverAssignment = await db.collection('vehicle_assignments').findOne({
      driverId: params.driverId,
      status: 'ACTIVE'
    });
    if (existingDriverAssignment) {
      await db.collection('vehicle_assignments').updateOne(
        { id: existingDriverAssignment.id },
        {
          $set: {
            status: 'COMPLETED',
            unassignedAt: now,
            unassignedBy: params.assignedBy,
            reason: 'Driver transferred to new vehicle'
          }
        }
      );
      // Clear driver from that vehicle record
      await db.collection('vehicles').updateOne(
        { id: existingDriverAssignment.vehicleId },
        { $unset: { currentDriverId: '', currentDriverName: '' }, $set: { updatedAt: now } }
      );
    }

    // 4. Create new vehicle assignment record
    const assignmentId = generateId('VAS');
    const assignment: VehicleAssignment = {
      id: assignmentId,
      publicId: assignmentId,
      vehicleId: safety.vehicle.id,
      registrationNumber: safety.vehicle.registrationNumber,
      driverId: params.driverId,
      driverName: params.driverName,
      plantId: params.plantId,
      assignedAt: now,
      assignedBy: params.assignedBy,
      reason: params.reason || 'Standard operational shift assignment',
      mileageStartKm: params.mileageStartKm || safety.vehicle.currentMileageKm || 0,
      status: 'ACTIVE'
    };

    await db.collection('vehicle_assignments').insertOne(assignment);

    // 5. Update vehicle record
    await db.collection('vehicles').updateOne(
      { id: safety.vehicle.id },
      {
        $set: {
          currentDriverId: params.driverId,
          currentDriverName: params.driverName,
          updatedAt: now
        }
      }
    );

    // 6. Record audit event
    await AuditService.recordEvent({
      actorId: params.assignedBy,
      actorRole: 'MANAGER',
      action: 'VEHICLE_DRIVER_ASSIGNED',
      entityType: 'VEHICLE',
      entityId: safety.vehicle.id,
      after: assignment,
      metadata: { driverId: params.driverId, driverName: params.driverName }
    });

    return assignment;
  }

  /**
   * Unassigns driver from vehicle, preserving full historical lineage.
   */
  static async unassignDriver(
    vehicleId: string,
    unassignedBy: string,
    reason?: string,
    mileageEndKm?: number
  ): Promise<boolean> {
    const db = await getDb();
    const now = new Date().toISOString();

    const activeAssignment = await db.collection('vehicle_assignments').findOne({
      vehicleId,
      status: 'ACTIVE'
    });

    if (activeAssignment) {
      await db.collection('vehicle_assignments').updateOne(
        { id: activeAssignment.id },
        {
          $set: {
            status: 'COMPLETED',
            unassignedAt: now,
            unassignedBy,
            reason: reason || 'Shift completed',
            mileageEndKm: mileageEndKm || activeAssignment.mileageStartKm
          }
        }
      );
    }

    const vehicleUpdate: any = {
      $unset: { currentDriverId: '', currentDriverName: '' },
      $set: { updatedAt: now }
    };
    if (mileageEndKm) {
      vehicleUpdate.$set.currentMileageKm = mileageEndKm;
    }

    await db.collection('vehicles').updateOne({ id: vehicleId }, vehicleUpdate);

    await AuditService.recordEvent({
      actorId: unassignedBy,
      actorRole: 'MANAGER',
      action: 'VEHICLE_DRIVER_UNASSIGNED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      reason
    });

    return true;
  }

  /**
   * Retrieves vehicle assignment history.
   */
  static async getAssignmentHistory(filter: { vehicleId?: string; driverId?: string; plantId?: string } = {}): Promise<VehicleAssignment[]> {
    const db = await getDb();
    const query: any = {};
    if (filter.vehicleId) query.vehicleId = filter.vehicleId;
    if (filter.driverId) query.driverId = filter.driverId;
    if (filter.plantId) query.plantId = filter.plantId;

    const list = await db.collection('vehicle_assignments').find(query).sort({ assignedAt: -1 }).toArray();
    return list as unknown as VehicleAssignment[];
  }

  /**
   * Checks vehicle capacity against driver's current active load and new order.
   * Returns whether adding the order would breach vehicle capacity limits.
   */
  static async checkVehicleCapacityForAssignment(
    vehicleId: string,
    newOrderWeightKg: number = 0,
    newOrderBags: number = 1
  ): Promise<{
    allowed: boolean;
    currentWeightKg: number;
    capacityKg: number;
    currentBags: number;
    capacityBags: number;
    projectedWeightKg: number;
    projectedBags: number;
    reason?: string;
  }> {
    const vehicle = await VehicleService.getVehicle(vehicleId);
    if (!vehicle) {
      // Default to pass if unassigned vehicle
      return {
        allowed: true,
        currentWeightKg: 0,
        capacityKg: 500,
        currentBags: 0,
        capacityBags: 50,
        projectedWeightKg: newOrderWeightKg,
        projectedBags: newOrderBags
      };
    }

    const db = await getDb();
    let currentWeightKg = 0;
    let currentBags = 0;

    if (vehicle.currentDriverId) {
      // Find orders currently held in the vehicle / route
      const activeTransitStatuses = [
        'PICKED_UP',
        'IN_TRANSIT_TO_PLANT',
        'ASSIGNED_DELIVERY',
        'ACCEPTED_DELIVERY',
        'EN_ROUTE_DELIVERY',
        'OUT_FOR_DELIVERY'
      ];

      const activeOrders = await db.collection('orders').find({
        assigned_driver_id: vehicle.currentDriverId,
        status: { $in: activeTransitStatuses }
      }).toArray();

      for (const ord of activeOrders) {
        const w = Number(ord.weightKg) || Number(ord.actual_weight_kg) || 6;
        const b = Number(ord.bagsCount) || Number(ord.bag_count) || 1;
        currentWeightKg += w;
        currentBags += b;
      }
    }

    const projectedWeightKg = currentWeightKg + newOrderWeightKg;
    const projectedBags = currentBags + newOrderBags;

    const weightExceeded = projectedWeightKg > vehicle.capacityKg;
    const bagsExceeded = projectedBags > vehicle.capacityBags;

    let reason: string | undefined;
    if (weightExceeded && bagsExceeded) {
      reason = `Exceeds vehicle capacity by ${(projectedWeightKg - vehicle.capacityKg).toFixed(1)}kg and ${projectedBags - vehicle.capacityBags} bags.`;
    } else if (weightExceeded) {
      reason = `Exceeds vehicle weight limit by ${(projectedWeightKg - vehicle.capacityKg).toFixed(1)}kg (Limit: ${vehicle.capacityKg}kg).`;
    } else if (bagsExceeded) {
      reason = `Exceeds vehicle bag limit by ${projectedBags - vehicle.capacityBags} bags (Limit: ${vehicle.capacityBags} bags).`;
    }

    return {
      allowed: !weightExceeded && !bagsExceeded,
      currentWeightKg,
      capacityKg: vehicle.capacityKg,
      currentBags,
      capacityBags: vehicle.capacityBags,
      projectedWeightKg,
      projectedBags,
      reason
    };
  }

  /**
   * Adds a maintenance record for a vehicle.
   */
  static async addMaintenanceRecord(
    params: {
      vehicleId: string;
      plantId: string;
      serviceType: VehicleMaintenanceRecord['serviceType'];
      description: string;
      cost: number;
      performedBy: string;
      performedDate: string;
      mileageKm?: number;
      invoiceUrl?: string;
      partsReplaced?: string[];
      nextScheduledDate?: string;
    },
    actor: { id: string; role: string }
  ): Promise<VehicleMaintenanceRecord> {
    const db = await getDb();
    const vehicle = await VehicleService.getVehicle(params.vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle ${params.vehicleId} not found.`);
    }

    const recordId = generateId('VMT');
    const record: VehicleMaintenanceRecord = {
      id: recordId,
      publicId: recordId,
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      plantId: params.plantId || vehicle.plantId,
      serviceType: params.serviceType,
      description: params.description,
      cost: Number(params.cost) || 0,
      performedBy: params.performedBy,
      performedDate: params.performedDate || new Date().toISOString().split('T')[0],
      mileageKm: params.mileageKm || vehicle.currentMileageKm,
      invoiceUrl: params.invoiceUrl,
      partsReplaced: params.partsReplaced || [],
      nextScheduledDate: params.nextScheduledDate,
      createdAt: new Date().toISOString()
    };

    await db.collection('vehicle_maintenance').insertOne(record);

    // Update vehicle mileage and next service info if provided
    const vehicleUpdates: any = { updatedAt: new Date().toISOString() };
    if (params.mileageKm && params.mileageKm > (vehicle.currentMileageKm || 0)) {
      vehicleUpdates.currentMileageKm = params.mileageKm;
    }
    if (params.nextScheduledDate) {
      vehicleUpdates.nextServiceDueDate = params.nextScheduledDate;
    }
    await db.collection('vehicles').updateOne({ id: vehicle.id }, { $set: vehicleUpdates });

    await AuditService.recordEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VEHICLE_MAINTENANCE_LOGGED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      after: record
    });

    return record;
  }

  /**
   * Retrieves maintenance records for a vehicle or plant.
   */
  static async getMaintenanceRecords(vehicleId?: string, plantId?: string): Promise<VehicleMaintenanceRecord[]> {
    const db = await getDb();
    const query: any = {};
    if (vehicleId) query.vehicleId = vehicleId;
    if (plantId) query.plantId = plantId;

    const list = await db.collection('vehicle_maintenance').find(query).sort({ performedDate: -1 }).toArray();
    return list as unknown as VehicleMaintenanceRecord[];
  }

  /**
   * Updates a vehicle's documents (e.g. adding new insurance/MOT certificates).
   */
  static async updateVehicleDocuments(
    vehicleId: string,
    documents: VehicleDocument[],
    actor: { id: string; role: string }
  ): Promise<Vehicle> {
    const db = await getDb();
    const vehicle = await VehicleService.getVehicle(vehicleId);
    if (!vehicle) throw new NotFoundError(`Vehicle ${vehicleId} not found.`);

    const now = new Date().toISOString();
    const evaluatedDocs = documents.map((doc) => {
      const evaluation = VehicleService.evaluateDocumentStatus(doc.expiryDate);
      const docId = doc.id || generateId('DOC');
      return {
        ...doc,
        id: docId,
        publicId: docId,
        status: evaluation.status,
        daysUntilExpiry: evaluation.daysUntilExpiry
      };
    });

    await db.collection('vehicles').updateOne(
      { id: vehicle.id },
      { $set: { documents: evaluatedDocs, updatedAt: now } }
    );

    // If all expired docs are now valid, resolve vehicle expiry alerts
    const hasExpired = evaluatedDocs.some((d) => d.status === 'EXPIRED_BLOCKED');
    if (!hasExpired) {
      await AlertService.resolveByEntityAndType(vehicle.id, 'VEHICLE_EXPIRY', actor.id);
    }

    await AuditService.recordEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'VEHICLE_DOCUMENTS_UPDATED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      after: { documents: evaluatedDocs }
    });

    return { ...vehicle, documents: evaluatedDocs, updatedAt: now };
  }

  /**
   * Daily maintenance sweep: checks all vehicles for expiring or expired documents,
   * updating statuses and raising unified alerts.
   */
  static async runDocumentExpirySweep(): Promise<{ scanned: number; warnings: number; expired: number }> {
    const db = await getDb();
    const vehicles = await db.collection('vehicles').find({ status: { $ne: 'RETIRED' } }).toArray();

    let scanned = 0;
    let warnings = 0;
    let expired = 0;

    for (const v of vehicles) {
      scanned++;
      const docs = v.documents || [];
      let vehicleHasExpired = false;
      let vehicleHasWarning = false;
      const updatedDocs: VehicleDocument[] = [];

      for (const doc of docs) {
        const evaluation = VehicleService.evaluateDocumentStatus(doc.expiryDate);
        const updatedDoc = {
          ...doc,
          status: evaluation.status,
          daysUntilExpiry: evaluation.daysUntilExpiry
        };
        updatedDocs.push(updatedDoc);

        if (evaluation.status === 'EXPIRED_BLOCKED') {
          vehicleHasExpired = true;
          expired++;
          await AlertService.createAlert({
            plantId: v.plantId,
            type: 'VEHICLE_EXPIRY',
            severity: 'CRITICAL',
            title: `EXPIRED: ${v.registrationNumber} ${doc.type}`,
            message: `Document ${doc.type} for vehicle ${v.registrationNumber} expired ${Math.abs(evaluation.daysUntilExpiry)} days ago. Vehicle is BLOCKED from driver assignment.`,
            entityId: v.id,
            entityType: 'VEHICLE'
          });
        } else if (evaluation.status === 'URGENT' || evaluation.status === 'WARNING') {
          vehicleHasWarning = true;
          warnings++;
          await AlertService.createAlert({
            plantId: v.plantId,
            type: 'VEHICLE_EXPIRY',
            severity: evaluation.status === 'URGENT' ? 'CRITICAL' : 'WARNING',
            title: `Expiring Soon: ${v.registrationNumber} ${doc.type}`,
            message: `Document ${doc.type} for vehicle ${v.registrationNumber} expires in ${evaluation.daysUntilExpiry} days. Renewal required immediately.`,
            entityId: v.id,
            entityType: 'VEHICLE'
          });
        }
      }

      await db.collection('vehicles').updateOne(
        { id: v.id },
        { $set: { documents: updatedDocs, updatedAt: new Date().toISOString() } }
      );

      // If clean, resolve alerts
      if (!vehicleHasExpired && !vehicleHasWarning) {
        await AlertService.resolveByEntityAndType(v.id, 'VEHICLE_EXPIRY', 'sweep_job');
      }
    }

    return { scanned, warnings, expired };
  }
}
