import { getDb } from '@/lib/mongodb';
import { BadRequestError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import { generateSupportTicketId, buildEntityLookupQuery } from '@laundelle/ids';

export class SupportService {
    static async createTicket(userId: string, ticket: any): Promise<{ ticketId: string }> {
        if (!userId) {
            throw new BadRequestError('User ID is required');
        }
        if (!ticket?.issueType || !ticket?.description) {
            throw new BadRequestError('Issue type and description are required');
        }

        const db = await getDb();
        const ticketId = generateSupportTicketId();
        const now = new Date().toISOString();

        const newTicket = {
            ...ticket,
            id: ticketId,
            publicId: ticketId,
            customerId: userId,
            userId,
            status: 'Open',
            created_at: now,
            updated_at: now,
            timeline_events: [{
                event: 'ticket_created',
                label: 'Support Ticket Submitted',
                actor: 'customer',
                actorId: userId,
                timestamp: now
            }]
        };

        await db.collection('tickets').insertOne(newTicket);

        // Link to order timeline if provided
        if (ticket.orderId) {
            await db.collection('orders').updateOne(
                { id: ticket.orderId },
                {
                    $push: {
                        timeline_events: {
                            event: 'support_ticket_raised',
                            label: `Support Ticket Raised: ${ticket.issueType}`,
                            ticketId,
                            actor: 'customer',
                            actorId: userId,
                            timestamp: now
                        }
                    } as any
                }
            );

            await AuditService.recordOrderEvent({
                orderId: ticket.orderId,
                action: 'support_ticket_raised',
                actorId: userId,
                actorRole: 'customer',
                reason: `Support ticket submitted: ${ticket.issueType}`,
                metadata: { ticketId, issueType: ticket.issueType }
            });
        }

        return { ticketId };
    }

    static async getTickets(userId?: string, userRole?: string): Promise<any[]> {
        const db = await getDb();
        const query: any = {};
        if (userRole !== 'admin' && userRole !== 'manager' && userId) {
            query.userId = userId;
        }
        const tickets = await db.collection('tickets').find(query).sort({ created_at: -1 }).toArray();
        return tickets;
    }

    static async resolveTicket(ticketId: string, actorId: string, resolutionNotes?: string): Promise<{ success: boolean }> {
        const db = await getDb();
        const now = new Date().toISOString();
        const result = await db.collection('tickets').updateOne(
            buildEntityLookupQuery(ticketId, 'ticket'),
            {
                $set: {
                    status: 'Resolved',
                    resolved_at: now,
                    updated_at: now,
                    resolutionNotes: resolutionNotes || 'Resolved by support team'
                },
                $push: {
                    timeline_events: {
                        event: 'ticket_resolved',
                        label: 'Support Ticket Resolved',
                        actor: 'staff',
                        actorId,
                        timestamp: now
                    }
                } as any
            }
        );
        return { success: result.modifiedCount > 0 };
    }
}
