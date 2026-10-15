import { Db, ObjectId } from 'mongodb';

export class OrderCustomerEnrichmentService {
    /**
     * Resolves the best customer name, phone, and email from an order object,
     * inspecting contactDetails, user document, or other existing order metadata.
     */
    public static extractCustomerInfo(order: any, userDoc?: any): {
        customerName: string;
        customerPhone: string;
        customerEmail: string;
    } {
        const contactDetails = order?.contactDetails || {};
        const contactName = `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim()
            || contactDetails.name
            || contactDetails.fullName
            || '';

        const userName = userDoc?.full_name || userDoc?.name || userDoc?.fullName || '';

        // Avoid generic placeholders like 'Valued Customer' or 'Customer'
        let customerName = '';
        if (order?.customer_name && order.customer_name !== 'Valued Customer' && order.customer_name !== 'Customer') {
            customerName = order.customer_name;
        } else if (order?.customerName && order.customerName !== 'Valued Customer' && order.customerName !== 'Customer') {
            customerName = order.customerName;
        } else if (contactName) {
            customerName = contactName;
        } else if (userName) {
            customerName = userName;
        } else if (order?.customer?.full_name || order?.customer?.name) {
            customerName = order.customer.full_name || order.customer.name;
        } else if (order?.user?.full_name || order?.user?.name) {
            customerName = order.user.full_name || order.user.name;
        } else if (order?.user_name && order.user_name !== 'Customer') {
            customerName = order.user_name;
        } else if (order?.userName && order.userName !== 'Customer') {
            customerName = order.userName;
        } else if (order?.customerEmail || order?.email || contactDetails.email) {
            const em = order?.customerEmail || order?.email || contactDetails.email;
            customerName = em.split('@')[0];
        } else {
            customerName = 'Customer';
        }

        const customerPhone = order?.customer_phone
            || order?.customerPhone
            || contactDetails.phone
            || userDoc?.phone
            || order?.phone
            || order?.customer?.phone
            || '';

        const customerEmail = order?.customer_email
            || order?.customerEmail
            || contactDetails.email
            || userDoc?.email
            || order?.email
            || order?.customer?.email
            || '';

        return {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim()
        };
    }

    /**
     * Enriches a single order with canonical customerName, customer_name, customerPhone, customer_phone, etc.
     */
    public static async enrichOrder(order: any, db: Db): Promise<any> {
        if (!order) return order;
        const res = await this.enrichOrders([order], db);
        return res[0];
    }

    /**
     * Batch enriches a list of orders with customerName, customer_name, customerPhone, customer_phone, customerEmail, customer_email.
     */
    public static async enrichOrders(orders: any[], db: Db): Promise<any[]> {
        if (!orders || orders.length === 0) return orders || [];

        // Identify orders that need user lookup from the database
        const lookupIds = new Set<string>();
        const lookupEmails = new Set<string>();

        orders.forEach(o => {
            const hasExplicitValidName = (o.customer_name && o.customer_name !== 'Valued Customer' && o.customer_name !== 'Customer')
                || (o.customerName && o.customerName !== 'Valued Customer' && o.customerName !== 'Customer');
            const contactName = o.contactDetails ? `${o.contactDetails.firstName || ''} ${o.contactDetails.lastName || ''}`.trim() : '';

            // If we don't have a reliable customer name yet, query user
            if (!hasExplicitValidName && !contactName) {
                const uId = o.customer_id || o.customerId || o.userId || o.user_id;
                if (uId) lookupIds.add(String(uId));
                const email = o.customerEmail || o.email || o.contactDetails?.email;
                if (email) lookupEmails.add(email.toLowerCase().trim());
            }
        });

        const userMap = new Map<string, any>();
        if (lookupIds.size > 0 || lookupEmails.size > 0) {
            const orQueries: any[] = [];
            lookupIds.forEach(id => {
                orQueries.push({ _id: id });
                orQueries.push({ id });
                orQueries.push({ customerId: id });
                orQueries.push({ publicId: id });
                orQueries.push({ auth0UserId: id });
                orQueries.push({ auth0_sub: id });
                if (ObjectId.isValid(id)) {
                    orQueries.push({ _id: new ObjectId(id) });
                }
            });
            lookupEmails.forEach(em => {
                orQueries.push({ email: em });
            });

            if (orQueries.length > 0) {
                const users = await db.collection('users').find({ $or: orQueries }).toArray();
                users.forEach(u => {
                    const keys = [
                        String(u._id),
                        u.id,
                        u.customerId,
                        u.publicId,
                        u.auth0UserId,
                        u.auth0_sub,
                        u.email ? u.email.toLowerCase().trim() : null
                    ].filter(Boolean);
                    keys.forEach(k => userMap.set(String(k), u));
                });
            }
        }

        // Apply enrichment to every order
        orders.forEach(o => {
            const uId = o.customer_id || o.customerId || o.userId || o.user_id;
            const email = o.customerEmail || o.email || o.contactDetails?.email;
            const userDoc = (uId ? userMap.get(String(uId)) : null) || (email ? userMap.get(email.toLowerCase().trim()) : null);

            const { customerName, customerPhone, customerEmail } = this.extractCustomerInfo(o, userDoc);

            o.customerName = customerName;
            o.customer_name = customerName;
            if (customerPhone) {
                o.customerPhone = customerPhone;
                o.customer_phone = customerPhone;
            }
            if (customerEmail) {
                o.customerEmail = customerEmail;
                o.customer_email = customerEmail;
            }
            if (!o.customer_id && (o.customerId || o.userId || o.user_id)) {
                o.customer_id = o.customerId || o.userId || o.user_id;
            }
            if (!o.customerId && o.customer_id) {
                o.customerId = o.customer_id;
            }
        });

        return orders;
    }
}
