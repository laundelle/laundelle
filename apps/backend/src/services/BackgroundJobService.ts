import { NotificationService } from './NotificationService';
import { PrivacyService } from './PrivacyService';
import { AuditService } from './AuditService';
import { SlaService } from './SlaService';
import { CapacityService } from './CapacityService';
import { VehicleService } from './VehicleService';
import { InventoryService } from './InventoryService';
import { getDb } from '@/lib/mongodb';

export class BackgroundJobService {
  /**
   * Executes scheduled background maintenance jobs in a non-blocking, resilient manner.
   */
  static async runAllMaintenanceJobs(): Promise<{
    notifications: { retriedCount: number; failedPermanentlyCount: number };
    retentionSweep: { purgedPhotosCount: number; purgedNotificationsCount: number };
    auditIntegrity: { valid: boolean; totalChecked: number; message: string };
    slaCheck: { totalEvaluated: number; atRiskCount: number; breachedCount: number };
    vehicleSweep: { scanned: number; warnings: number; expired: number };
    inventorySweep: { totalChecked: number; lowStockCount: number };
  }> {
    // 1. Process notification retries
    let notifications = { retriedCount: 0, failedPermanentlyCount: 0 };
    try {
      notifications = await NotificationService.processRetries();
    } catch (err: any) {
      console.error('[BackgroundJob] Notification retries error:', err.message);
    }

    // 2. Data retention sweep (purging expired photos & notifications per policy)
    let retentionSweep = { purgedPhotosCount: 0, purgedNotificationsCount: 0 };
    try {
      const sweepRes = await PrivacyService.runDataRetentionSweep();
      retentionSweep = {
        purgedPhotosCount: sweepRes.purgedPhotosCount,
        purgedNotificationsCount: sweepRes.purgedNotificationsCount
      };
    } catch (err: any) {
      console.error('[BackgroundJob] Retention sweep error:', err.message);
    }

    // 3. Audit chain integrity check
    let auditIntegrity = { valid: true, totalChecked: 0, message: '' };
    try {
      auditIntegrity = await AuditService.verifyChainIntegrity();
    } catch (err: any) {
      console.error('[BackgroundJob] Audit integrity error:', err.message);
    }

    // 4. SLA evaluation sweep
    let slaCheck = { totalEvaluated: 0, atRiskCount: 0, breachedCount: 0 };
    try {
      const db = await getDb();
      const activeOrders = await db.collection('orders')
        .find({ status: { $nin: ['delivered', 'completed', 'cancelled'] } })
        .toArray();

      let atRisk = 0;
      let breached = 0;
      for (const order of activeOrders) {
        if (order.pickupDate) {
          const evalRes = await SlaService.checkAndEscalateSla(order.id);
          if (evalRes?.status === 'AT_RISK') atRisk++;
          if (evalRes?.status === 'BREACHED') breached++;
        }
      }
      slaCheck = { totalEvaluated: activeOrders.length, atRiskCount: atRisk, breachedCount: breached };
    } catch (err: any) {
      console.error('[BackgroundJob] SLA sweep error:', err.message);
    }

    // 5. Vehicle document expiry sweep (P2)
    let vehicleSweep = { scanned: 0, warnings: 0, expired: 0 };
    try {
      vehicleSweep = await VehicleService.runDocumentExpirySweep();
    } catch (err: any) {
      console.error('[BackgroundJob] Vehicle document sweep error:', err.message);
    }

    // 6. Inventory low stock check & alert sweep (P2)
    let inventorySweep = { totalChecked: 0, lowStockCount: 0 };
    try {
      inventorySweep = await InventoryService.runLowStockSweep();
    } catch (err: any) {
      console.error('[BackgroundJob] Inventory low stock sweep error:', err.message);
    }

    // Save job execution log in background_jobs
    try {
      const db = await getDb();
      await db.collection('background_jobs').insertOne({
        completedAt: new Date().toISOString(),
        notifications,
        retentionSweep,
        auditIntegrity,
        slaCheck,
        vehicleSweep,
        inventorySweep
      });
    } catch (err: any) {
      console.error('[BackgroundJob] Failed to write job log:', err.message);
    }

    return {
      notifications,
      retentionSweep,
      auditIntegrity,
      slaCheck,
      vehicleSweep,
      inventorySweep
    };
  }
}

