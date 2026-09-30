import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { MachineService } from '@/services/MachineService';

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = requireRole(req, ['processor', 'manager', 'admin', 'super_admin']);
  const { id: machineId } = await params;
  if (!machineId) throw new BadRequestError('Machine ID is required.');

  const body = await req.json();
  const reason = body.reason || 'Unscheduled technical fault or mechanical breakdown';

  const result = await MachineService.reportMachineFailure({
    machineId,
    reason,
    reportedBy: user.sub,
    reportedByRole: user.role
  });

  return successResponse(result);
});
