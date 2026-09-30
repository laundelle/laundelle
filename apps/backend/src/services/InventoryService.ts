import { getDb } from '@/lib/mongodb';
import {
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  InventoryTransfer,
  InventoryTransferStatus,
  InventoryCategory,
  InventoryUnit
} from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { AuditService } from './AuditService';
import { AlertService } from './AlertService';
import crypto from 'crypto';
import { generateInventoryItemId, generateInventoryTransactionId, generateInventoryTransferId } from '@laundelle/ids';

export class InventoryService {
  /**
   * Registers a new consumable inventory item.
   */
  static async createItem(
    data: {
      plantId: string;
      plantName?: string;
      name: string;
      sku: string;
      category: InventoryCategory;
      unit: InventoryUnit;
      quantityOnHand?: number;
      minimumThreshold: number;
      reorderQuantity: number;
      unitCost: number;
      supplierName?: string;
      supplierContact?: string;
      locationShelf?: string;
    },
    actor: { id: string; role: string }
  ): Promise<InventoryItem> {
    const db = await getDb();
    const sku = data.sku.trim().toUpperCase();

    const existing = await db.collection('inventory_items').findOne({
      plantId: data.plantId,
      sku
    });
    if (existing) {
      throw new BadRequestError(`SKU ${sku} already exists for this plant.`);
    }

    const id = generateInventoryItemId();
    const now = new Date().toISOString();
    const initialQty = Number(data.quantityOnHand) || 0;
    const isLowStock = initialQty <= data.minimumThreshold;

    const item: InventoryItem = {
      id,
      publicId: id,
      plantId: data.plantId,
      plantName: data.plantName,
      name: data.name.trim(),
      sku,
      category: data.category,
      unit: data.unit,
      quantityOnHand: initialQty,
      minimumThreshold: Number(data.minimumThreshold) || 0,
      reorderQuantity: Number(data.reorderQuantity) || 10,
      unitCost: Number(data.unitCost) || 0,
      supplierName: data.supplierName,
      supplierContact: data.supplierContact,
      locationShelf: data.locationShelf,
      lastRestockedAt: initialQty > 0 ? now : undefined,
      isLowStock,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('inventory_items').insertOne(item);

    // Initial balance ledger entry if non-zero
    if (initialQty > 0) {
      const txId = generateInventoryTransactionId();
      const transaction: InventoryTransaction = {
        id: txId,
        publicId: txId,
        itemId: id,
        itemName: item.name,
        plantId: item.plantId,
        type: 'PURCHASE',
        quantity: initialQty,
        previousBalance: 0,
        newBalance: initialQty,
        unitCost: item.unitCost,
        referenceType: 'MANUAL_AUDIT',
        notes: 'Initial inventory balance on creation',
        performedBy: actor.id,
        performedAt: now
      };
      await db.collection('inventory_transactions').insertOne(transaction);
    }

    if (isLowStock) {
      await AlertService.createAlert({
        plantId: item.plantId,
        type: 'INVENTORY_LOW',
        severity: 'WARNING',
        title: `Low Stock: ${item.name}`,
        message: `${item.name} (${item.sku}) is at ${initialQty} ${item.unit} (Threshold: ${item.minimumThreshold}).`,
        entityId: item.id,
        entityType: 'INVENTORY'
      });
    }

    await AuditService.recordEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'INVENTORY',
      entityId: id,
      after: item
    });

    return item;
  }

  /**
   * Retrieves an item by ID.
   */
  static async getItem(id: string): Promise<InventoryItem | null> {
    const db = await getDb();
    const item = await db.collection('inventory_items').findOne({ id });
    return item as unknown as InventoryItem | null;
  }

  /**
   * Lists inventory items with optional filtering.
   */
  static async listItems(filter: {
    plantId?: string;
    category?: InventoryCategory;
    lowStockOnly?: boolean;
    search?: string;
  } = {}): Promise<InventoryItem[]> {
    const db = await getDb();
    const query: any = {};

    if (filter.plantId) query.plantId = filter.plantId;
    if (filter.category) query.category = filter.category;
    if (filter.lowStockOnly) query.isLowStock = true;
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { sku: { $regex: filter.search, $options: 'i' } }
      ];
    }

    const items = await db.collection('inventory_items').find(query).sort({ name: 1 }).toArray();
    return items as unknown as InventoryItem[];
  }

  /**
   * Atomically adjusts stock with full ledger transaction logging.
   * Prevents negative inventory on deductions.
   */
  static async adjustStock(params: {
    itemId: string;
    quantity: number; // positive to add, negative to deduct
    type: InventoryTransactionType;
    referenceId?: string;
    referenceType?: InventoryTransaction['referenceType'];
    notes?: string;
    unitCost?: number;
    actor: { id: string; role: string };
  }): Promise<{ item: InventoryItem; transaction: InventoryTransaction }> {
    const db = await getDb();
    const item = await InventoryService.getItem(params.itemId);
    if (!item) {
      throw new NotFoundError(`Inventory item ${params.itemId} not found.`);
    }

    const previousBalance = item.quantityOnHand;
    const newBalance = previousBalance + params.quantity;

    if (newBalance < 0) {
      throw new BadRequestError(
        `Insufficient inventory: requested deduction of ${Math.abs(params.quantity)} ${item.unit} exceeds on-hand stock of ${previousBalance} ${item.unit}.`
      );
    }

    const isLowStock = newBalance <= item.minimumThreshold;
    const now = new Date().toISOString();

    // 1. Atomic update of item stock
    const updatePayload: any = {
      $set: {
        quantityOnHand: newBalance,
        isLowStock,
        updatedAt: now
      }
    };
    if (params.quantity > 0) {
      updatePayload.$set.lastRestockedAt = now;
    }

    await db.collection('inventory_items').updateOne({ id: item.id }, updatePayload);

    // 2. Append immutable transaction to ledger
    const txId = generateInventoryTransactionId();
    const transaction: InventoryTransaction = {
      id: txId,
      publicId: txId,
      itemId: item.id,
      itemName: item.name,
      plantId: item.plantId,
      type: params.type,
      quantity: params.quantity,
      previousBalance,
      newBalance,
      unitCost: params.unitCost !== undefined ? params.unitCost : item.unitCost,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      notes: params.notes,
      performedBy: params.actor.id,
      performedAt: now
    };

    await db.collection('inventory_transactions').insertOne(transaction);

    // 3. Low stock alert management
    if (isLowStock) {
      await AlertService.createAlert({
        plantId: item.plantId,
        type: 'INVENTORY_LOW',
        severity: newBalance === 0 ? 'CRITICAL' : 'WARNING',
        title: `Low Stock: ${item.name}`,
        message: `${item.name} (${item.sku}) is at ${newBalance} ${item.unit} (Threshold: ${item.minimumThreshold}). Reorder quantity recommended: ${item.reorderQuantity}.`,
        entityId: item.id,
        entityType: 'INVENTORY'
      });
    } else {
      await AlertService.resolveByEntityAndType(item.id, 'INVENTORY_LOW', params.actor.id);
    }

    // 4. Audit logging
    await AuditService.recordEvent({
      actorId: params.actor.id,
      actorRole: params.actor.role,
      action: 'INVENTORY_STOCK_ADJUSTED',
      entityType: 'INVENTORY',
      entityId: item.id,
      before: { quantityOnHand: previousBalance },
      after: { quantityOnHand: newBalance, type: params.type, quantity: params.quantity },
      metadata: { transactionId: txId, referenceId: params.referenceId }
    });

    const updatedItem = { ...item, quantityOnHand: newBalance, isLowStock, updatedAt: now };
    return { item: updatedItem, transaction };
  }

  /**
   * Auto-deducts consumables upon processing wash cycles / completion.
   * e.g. 0.05 L detergent per kg, 0.03 L softener per kg, 1 packaging bag per order.
   */
  static async deductProcessingUsage(params: {
    plantId: string;
    weightKg: number;
    orderId?: string;
    actor: { id: string; role: string };
  }): Promise<{ deductedCount: number; transactions: InventoryTransaction[] }> {
    const db = await getDb();
    const plantItems = await db.collection('inventory_items').find({ plantId: params.plantId }).toArray();
    const transactions: InventoryTransaction[] = [];

    const kg = Math.max(1, params.weightKg || 6);

    for (const rawItem of plantItems) {
      const item = rawItem as unknown as InventoryItem;
      let deductQty = 0;

      if (item.category === 'DETERGENT') {
        // approx 0.05 Litres or 0.05 kg per kg laundry
        deductQty = Number((kg * 0.05).toFixed(2));
      } else if (item.category === 'SOFTENER') {
        deductQty = Number((kg * 0.03).toFixed(2));
      } else if (item.category === 'PACKAGING' || item.category === 'BAG') {
        deductQty = 1;
      }

      if (deductQty > 0 && item.quantityOnHand >= deductQty) {
        try {
          const res = await InventoryService.adjustStock({
            itemId: item.id,
            quantity: -deductQty,
            type: 'CONSUMPTION',
            referenceId: params.orderId,
            referenceType: 'ORDER',
            notes: `Auto-consumption for wash weight ${kg}kg (Order ${params.orderId || 'batch'})`,
            actor: params.actor
          });
          transactions.push(res.transaction);
        } catch (e: any) {
          console.warn(`[InventoryService] Auto-deduction failed for ${item.name}:`, e.message);
        }
      }
    }

    return { deductedCount: transactions.length, transactions };
  }

  /**
   * Initiates an inter-plant inventory transfer request.
   */
  static async requestTransfer(params: {
    sourcePlantId: string;
    sourcePlantName: string;
    destinationPlantId: string;
    destinationPlantName: string;
    itemId: string;
    quantity: number;
    requestedBy: string;
    notes?: string;
  }): Promise<InventoryTransfer> {
    const db = await getDb();
    const sourceItem = await InventoryService.getItem(params.itemId);
    if (!sourceItem) {
      throw new NotFoundError(`Source inventory item ${params.itemId} not found.`);
    }

    if (sourceItem.plantId !== params.sourcePlantId) {
      throw new BadRequestError('Item does not belong to specified source plant.');
    }

    if (params.quantity <= 0) {
      throw new BadRequestError('Transfer quantity must be greater than zero.');
    }

    if (sourceItem.quantityOnHand < params.quantity) {
      throw new BadRequestError(
        `Insufficient stock for transfer: requested ${params.quantity} ${sourceItem.unit}, but only ${sourceItem.quantityOnHand} available.`
      );
    }

    const id = generateInventoryTransferId();
    const now = new Date().toISOString();

    const transfer: InventoryTransfer = {
      id,
      publicId: id,
      sourcePlantId: params.sourcePlantId,
      sourcePlantName: params.sourcePlantName,
      destinationPlantId: params.destinationPlantId,
      destinationPlantName: params.destinationPlantName,
      itemId: sourceItem.id,
      itemName: sourceItem.name,
      quantity: params.quantity,
      unit: sourceItem.unit,
      status: 'REQUESTED',
      requestedBy: params.requestedBy,
      requestedAt: now,
      notes: params.notes
    };

    await db.collection('inventory_transfers').insertOne(transfer);

    await AuditService.recordEvent({
      actorId: params.requestedBy,
      actorRole: 'MANAGER',
      action: 'INVENTORY_TRANSFER_REQUESTED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: id,
      after: transfer
    });

    return transfer;
  }

  /**
   * Approves an inventory transfer.
   */
  static async approveTransfer(transferId: string, approvedBy: string): Promise<InventoryTransfer> {
    const db = await getDb();
    const transfer = await db.collection('inventory_transfers').findOne({ id: transferId });
    if (!transfer) throw new NotFoundError(`Transfer ${transferId} not found.`);

    if (transfer.status !== 'REQUESTED') {
      throw new BadRequestError(`Cannot approve transfer in status ${transfer.status}.`);
    }

    const now = new Date().toISOString();
    await db.collection('inventory_transfers').updateOne(
      { id: transferId },
      { $set: { status: 'APPROVED', approvedBy, approvedAt: now } }
    );

    await AuditService.recordEvent({
      actorId: approvedBy,
      actorRole: 'MANAGER',
      action: 'INVENTORY_TRANSFER_APPROVED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: transferId
    });

    return { ...(transfer as unknown as InventoryTransfer), status: 'APPROVED', approvedBy, approvedAt: now };
  }

  /**
   * Dispatches an inventory transfer, deducting stock from source plant.
   */
  static async dispatchTransfer(
    transferId: string,
    dispatchedBy: string,
    trackingNotes?: string
  ): Promise<InventoryTransfer> {
    const db = await getDb();
    const transfer = await db.collection('inventory_transfers').findOne({ id: transferId });
    if (!transfer) throw new NotFoundError(`Transfer ${transferId} not found.`);

    if (transfer.status !== 'APPROVED') {
      throw new BadRequestError(`Transfer must be in APPROVED status before dispatch (current: ${transfer.status}).`);
    }

    // Deduct stock from source item atomically
    await InventoryService.adjustStock({
      itemId: transfer.itemId,
      quantity: -transfer.quantity,
      type: 'TRANSFER_OUT',
      referenceId: transfer.id,
      referenceType: 'TRANSFER',
      notes: `Dispatched to plant ${transfer.destinationPlantName}`,
      actor: { id: dispatchedBy, role: 'MANAGER' }
    });

    const now = new Date().toISOString();
    await db.collection('inventory_transfers').updateOne(
      { id: transferId },
      {
        $set: {
          status: 'DISPATCHED',
          dispatchedBy,
          dispatchedAt: now,
          trackingNotes: trackingNotes || transfer.trackingNotes
        }
      }
    );

    await AuditService.recordEvent({
      actorId: dispatchedBy,
      actorRole: 'MANAGER',
      action: 'INVENTORY_TRANSFER_DISPATCHED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: transferId
    });

    return {
      ...(transfer as unknown as InventoryTransfer),
      status: 'DISPATCHED',
      dispatchedBy,
      dispatchedAt: now,
      trackingNotes
    };
  }

  /**
   * Receives an inventory transfer, incrementing stock at destination plant.
   */
  static async receiveTransfer(transferId: string, receivedBy: string): Promise<InventoryTransfer> {
    const db = await getDb();
    const transfer = await db.collection('inventory_transfers').findOne({ id: transferId });
    if (!transfer) throw new NotFoundError(`Transfer ${transferId} not found.`);

    if (transfer.status !== 'DISPATCHED') {
      throw new BadRequestError(`Transfer must be in DISPATCHED status to receive (current: ${transfer.status}).`);
    }

    const sourceItem = await InventoryService.getItem(transfer.itemId);
    if (!sourceItem) throw new NotFoundError('Source item definition not found.');

    // Find or create item at destination plant with matching SKU
    let destItemId: string;
    const existingDest = await db.collection('inventory_items').findOne({
      plantId: transfer.destinationPlantId,
      sku: sourceItem.sku
    });

    if (!existingDest) {
      const created = await InventoryService.createItem(
        {
          plantId: transfer.destinationPlantId,
          plantName: transfer.destinationPlantName,
          name: sourceItem.name,
          sku: sourceItem.sku,
          category: sourceItem.category,
          unit: sourceItem.unit,
          quantityOnHand: 0,
          minimumThreshold: sourceItem.minimumThreshold,
          reorderQuantity: sourceItem.reorderQuantity,
          unitCost: sourceItem.unitCost,
          supplierName: sourceItem.supplierName
        },
        { id: receivedBy, role: 'MANAGER' }
      );
      destItemId = created.id;
    } else {
      destItemId = existingDest.id;
    }

    // Add stock to destination plant item
    await InventoryService.adjustStock({
      itemId: destItemId,
      quantity: transfer.quantity,
      type: 'TRANSFER_IN',
      referenceId: transfer.id,
      referenceType: 'TRANSFER',
      notes: `Received from plant ${transfer.sourcePlantName}`,
      actor: { id: receivedBy, role: 'MANAGER' }
    });

    const now = new Date().toISOString();
    await db.collection('inventory_transfers').updateOne(
      { id: transferId },
      { $set: { status: 'RECEIVED', receivedBy, receivedAt: now } }
    );

    await AuditService.recordEvent({
      actorId: receivedBy,
      actorRole: 'MANAGER',
      action: 'INVENTORY_TRANSFER_RECEIVED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: transferId
    });

    return { ...(transfer as unknown as InventoryTransfer), status: 'RECEIVED', receivedBy, receivedAt: now };
  }

  /**
   * Retrieves transfers.
   */
  static async getTransfers(filter: { plantId?: string; status?: InventoryTransferStatus } = {}): Promise<InventoryTransfer[]> {
    const db = await getDb();
    const query: any = {};
    if (filter.plantId) {
      query.$or = [{ sourcePlantId: filter.plantId }, { destinationPlantId: filter.plantId }];
    }
    if (filter.status) query.status = filter.status;

    const list = await db.collection('inventory_transfers').find(query).sort({ requestedAt: -1 }).toArray();
    return list as unknown as InventoryTransfer[];
  }

  /**
   * Retrieves transaction ledger for an item or plant.
   */
  static async getTransactions(filter: { itemId?: string; plantId?: string; referenceId?: string } = {}): Promise<InventoryTransaction[]> {
    const db = await getDb();
    const query: any = {};
    if (filter.itemId) query.itemId = filter.itemId;
    if (filter.plantId) query.plantId = filter.plantId;
    if (filter.referenceId) query.referenceId = filter.referenceId;

    const list = await db.collection('inventory_transactions').find(query).sort({ performedAt: -1 }).limit(200).toArray();
    return list as unknown as InventoryTransaction[];
  }

  /**
   * Sweeps all items for low stock and alerts.
   */
  static async runLowStockSweep(): Promise<{ totalChecked: number; lowStockCount: number }> {
    const db = await getDb();
    const items = await db.collection('inventory_items').find({}).toArray();

    let totalChecked = 0;
    let lowStockCount = 0;

    for (const raw of items) {
      totalChecked++;
      const item = raw as unknown as InventoryItem;
      const isLow = item.quantityOnHand <= item.minimumThreshold;

      if (isLow) {
        lowStockCount++;
        await db.collection('inventory_items').updateOne({ id: item.id }, { $set: { isLowStock: true } });
        await AlertService.createAlert({
          plantId: item.plantId,
          type: 'INVENTORY_LOW',
          severity: item.quantityOnHand === 0 ? 'CRITICAL' : 'WARNING',
          title: `Low Stock: ${item.name}`,
          message: `${item.name} (${item.sku}) is at ${item.quantityOnHand} ${item.unit} (Threshold: ${item.minimumThreshold}).`,
          entityId: item.id,
          entityType: 'INVENTORY'
        });
      } else {
        if (item.isLowStock) {
          await db.collection('inventory_items').updateOne({ id: item.id }, { $set: { isLowStock: false } });
          await AlertService.resolveByEntityAndType(item.id, 'INVENTORY_LOW', 'sweep_job');
        }
      }
    }

    return { totalChecked, lowStockCount };
  }
}
