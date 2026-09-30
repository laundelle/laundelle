import { getDb } from '@/lib/mongodb';
import { MachineRun, MachineRunStatus } from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import { generateMachineRunId } from '@laundelle/ids';

export class MachineRunService {
  /**
   * Starts a commercial machine run binding orders/items to a washer, dryer, or press.
   */
  static async startRun(params: {
    machineId: string;
    plantId: string;
    processorId: string;
    processorName?: string;
    orderIds: string[];
    orderItemIds?: string[];
    cycleType: string;
    temperature?: string;
    durationMinutes?: number;
    notes?: string;
  }): Promise<MachineRun> {
    const { machineId, plantId, processorId, processorName, orderIds, orderItemIds, cycleType, temperature, durationMinutes = 45, notes } = params;

    if (!machineId || !plantId || !orderIds || orderIds.length === 0) {
      throw new BadRequestError('Missing mandatory machine run parameters: machineId, plantId, orderIds.');
    }

    const db = await getDb();
    const machine = await db.collection('machines').findOne({ id: machineId });
    if (!machine) {
      throw new NotFoundError(`Machine with ID '${machineId}' not found.`);
    }

    // Availability Guard: Prevent assigning loads to running or broken machines
    const currentMachineStatus = (machine.status || 'available').toLowerCase();
    if (['running', 'maintenance', 'fault', 'cleaning'].includes(currentMachineStatus)) {
      throw new BadRequestError(`Machine '${machine.name || machine.machineCode || machineId}' is currently ${currentMachineStatus.toUpperCase()}. Cannot start cycle.`);
    }

    const now = new Date();
    const expectedEnd = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const runId = generateMachineRunId();

    const newRun: MachineRun = {
      id: runId,
      publicId: runId,
      runId,
      machineId,
      machineCode: machine.machineCode || machine.code,
      plantId,
      orderIds,
      orderItemIds: orderItemIds || [],
      processorId,
      processorName: processorName || 'Facility Processor',
      machineType: machine.machineType || 'Washer',
      cycleType: cycleType || 'Eco Wash 40°C',
      temperature: temperature || '40°C',
      startedAt: now.toISOString(),
      expectedEndAt: expectedEnd.toISOString(),
      status: 'RUNNING',
      notes,
      createdAt: now.toISOString()
    };

    // 1. Insert run record
    await db.collection('machine_runs').insertOne(newRun as any);

    // 2. Lock machine to RUNNING
    await db.collection('machines').updateOne(
      { id: machineId },
      {
        $set: {
          status: 'running',
          currentOrderId: orderIds[0],
          currentRunId: runId,
          updated_at: now.toISOString()
        }
      }
    );

    // 3. Update orders timeline
    await db.collection('orders').updateMany(
      { id: { $in: orderIds } },
      {
        $set: { updated_at: now.toISOString() },
        $push: {
          timeline_events: {
            event: 'machine_run_started',
            label: `${newRun.machineType} Started on Machine #${newRun.machineCode || machineId} (${newRun.cycleType})`,
            actor: 'processor',
            actorId: processorId,
            machineId,
            timestamp: now.toISOString()
          }
        } as any
      }
    );

    // 4. Audit log
    for (const oid of orderIds) {
      await AuditService.recordOrderEvent({
        orderId: oid,
        action: 'machine_run_started',
        actorId: processorId,
        actorRole: 'processor',
        metadata: { runId, machineId, cycleType }
      });
    }

    return newRun;
  }

  /**
   * Completes an active machine run and marks the machine available.
   */
  static async completeRun(runId: string, actorIdOrNotes?: string, notes?: string): Promise<MachineRun> {
    const finalNotes = notes || (actorIdOrNotes && !notes ? actorIdOrNotes : undefined);
    const db = await getDb();
    const run = await db.collection('machine_runs').findOne({ runId });
    if (!run) throw new NotFoundError('Machine run not found.');

    const now = new Date().toISOString();

    // 1. Mark run completed
    await db.collection('machine_runs').updateOne(
      { runId },
      {
        $set: {
          status: 'COMPLETED',
          actualEndAt: now,
          ...(finalNotes ? { notes: finalNotes } : {}),
          updatedAt: now
        }
      }
    );

    // 2. Free machine back to available
    await db.collection('machines').updateOne(
      { id: run.machineId },
      {
        $set: {
          status: 'available',
          currentOrderId: null,
          currentRunId: null,
          updated_at: now
        }
      }
    );

    if (run && Array.isArray(run.orderIds)) {
      for (const oid of run.orderIds) {
        await AuditService.recordOrderEvent({
          orderId: oid,
          action: 'machine_run_completed',
          actorId: actorIdOrNotes || 'system',
          actorRole: 'processor',
          metadata: { runId, machineId: run.machineId }
        });
      }
    }

    return {
      ...(run as unknown as MachineRun),
      status: 'COMPLETED',
      actualEndAt: now
    };
  }

  /**
   * Fetches machine run history for traceability.
   */
  static async getRuns(filter: { plantId?: string; machineId?: string; status?: MachineRunStatus } = {}, limit = 50) {
    const db = await getDb();
    const query: any = {};
    if (filter.plantId) query.plantId = filter.plantId;
    if (filter.machineId) query.machineId = filter.machineId;
    if (filter.status) query.status = filter.status;

    const runs = await db.collection('machine_runs')
      .find(query)
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();

    return runs as unknown as MachineRun[];
  }

  /**
   * Fetches active (RUNNING) machine runs for a given plant.
   */
  static async getActiveRunsForPlant(plantId: string) {
    return this.getRuns({ plantId, status: 'RUNNING' });
  }
}
