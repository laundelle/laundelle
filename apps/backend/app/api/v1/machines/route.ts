import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, requireRole, BadRequestError } from '@/lib/api';
import { MachineService } from '@/services/MachineService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const plantId = req.nextUrl.searchParams.get('plantId') || user.plant_id || undefined;
  const machines = await MachineService.getMachines(plantId);
  return successResponse({ machines });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();
  const machine = await MachineService.registerMachine(body);
  return successResponse({ machine }, 201);
});
