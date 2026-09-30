import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import { getDb } from '@/lib/mongodb';

export async function GET(req: NextRequest, context: any) {
  try {
    const session = await requireAuth(req);
    const params = await context.params;
    const orderId = params?.id || context.params?.id;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const isStaff = ['admin', 'super_admin', 'manager', 'driver', 'processor'].includes(session.role || '');
    const isOwner = String(order.customer_id || order.customerId || order.userId) === String(session.sub || '');

    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: 'Access denied: You do not have permission to view this order audit trail.' }, { status: 403 });
    }

    const logsResult = await AuditService.getLogs({ entityId: orderId }, 200, 1);
    const integrity = await AuditService.verifyChainIntegrity(orderId);

    return NextResponse.json({
      orderId,
      logs: logsResult.items,
      total: logsResult.pagination.total,
      integrity
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch audit trail' }, { status: 400 });
  }
}
