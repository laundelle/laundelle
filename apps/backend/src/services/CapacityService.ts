import { getDb } from '@/lib/mongodb';
import { PlantCapacityReport, PlantStage, PlantStageCapacity, PlantStaffCapacity } from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { NotificationService } from './NotificationService';

const STAGE_CONFIGS: Record<PlantStage, { label: string; baseCapacityKg: number }> = {
  intake: { label: 'Inbound Intake & Weighing', baseCapacityKg: 800 },
  washing: { label: 'Industrial Washers', baseCapacityKg: 600 },
  drying: { label: 'Low-Heat Dryers', baseCapacityKg: 500 },
  ironing: { label: 'Steam Ironing & Press', baseCapacityKg: 350 },
  folding: { label: 'Precision Folding', baseCapacityKg: 500 },
  qc: { label: '9-Point Quality Inspection', baseCapacityKg: 400 },
  packaging: { label: 'Anti-Static Film Packaging', baseCapacityKg: 600 },
  delivery: { label: 'Outbound Courier Dispatch', baseCapacityKg: 750 }
};

export class CapacityService {
  /**
   * Generates a real-time plant capacity report, calculating stage utilization,
   * detecting operational bottlenecks, and checking staff availability.
   */
  static async getPlantCapacityReport(plantId: string): Promise<PlantCapacityReport> {
    const db = await getDb();

    // 1. Get plant metadata
    const plant = await db.collection('plants').findOne({ $or: [{ _id: plantId }, { id: plantId }, { code: plantId }] } as any);
    const plantName = plant ? plant.name : `Plant Hub #${plantId}`;
    const effectivePlantId = plant ? (plant._id || plant.id) : plantId;

    // 2. Fetch active orders in plant pipeline
    const activeOrders = await db.collection('orders').find({
      $or: [{ plant_id: effectivePlantId }, { plantId: effectivePlantId }],
      status: { $nin: ['delivered', 'completed', 'cancelled'] }
    }).toArray();

    // 3. Stage allocation mapping
    const stageLoads: Record<PlantStage, { kg: number; count: number }> = {
      intake: { kg: 0, count: 0 },
      washing: { kg: 0, count: 0 },
      drying: { kg: 0, count: 0 },
      ironing: { kg: 0, count: 0 },
      folding: { kg: 0, count: 0 },
      qc: { kg: 0, count: 0 },
      packaging: { kg: 0, count: 0 },
      delivery: { kg: 0, count: 0 }
    };

    let expressOrdersCount = 0;

    for (const order of activeOrders) {
      const kg = Number(order.weightKg || order.weight || 6);
      const isExpress = order.serviceType === 'express' || order.turnaround === 'Express 24h' || order.isExpress;
      if (isExpress) expressOrdersCount++;

      const st = (order.status || '').toLowerCase();
      if (['booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pickup_in_progress', 'laundry_collected', 'in_transit_to_plant', 'received_at_facility'].includes(st)) {
        stageLoads.intake.kg += kg;
        stageLoads.intake.count++;
      } else if (['washing', 'in_wash', 'rewash_required'].includes(st)) {
        stageLoads.washing.kg += kg;
        stageLoads.washing.count++;
      } else if (['drying'].includes(st)) {
        stageLoads.drying.kg += kg;
        stageLoads.drying.count++;
      } else if (['ironing', 'folding_steaming'].includes(st)) {
        stageLoads.ironing.kg += kg;
        stageLoads.ironing.count++;
      } else if (['folding'].includes(st)) {
        stageLoads.folding.kg += kg;
        stageLoads.folding.count++;
      } else if (['quality_check', 'ready_for_qc'].includes(st)) {
        stageLoads.qc.kg += kg;
        stageLoads.qc.count++;
      } else if (['ready_for_delivery'].includes(st)) {
        stageLoads.packaging.kg += kg;
        stageLoads.packaging.count++;
      } else if (['delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery', 'delivery_attempted'].includes(st)) {
        stageLoads.delivery.kg += kg;
        stageLoads.delivery.count++;
      }
    }

    // 4. Calculate stage utilization and find bottleneck
    let maxUtilization = -1;
    let bottleneckStage: PlantStage = 'washing';
    const stages: Record<PlantStage, PlantStageCapacity> = {} as any;

    const stagesList: PlantStage[] = ['intake', 'washing', 'drying', 'ironing', 'folding', 'qc', 'packaging', 'delivery'];

    for (const s of stagesList) {
      const config = STAGE_CONFIGS[s];
      const load = stageLoads[s].kg;
      const cap = config.baseCapacityKg;
      const util = Math.min(100, Math.round((load / cap) * 100));

      if (util > maxUtilization) {
        maxUtilization = util;
        bottleneckStage = s;
      }

      stages[s] = {
        stage: s,
        stageLabel: config.label,
        currentLoadKg: load,
        maxCapacityKg: cap,
        utilizationPercent: util,
        bottleneck: false,
        activeItemsCount: stageLoads[s].count
      };
    }

    // Mark the bottleneck stage
    if (stages[bottleneckStage]) {
      stages[bottleneckStage].bottleneck = true;
    }

    // 5. Staff capacity query
    const staffMembers = await db.collection('users').find({
      role: { $in: ['driver', 'processor'] },
      $or: [{ plant_id: effectivePlantId }, { plantId: effectivePlantId }]
    }).toArray();

    const staff: PlantStaffCapacity = {
      drivers: { total: 0, available: 0, busy: 0, offline: 0 },
      processors: { total: 0, available: 0, busy: 0, offline: 0 }
    };

    for (const m of staffMembers) {
      const isOnline = m.is_active !== false && m.isOnline !== false;
      const isBusy = Boolean(m.currentJobId || m.currentOrderId);

      if (m.role === 'driver') {
        staff.drivers.total++;
        if (!isOnline) staff.drivers.offline++;
        else if (isBusy) staff.drivers.busy++;
        else staff.drivers.available++;
      } else if (m.role === 'processor') {
        staff.processors.total++;
        if (!isOnline) staff.processors.offline++;
        else if (isBusy) staff.processors.busy++;
        else staff.processors.available++;
      }
    }

    // 6. Express allocation capacity (Cap: 20% of max orders or 25 orders/day)
    const expressCapacityLimit = 20;
    const expressAvailable = expressOrdersCount < expressCapacityLimit;

    // 7. Generate Capacity Alerts
    const alerts: Array<{ severity: 'warning' | 'critical'; message: string; stage?: PlantStage }> = [];

    if (maxUtilization >= 90) {
      alerts.push({
        severity: 'critical',
        message: `CRITICAL BOTTLENECK: ${STAGE_CONFIGS[bottleneckStage].label} is at ${maxUtilization}% load. Immediate throughput intervention required.`,
        stage: bottleneckStage
      });
    } else if (maxUtilization >= 80) {
      alerts.push({
        severity: 'warning',
        message: `High Load Alert: ${STAGE_CONFIGS[bottleneckStage].label} reached ${maxUtilization}% capacity.`,
        stage: bottleneckStage
      });
    }

    if (staff.drivers.available === 0 && staff.drivers.total > 0) {
      alerts.push({
        severity: 'warning',
        message: 'Driver Capacity Warning: Zero available drivers in active pool.'
      });
    }

    return {
      plantId: String(effectivePlantId),
      plantName,
      calculatedAt: new Date().toISOString(),
      overallUtilizationPercent: maxUtilization,
      currentBottleneck: bottleneckStage,
      bottleneckStage,
      bottleneckDescription: `${STAGE_CONFIGS[bottleneckStage].label} is currently the primary constraint at ${maxUtilization}% capacity utilization.`,
      stages,
      staff,
      expressOrdersToday: expressOrdersCount,
      expressCapacityLimit,
      expressAvailable,
      alerts
    };
  }

  /**
   * Capacity-Aware Slot Booking Validator:
   * Evaluates operational feasibility before confirming a booking slot.
   */
  static async validateSlotFeasibility(params: {
    plantId: string;
    slotDate: string;
    slotTime: string;
    isExpress?: boolean;
    orderKg?: number;
  }): Promise<{
    feasible: boolean;
    reason?: string;
    expressAllowed: boolean;
  }> {
    const { plantId, slotDate, slotTime, isExpress = false, orderKg = 8 } = params;
    const report = await this.getPlantCapacityReport(plantId);

    // 1. Overall plant saturation check (>100% load)
    if (report.overallUtilizationPercent >= 100) {
      return {
        feasible: false,
        reason: `Plant is at maximum operating capacity (${report.overallUtilizationPercent}%). Please select an alternate day.`,
        expressAllowed: false
      };
    }

    // 2. Express order allocation check
    if (isExpress && !report.expressAvailable) {
      return {
        feasible: false,
        reason: `Express order capacity for today has been reached (${report.expressOrdersToday}/${report.expressCapacityLimit} slots booked). Only standard delivery is available.`,
        expressAllowed: false
      };
    }

    // 3. Driver staffing feasibility
    if (report.staff.drivers.total > 0 && report.staff.drivers.available === 0 && report.staff.drivers.busy > 10) {
      return {
        feasible: false,
        reason: 'Courier fleet capacity is currently constrained for this slot. Please select the next available time window.',
        expressAllowed: report.expressAvailable
      };
    }

    return {
      feasible: true,
      expressAllowed: report.expressAvailable
    };
  }
}
