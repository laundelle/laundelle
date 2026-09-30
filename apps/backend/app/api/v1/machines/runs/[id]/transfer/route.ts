import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { MachineService } from '@/services/MachineService';

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = requireRole(req, ['processor', 'manager', 'admin', 'super_admin']);
  const { id: runId } = await params;
  if (!runId) throw new BadRequestError('Run ID is required.');

  const body = await req.json();
  const { targetMachineId } = body;
  if (!targetMachineId) throw new BadRequestError('targetMachineId is required to transfer run.');

  const result = await MachineService.transferMachineRun({
    runId,
    targetMachineId,
    actorId: user.sub,
    actorRole: user.role
  });

  return successResponse(result);
});
