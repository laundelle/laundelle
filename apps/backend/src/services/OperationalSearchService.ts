import { getDb } from '@/lib/mongodb';
import {
  OperationalSearchResult,
  UniversalHistoryEvent,
  Customer360Profile
} from '@laundelle/types';
import { NotFoundError } from '@/lib/api';

export class OperationalSearchService {
  /**
   * Universal search across 10+ operational entities.
   */
  static async search(
    queryText: string,
    filter: { entityType?: string; plantId?: string; limit?: number } = {}
  ): Promise<OperationalSearchResult[]> {
    const q = (queryText || '').trim();
    if (!q || q.length < 2) return [];

    const db = await getDb();
    const regex = new RegExp(q, 'i');
    const results: OperationalSearchResult[] = [];
    const limit = filter.limit || 20;

    // 1. Search Orders
    if (!filter.entityType || filter.entityType === 'ORDER') {
      const orderQuery: any = {
        $or: [
          { id: regex },
          { order_number: regex },
          { customer_name: regex },
          { customerName: regex },
          { pickup_address: regex },
          { delivery_address: regex }
        ]
      };
      if (filter.plantId) {
        orderQuery.$and = [{ $or: [{ plant_id: filter.plantId }, { plantId: filter.plantId }] }];
      }

      const orders = await db.collection('orders').find(orderQuery).limit(limit).toArray();
      for (const o of orders) {
        results.push({
          id: o.id,
          entityType: 'ORDER',
          title: `Order #${o.order_number || o.id}`,
          subtitle: `${o.customer_name || o.customerName || 'Customer'} • £${o.total_amount || o.pricing?.finalTotal || 0}`,
          status: o.status,
          plantId: o.plant_id || o.plantId,
          tags: [o.status, o.serviceType || 'Standard'],
          metadata: { createdAt: o.createdAt, weightKg: o.weightKg || o.actual_weight_kg }
        });
      }
    }

    // 2. Search Customers
    if (!filter.entityType || filter.entityType === 'CUSTOMER') {
      const customers = await db.collection('users').find({
        role: 'customer',
        $or: [{ name: regex }, { full_name: regex }, { email: regex }, { phone: regex }]
      }).limit(limit).toArray();

      for (const c of customers) {
        results.push({
          id: String(c._id || c.id),
          entityType: 'CUSTOMER',
          title: c.full_name || c.name || 'Customer',
          subtitle: `${c.email} • ${c.phone || 'No phone'}`,
          tags: ['Customer'],
          metadata: { email: c.email, phone: c.phone }
        });
      }
    }

    // 3. Search Drivers
    if (!filter.entityType || filter.entityType === 'DRIVER') {
      const drivers = await db.collection('users').find({
        role: 'driver',
        $or: [{ name: regex }, { full_name: regex }, { email: regex }, { phone: regex }]
      }).limit(limit).toArray();

      for (const d of drivers) {
        results.push({
          id: String(d._id || d.id),
          entityType: 'DRIVER',
          title: d.full_name || d.name || 'Driver',
          subtitle: `${d.phone || d.email || 'Courier'}`,
          status: d.isOnline ? 'ONLINE' : 'OFFLINE',
          plantId: d.plant_id || d.plantId,
          tags: ['Driver', d.isOnline ? 'Online' : 'Offline']
        });
      }
    }

    // 4. Search Vehicles
    if (!filter.entityType || filter.entityType === 'VEHICLE') {
      const vehicleQuery: any = {
        $or: [{ registrationNumber: regex }, { make: regex }, { model: regex }]
      };
      if (filter.plantId) vehicleQuery.plantId = filter.plantId;

      const vehicles = await db.collection('vehicles').find(vehicleQuery).limit(limit).toArray();
      for (const v of vehicles) {
        results.push({
          id: v.id,
          entityType: 'VEHICLE',
          title: `${v.registrationNumber} — ${v.make} ${v.model}`,
          subtitle: `Driver: ${v.currentDriverName || 'Unassigned'} • Capacity: ${v.capacityKg}kg`,
          status: v.status,
          plantId: v.plantId,
          tags: [v.type, v.status]
        });
      }
    }

    // 5. Search Inventory
    if (!filter.entityType || filter.entityType === 'INVENTORY') {
      const invQuery: any = {
        $or: [{ name: regex }, { sku: regex }, { category: regex }]
      };
      if (filter.plantId) invQuery.plantId = filter.plantId;

      const items = await db.collection('inventory_items').find(invQuery).limit(limit).toArray();
      for (const i of items) {
        results.push({
          id: i.id,
          entityType: 'INVENTORY',
          title: `${i.name} (${i.sku})`,
          subtitle: `On Hand: ${i.quantityOnHand} ${i.unit} • Threshold: ${i.minimumThreshold}`,
          status: i.isLowStock ? 'LOW_STOCK' : 'ADEQUATE',
          plantId: i.plantId,
          tags: [i.category, i.isLowStock ? 'Low Stock' : 'In Stock']
        });
      }
    }

    // 6. Search Machines
    if (!filter.entityType || filter.entityType === 'MACHINE') {
      const machQuery: any = {
        $or: [{ name: regex }, { machineCode: regex }, { type: regex }]
      };
      if (filter.plantId) machQuery.plantId = filter.plantId;

      const machines = await db.collection('machines').find(machQuery).limit(limit).toArray();
      for (const m of machines) {
        results.push({
          id: m.id,
          entityType: 'MACHINE',
          title: `${m.name || m.machineCode} (${m.type})`,
          subtitle: `Status: ${m.status} • Capacity: ${m.capacityKg}kg`,
          status: m.status,
          plantId: m.plantId,
          tags: [m.type, m.status]
        });
      }
    }

    // 7. Search Plants
    if (!filter.entityType || filter.entityType === 'PLANT') {
      const plants = await db.collection('plants').find({
        $or: [{ name: regex }, { code: regex }, { address: regex }]
      }).limit(limit).toArray();

      for (const p of plants) {
        results.push({
          id: p.id,
          entityType: 'PLANT',
          title: p.name || 'Laundry Plant',
          subtitle: p.address || p.code || 'Operational Facility',
          status: p.status,
          tags: ['Plant', p.status]
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Assembles a unified chronological timeline for any entity across audit logs and domain events.
   */
  static async getUniversalHistory(entityId: string, entityType?: string): Promise<UniversalHistoryEvent[]> {
    const db = await getDb();
    const events: UniversalHistoryEvent[] = [];

    // 1. Audit Log records
    const auditLogs = await db.collection('audit_log').find({
      $or: [{ entityId }, { 'metadata.orderId': entityId }, { 'metadata.entityId': entityId }]
    }).sort({ timestamp: -1 }).limit(100).toArray();

    for (const log of auditLogs) {
      events.push({
        id: log.eventId || String(log._id),
        entityId: log.entityId || entityId,
        entityType: log.entityType || entityType || 'ENTITY',
        timestamp: log.timestamp || new Date().toISOString(),
        action: log.action,
        performedBy: {
          id: log.actorId || 'system',
          name: log.actorId === 'system' ? 'System Runner' : log.actorId,
          role: log.actorRole || 'SYSTEM'
        },
        summary: `${log.action} performed on ${log.entityType || 'entity'}`,
        details: {
          reason: log.reason,
          before: log.before,
          after: log.after,
          metadata: log.metadata
        }
      });
    }

    // 2. If entity is an Order, also incorporate order timeline events
    const order = await db.collection('orders').findOne({ id: entityId });
    if (order && Array.isArray(order.timeline_events)) {
      for (const te of order.timeline_events) {
        events.push({
          id: `ord_te_${te.timestamp}_${te.status}`,
          entityId,
          entityType: 'ORDER',
          timestamp: te.timestamp || order.createdAt,
          action: te.status || 'STATUS_UPDATE',
          performedBy: {
            id: te.performedBy || 'driver',
            name: te.performedByName || te.performedBy || 'Staff Member',
            role: 'OPERATOR'
          },
          summary: te.note || `Order status updated to ${te.status}`,
          details: te
        });
      }
    }

    // Deduplicate and sort descending
    const seen = new Set<string>();
    const unique = events.filter((e) => {
      const key = `${e.action}_${e.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Assembles a 360-degree customer profile for operational and customer-support staff.
   */
  static async getCustomer360(customerId: string): Promise<Customer360Profile> {
    const db = await getDb();

    // 1. Fetch Customer User
    const user = await db.collection('users').findOne({
      $or: [{ id: customerId }, { _id: customerId } as any, { email: customerId }]
    });

    const primaryId = user?.id || (user?._id ? String(user._id) : customerId);
    const mongoId = user?._id ? String(user._id) : undefined;

    const customerObj = {
      id: primaryId,
      name: user?.full_name || user?.name || 'Customer',
      email: user?.email || '',
      phone: user?.phone || '',
      createdAt: user?.createdAt
    };

    const idCandidates = [primaryId, customerId, mongoId].filter(Boolean) as string[];

    // 2. Fetch Subscription
    const subscription = await db.collection('subscriptions').findOne({
      $or: [{ customerId: { $in: idCandidates } }, { customerEmail: customerObj.email }]
    });

    // 3. Fetch Orders
    const orders = await db.collection('orders').find({
      $or: [
        { customer_id: { $in: idCandidates } },
        { customerId: { $in: idCandidates } },
        { customer_email: customerObj.email },
        { 'customer.id': { $in: idCandidates } }
      ]
    }).sort({ createdAt: -1 }).toArray();

    // 4. Fetch Disputes
    const disputes = await db.collection('disputes').find({
      $or: [{ customerId: customerObj.id }, { customerEmail: customerObj.email }]
    }).toArray();

    // 5. Compute Aggregates
    let totalSpend = 0;
    let activeOrdersCount = 0;
    const completedStatuses = ['DELIVERED', 'COMPLETED'];
    const activeStatuses = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT_TO_PLANT', 'SORTING', 'PROCESSING', 'QC', 'OUT_FOR_DELIVERY'];

    for (const o of orders) {
      const st = (o.status || '').toUpperCase();
      if (completedStatuses.includes(st)) {
        totalSpend += Number(o.total_amount) || Number(o.pricing?.finalTotal) || 0;
      }
      if (activeStatuses.includes(st)) {
        activeOrdersCount++;
      }
    }

    const deliveryAddresses = user?.addresses || [];

    return {
      customer: customerObj,
      subscription: subscription as any,
      orders,
      disputes,
      totalSpend: Number(totalSpend.toFixed(2)),
      totalOrders: orders.length,
      activeOrdersCount,
      deliveryAddresses
    };
  }
}
