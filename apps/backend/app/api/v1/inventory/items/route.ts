import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, requireRole, BadRequestError } from '@/lib/api';
import { InventoryService } from '@/services/InventoryService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const plantId = req.nextUrl.searchParams.get('plantId') || (user.role === 'manager' ? user.plant_id : undefined);
  const category = req.nextUrl.searchParams.get('category') as any;
  const lowStockOnly = req.nextUrl.searchParams.get('lowStockOnly') === 'true';
  const search = req.nextUrl.searchParams.get('search') || undefined;

  const items = await InventoryService.listItems({ plantId, category, lowStockOnly, search });
  return successResponse({ items });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();

  if (!body.name || !body.sku || !body.category || !body.unit || !body.plantId) {
    throw new BadRequestError('Missing required inventory fields (name, sku, category, unit, plantId).');
  }

  const item = await InventoryService.createItem(
    {
      plantId: body.plantId,
      plantName: body.plantName,
      name: body.name,
      sku: body.sku,
      category: body.category,
      unit: body.unit,
      quantityOnHand: body.quantityOnHand,
      minimumThreshold: body.minimumThreshold,
      reorderQuantity: body.reorderQuantity,
      unitCost: body.unitCost,
      supplierName: body.supplierName,
      supplierContact: body.supplierContact,
      locationShelf: body.locationShelf
    },
    { id: user.id || 'manager', role: user.role || 'manager' }
  );

  return successResponse({ item }, 201);
});
