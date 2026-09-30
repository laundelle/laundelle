import { getDb } from '@/lib/mongodb';
import { Machine, MachineRun, MachineStatus, MachineType } from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';
import { MachineRunService } from './MachineRunService';
import crypto from 'crypto';
import { generateMachineId, generateMachineRunId, generateExceptionId } from '@laundelle/ids';

export class MachineService {
  /**
   * Retrieves a single machine by ID or machineCode.
   */
  static async getMachine(machineId: string): Promise<Machine | null> {
    const db = await getDb();
    const machine = await db.collection('machines').findOne({ $or: [{ id: machineId }, { machineCode: machineId }] });
    return machine as unknown as Machine | null;
  }

  /**
   * Starts a machine cycle run.
   */
  static async startRun(params: {
    machineId: string;
    plantId: string;
    operatorId?: string;
    processorId?: string;
    processorName?: string;
    orderIds: string[];
    orderItemIds?: string[];
    weightKg?: number;
    program?: string;
    cycleType?: string;
    temperature?: string;
    durationMinutes?: number;
    notes?: string;
  }): Promise<MachineRun> {
    const run = await MachineRunService.startRun({
      machineId: params.machineId,
      plantId: params.plantId,
      processorId: params.processorId || params.operatorId || 'processor_1',
      processorName: params.processorName || 'Commercial Processor',
      orderIds: params.orderIds,
      orderItemIds: params.orderItemIds,
      cycleType: params.cycleType || params.program || 'Standard Eco 40°C',
      temperature: params.temperature || '40°C',
      durationMinutes: params.durationMinutes || 45,
      notes: params.notes
    });

    // Also update machine currentRunId
    const db = await getDb();
    await db.collection('machines').updateOne(
      { id: params.machineId },
      { $set: { currentRunId: run.id, status: 'RUNNING' } }
    );

    return run;
  }

  /**
   * Retrieves machines for a plant, optionally filtered by status or type.
   */
  static async getMachines(plantId?: string, type?: MachineType): Promise<Machine[]> {
    const db = await getDb();
    const query: any = {};
    if (plantId) query.plantId = plantId;
    if (type) query.type = type;

    const machines = await db.collection('machines').find(query).toArray();
    return machines as unknown as Machine[];
  }

  /**
   * Registers a new commercial laundry machine in the fleet.
   */
  static async registerMachine(params: {
    plantId: string;
    machineCode: string;
    type: MachineType;
    capacityKg: number;
    manufacturer?: string;
    model?: string;
  }): Promise<Machine> {
    const { plantId, machineCode, type, capacityKg, manufacturer, model } = params;
    if (!plantId || !machineCode || !type || !capacityKg) {
      throw new BadRequestError('plantId, machineCode, type, and capacityKg are required.');
    }

    const db = await getDb();
    const existing = await db.collection('machines').findOne({ plantId, machineCode });
    if (existing) {
      throw new BadRequestError(`Machine with code '${machineCode}' already exists in plant '${plantId}'.`);
    }

    const id = generateMachineId();
    const now = new Date().toISOString();

    const machine: Machine = {
      id,
      publicId: id,
      plantId,
      machineCode,
      type,
      name: `${type} #${machineCode}`,
      capacityKg,
      status: 'AVAILABLE',
      manufacturer: manufacturer || 'Industrial Wash Corp',
      model: model || 'ProSeries 2026',
      maintenanceStatus: 'GOOD',
      totalDowntimeMinutes: 0,
      currentOrderId: null,
      currentRunId: null,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('machines').insertOne(machine as any);
    return machine;
  }

  /**
   * Triggers the Machine Failure Workflow:
   * 1. Halts future assignments & sets status to MAINTENANCE / FAULT
   * 2. Flags active runs as INTERRUPTED
   * 3. Creates high-priority operational exception for Plant Manager
   * 4. Sends urgent notification to Plant Manager
   * 5. Commences downtime tracking
   */
  static async reportMachineFailure(params: {
    machineId: string;
    reason: string;
    reportedBy: string;
    reportedByRole?: string;
  }): Promise<{
    machine: Machine;
    interruptedRuns: MachineRun[];
    exceptionId: string;
  }> {
    const { machineId, reason, reportedBy, reportedByRole = 'processor' } = params;
    const db = await getDb();

    const machine = await db.collection('machines').findOne({ id: machineId });
    if (!machine) throw new NotFoundError(`Machine #${machineId} not found.`);

    const now = new Date().toISOString();

    // 1. Mark machine unavailable & begin downtime
    await db.collection('machines').updateOne(
      { id: machineId },
      {
        $set: {
          status: 'MAINTENANCE',
          maintenanceStatus: 'FAULT',
          downtimeStartedAt: now,
          updated_at: now,
          updatedAt: now
        }
      }
    );

    // 2. Identify active runs on this machine & mark INTERRUPTED
    const activeRuns = await db.collection('machine_runs')
      .find({
        $or: [{ machineId }, { machineId: machine.id }],
        status: { $in: ['RUNNING', 'running'] }
      })
      .toArray();

    for (const run of activeRuns) {
      run.status = 'INTERRUPTED';
      run.interruptionReason = reason;
      await db.collection('machine_runs').updateOne(
        { $or: [{ id: run.id }, { runId: run.runId }, { _id: run._id }] } as any,
        {
          $set: {
            status: 'INTERRUPTED',
            interruptionReason: reason,
            actualEndAt: now,
            updatedAt: now
          }
        }
      );
    }

    // 3. Create high-priority operational exception
    const exceptionId = generateExceptionId();
    await db.collection('exceptions').insertOne({
      id: exceptionId,
      publicId: exceptionId,
      orderId: activeRuns.length > 0 && activeRuns[0].orderIds ? activeRuns[0].orderIds[0] : 'PLANT_FLEET',
      plantId: machine.plantId,
      type: 'machine_failure',
      priority: 'urgent',
      status: 'OPEN',
      description: `Critical Machine Fault: Machine #${machine.machineCode || machineId} (${machine.type}) reported failure: ${reason}. ${activeRuns.length} active run(s) interrupted.`,
      evidence: {
        machineId,
        machineCode: machine.machineCode,
        interruptedRunIds: activeRuns.map((r: any) => r.id || r.runId),
        reason,
        reportedBy
      },
      createdAt: now,
      updatedAt: now
    });

    // 4. Notify Plant Manager
    const managers = await db.collection('users').find({
      role: { $in: ['manager', 'admin'] },
      $or: [{ plant_id: machine.plantId }, { role: 'admin' }]
    }).toArray();

    for (const mgr of managers) {
      await NotificationService.createNotification({
        userId: mgr._id.toString(),
        title: `URGENT: Machine Failure Alert (${machine.machineCode || machineId})`,
        message: `Machine #${machine.machineCode || machineId} has failed: ${reason}. Please reassign interrupted runs.`,
        type: 'machine_failure',
        metadata: { machineId, exceptionId }
      });
    }

    // 5. Audit Event
    await AuditService.recordEvent({
      actorId: reportedBy,
      actorRole: reportedByRole,
      action: 'machine_failure_reported',
      entityType: 'machine',
      entityId: machineId,
      reason,
      metadata: { interruptedCount: activeRuns.length, exceptionId }
    });

    return {
      machine: { ...(machine as unknown as Machine), status: 'MAINTENANCE', downtimeStartedAt: now },
      interruptedRuns: activeRuns as unknown as MachineRun[],
      exceptionId
    };
  }

  /**
   * Transfers an interrupted machine run to another available machine in the plant,
   * maintaining complete chain-of-custody and traceability.
   */
  static async transferMachineRun(params: {
    runId: string;
    targetMachineId: string;
    actorId: string;
    actorRole?: string;
  }): Promise<{ oldRun: MachineRun; newRun: MachineRun }> {
    const { runId, targetMachineId, actorId, actorRole = 'manager' } = params;
    const db = await getDb();

    // 1. Fetch original run
    const originalRun = await db.collection('machine_runs').findOne({ $or: [{ id: runId }, { runId }] });
    if (!originalRun) throw new NotFoundError(`Run with ID '${runId}' not found.`);

    // 2. Fetch & validate target machine
    const targetMachine = await db.collection('machines').findOne({ id: targetMachineId });
    if (!targetMachine) throw new NotFoundError(`Target machine '${targetMachineId}' not found.`);

    const targetStatus = (targetMachine.status || '').toLowerCase();
    if (['running', 'maintenance', 'fault', 'out_of_service'].includes(targetStatus)) {
      throw new BadRequestError(`Target machine '${targetMachine.machineCode || targetMachineId}' is not AVAILABLE (Status: ${targetMachine.status}). Cannot transfer run.`);
    }

    const now = new Date();
    const newRunId = generateMachineRunId();
    const durationMinutes = originalRun.durationMinutes || 45;
    const expectedEnd = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // 3. Create new transfer run
    const newRun: MachineRun = {
      id: newRunId,
      publicId: newRunId,
      runId: newRunId,
      machineId: targetMachineId,
      machineCode: targetMachine.machineCode,
      plantId: targetMachine.plantId || originalRun.plantId,
      orderIds: originalRun.orderIds,
      orderItemIds: originalRun.orderItemIds || [],
      processorId: actorId,
      processorName: originalRun.processorName || 'Facility Processor',
      machineType: targetMachine.machineType || targetMachine.type || originalRun.machineType,
      cycleType: originalRun.cycleType,
      temperature: originalRun.temperature,
      startedAt: now.toISOString(),
      expectedEndAt: expectedEnd.toISOString(),
      status: 'RUNNING',
      notes: `Transferred from Machine #${originalRun.machineCode || originalRun.machineId} (Original Run #${originalRun.runId})`,
      transferredFromRunId: originalRun.runId || originalRun.id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.collection('machine_runs').insertOne(newRun as any);

    // 4. Update original run
    await db.collection('machine_runs').updateOne(
      { _id: originalRun._id },
      {
        $set: {
          transferredToRunId: newRunId,
          status: 'INTERRUPTED',
          updatedAt: now.toISOString()
        }
      }
    );

    // 5. Lock target machine
    await db.collection('machines').updateOne(
      { id: targetMachineId },
      {
        $set: {
          status: 'RUNNING',
          currentOrderId: newRun.orderIds[0],
          currentRunId: newRunId,
          updated_at: now.toISOString(),
          updatedAt: now.toISOString()
        }
      }
    );

    // 6. Update orders timeline
    await db.collection('orders').updateMany(
      { id: { $in: newRun.orderIds } },
      {
        $set: { updated_at: now.toISOString() },
        $push: {
          timeline_events: {
            event: 'machine_run_transferred',
            label: `Load transferred to Machine #${targetMachine.machineCode} due to primary machine maintenance`,
            actor: actorRole,
            actorId,
            machineId: targetMachineId,
            timestamp: now.toISOString()
          }
        } as any
      }
    );

    // 7. Audit log for machine run and affected orders
    await AuditService.recordEvent({
      actorId,
      actorRole,
      action: 'machine_run_transferred',
      entityType: 'machine_run',
      entityId: newRunId,
      before: { machineId: originalRun.machineId, runId: originalRun.runId },
      after: { machineId: targetMachineId, runId: newRunId },
      reason: `Transfer load from failed machine #${originalRun.machineCode}`
    });

    for (const orderId of newRun.orderIds) {
      await AuditService.recordOrderEvent({
        orderId,
        action: 'machine_run_transferred',
        actorId,
        actorRole,
        reason: `Load transferred to Machine #${targetMachine.machineCode} due to primary machine maintenance`,
        metadata: { originalMachineId: originalRun.machineId, targetMachineId, newRunId }
      });
    }

    return {
      oldRun: { ...(originalRun as unknown as MachineRun), transferredToRunId: newRunId },
      newRun
    };
  }

  /**
   * Resolves machine maintenance and returns it to AVAILABLE status, recording total downtime.
   */
  static async resolveMaintenance(params: {
    machineId: string;
    notes: string;
    resolvedBy: string;
  }): Promise<Machine> {
    const { machineId, notes, resolvedBy } = params;
    const db = await getDb();

    const machine = await db.collection('machines').findOne({ id: machineId });
    if (!machine) throw new NotFoundError('Machine not found.');

    const now = new Date();
    const nowIso = now.toISOString();

    let additionalDowntimeMinutes = 0;
    if (machine.downtimeStartedAt) {
      const start = new Date(machine.downtimeStartedAt);
      additionalDowntimeMinutes = Math.max(0, Math.round((now.getTime() - start.getTime()) / (1000 * 60)));
    }

    const totalDowntime = (machine.totalDowntimeMinutes || 0) + additionalDowntimeMinutes;

    await db.collection('machines').updateOne(
      { id: machineId },
      {
        $set: {
          status: 'AVAILABLE',
          maintenanceStatus: 'GOOD',
          lastMaintenanceAt: nowIso,
          downtimeStartedAt: null,
          downtimeEndedAt: nowIso,
          totalDowntimeMinutes: totalDowntime,
          currentOrderId: null,
          currentRunId: null,
          updated_at: nowIso,
          updatedAt: nowIso
        }
      }
    );

    await AuditService.recordEvent({
      actorId: resolvedBy,
      actorRole: 'manager',
      action: 'machine_maintenance_resolved',
      entityType: 'machine',
      entityId: machineId,
      reason: notes,
      metadata: { additionalDowntimeMinutes, totalDowntime }
    });

    return {
      ...(machine as unknown as Machine),
      status: 'AVAILABLE',
      totalDowntimeMinutes: totalDowntime
    };
  }
}
