import { getDb } from '@/lib/mongodb';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import { extractOutwardCode } from '@laundelle/utils';
import { generateServiceId, generateBookingSlotId } from '@laundelle/ids';
export { extractOutwardCode };


// Reusable logic from the existing file for checking postcodes
export function derivePostcodeSector(postcode: string) {
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9])([A-Z]{2})$/);
    if (!match) return null;
    return { district: match[1], sector: match[2] };
}

export class PlatformService {
    // ----------------------------------------------------------------------
    // SERVICES
    // ----------------------------------------------------------------------
    static async getPublicServices() {
        const db = await getDb();
        return db.collection('services').find({ enabled: true }).toArray();
    }

    static async getAdminServices() {
        const db = await getDb();
        return db.collection('services').find({}).toArray(); // assuming we need all for admin. The legacy didn't have adminFetchServices but I'll return public. Wait, let's just return all.
    }

    static async createService(adminId: string, data: any) {
        const db = await getDb();
        const now = new Date().toISOString();

        // Whitelist fields
        const { name, description, price, category, enabled, icon, basePrice } = data;
        if (!name) throw new BadRequestError('Service name is required.');

        const serviceId = generateServiceId();
        const newService = {
            id: serviceId,
            publicId: serviceId,
            serviceId,
            name,
            description: description || '',
            price: price || 0,
            basePrice: basePrice || price || 0,
            category: category || 'General',
            enabled: enabled !== false, // default true
            icon: icon || '',
            created_at: now,
            createdBy: adminId
        };

        await db.collection('services').insertOne(newService);

        await AuditService.recordEvent({
            entityType: 'service',
            entityId: newService.id,
            action: 'service_created',
            actorId: adminId,
            actorRole: 'admin'
        });

        return newService;
    }

    static async updateService(adminId: string, serviceId: string, updates: any) {
        const db = await getDb();
        const now = new Date().toISOString();

        // Whitelist fields
        const safeUpdates: any = { updated_at: now, updatedBy: adminId };
        if (updates.name !== undefined) safeUpdates.name = updates.name;
        if (updates.description !== undefined) safeUpdates.description = updates.description;
        if (updates.price !== undefined) safeUpdates.price = updates.price;
        if (updates.basePrice !== undefined) safeUpdates.basePrice = updates.basePrice;
        if (updates.category !== undefined) safeUpdates.category = updates.category;
        if (updates.enabled !== undefined) safeUpdates.enabled = updates.enabled;
        if (updates.icon !== undefined) safeUpdates.icon = updates.icon;

        const result = await db.collection('services').updateOne(
            { id: serviceId },
            { $set: safeUpdates }
        );

        if (result.matchedCount === 0) throw new NotFoundError('Service not found.');

        await AuditService.recordEvent({
            entityType: 'service',
            entityId: serviceId,
            action: 'service_updated',
            actorId: adminId,
            actorRole: 'admin',
            metadata: { updates: safeUpdates }
        });

        return { success: true };
    }

    // ----------------------------------------------------------------------
    // SLOTS
    // ----------------------------------------------------------------------
    static async getPublicSlots(filter?: { postcode?: string; plant_id?: string }) {
        const db = await getDb();
        const query: any = { isActive: { $ne: false } };

        if (filter?.plant_id) {
            query.$or = [
                { plant_id: String(filter.plant_id) },
                { plant_id: filter.plant_id as any }
            ];
            return db.collection('booking_slots').find(query).toArray();
        }

        if (filter?.postcode) {
            // Locate plant for this postcode
            const postcodeCheck = await this.checkPostcode(filter.postcode);
            if (postcodeCheck.isServiceable && postcodeCheck.plantId) {
                const plantSlots = await db.collection('booking_slots').find({
                    isActive: { $ne: false },
                    $or: [
                        { plant_id: String(postcodeCheck.plantId) },
                        { plant_id: postcodeCheck.plantId as any },
                        { plant_code: postcodeCheck.plantCode }
                    ]
                }).toArray();

                return plantSlots;
            }
            return [];
        }

        return db.collection('booking_slots').find(query).toArray();
    }

    static async getAdminSlots(actorId?: string) {
        const db = await getDb();
        if (actorId) {
            const user = await db.collection('users').findOne({ _id: actorId as any });
            if (user?.role === 'manager') {
                const plantId = user.plant_id;
                if (plantId) {
                    return db.collection('booking_slots').find({
                        $or: [
                            { plant_id: String(plantId) },
                            { plant_id: plantId as any }
                        ]
                    }).toArray();
                }
            }
        }
        return db.collection('booking_slots').find({}).toArray();
    }

    static async createSlot(actorId: string, data: any) {
        const db = await getDb();
        const now = new Date().toISOString();

        const user = await db.collection('users').findOne({ _id: actorId as any });
        let plantId = data.plant_id || user?.plant_id || null;
        let plantName = data.plant_name || '';
        let plantCode = data.plant_code || '';

        // If plantId not set, check if user is manager of a plant
        if (!plantId && user?._id) {
            const plant = await db.collection('plants').findOne({ manager_id: user._id } as any);
            if (plant) {
                plantId = plant._id;
                plantName = plant.name;
                plantCode = plant.code;
            }
        } else if (plantId && (!plantName || !plantCode)) {
            const plant = await db.collection('plants').findOne({
                $or: [{ _id: plantId as any }, { id: plantId }]
            } as any);
            if (plant) {
                plantName = plant.name;
                plantCode = plant.code;
            }
        }

        const { date, startTime, endTime, capacity, isActive, slotType, daysOfWeek } = data;
        if (!startTime || !endTime) throw new BadRequestError('Start time and end time are required.');

        const slotInterval = data.slot || `${startTime} - ${endTime}`;
        const slotId = generateBookingSlotId();

        const newSlot = {
            id: slotId,
            publicId: slotId,
            slotId,
            slot: slotInterval,
            date: date || null,
            startTime,
            endTime,
            capacity: Number(capacity) || 15,
            maxCapacity: Number(capacity) || 15,
            slotType: slotType || 'both',
            type: slotType || 'both',
            daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : ['all'],
            isActive: isActive !== false,
            plant_id: plantId ? String(plantId) : null,
            plant_name: plantName,
            plant_code: plantCode,
            created_at: now,
            createdBy: actorId,
            createdByName: user?.full_name || 'Manager'
        };

        await db.collection('booking_slots').insertOne(newSlot);

        await AuditService.recordEvent({
            entityType: 'slot',
            entityId: newSlot.id,
            action: 'slot_created',
            actorId,
            actorRole: 'staff',
            metadata: { plant_id: newSlot.plant_id }
        });

        return newSlot;
    }

    static async updateSlot(actorId: string, slotId: string, updates: any) {
        const db = await getDb();
        const now = new Date().toISOString();

        // Whitelist fields
        const safeUpdates: any = { updated_at: now, updatedBy: actorId };
        if (updates.date !== undefined) safeUpdates.date = updates.date;
        if (updates.startTime !== undefined) safeUpdates.startTime = updates.startTime;
        if (updates.endTime !== undefined) safeUpdates.endTime = updates.endTime;
        if (updates.startTime && updates.endTime) safeUpdates.slot = `${updates.startTime} - ${updates.endTime}`;
        if (updates.capacity !== undefined) {
            safeUpdates.capacity = Number(updates.capacity);
            safeUpdates.maxCapacity = Number(updates.capacity);
        }
        if (updates.isActive !== undefined) safeUpdates.isActive = updates.isActive;
        if (updates.slotType !== undefined) {
            safeUpdates.slotType = updates.slotType;
            safeUpdates.type = updates.slotType;
        }

        const result = await db.collection('booking_slots').updateOne(
            { $or: [{ id: slotId }, { _id: slotId as any }] },
            { $set: safeUpdates }
        );

        if (result.matchedCount === 0) throw new NotFoundError('Slot not found.');

        await AuditService.recordEvent({
            entityType: 'slot',
            entityId: slotId,
            action: 'slot_updated',
            actorId,
            actorRole: 'staff'
        });

        return { success: true };
    }

    static async deleteSlot(actorId: string, slotId: string) {
        const db = await getDb();
        const user = await db.collection('users').findOne({ _id: actorId as any });

        const slot = await db.collection('booking_slots').findOne({
            $or: [{ id: slotId }, { _id: slotId as any }]
        });

        if (!slot) throw new NotFoundError('Slot not found.');

        // If manager, check that slot belongs to their plant
        if (user?.role === 'manager') {
            const userPlantId = user.plant_id;
            if (userPlantId && slot.plant_id && String(slot.plant_id) !== String(userPlantId)) {
                throw new BadRequestError('You can only delete slots for your assigned plant.');
            }
        }

        await db.collection('booking_slots').deleteOne({
            $or: [{ id: slotId }, { _id: slotId as any }]
        });

        await AuditService.recordEvent({
            entityType: 'slot',
            entityId: slotId,
            action: 'slot_deleted',
            actorId,
            actorRole: 'staff'
        });

        return { success: true };
    }

    // ----------------------------------------------------------------------
    // POSTCODES
    // ----------------------------------------------------------------------
    static async checkPostcode(postcode: string) {
        if (!postcode) return { isServiceable: false, location: null, services: [] };

        const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
        const parsed = derivePostcodeSector(postcode);

        const db = await getDb();

        // 1. Scan active laundry plants and their configured service_pincodes
        const activePlants = await db.collection('plants').find({ status: 'ACTIVE' }).toArray();
        let matchedPlant: any = null;

        for (const plant of activePlants) {
            const pincodes: string[] = Array.isArray(plant.service_pincodes)
                ? plant.service_pincodes
                : (plant.service_pincodes || '')
                    .split(',')
                    .map((p: string) => p.trim().toUpperCase())
                    .filter(Boolean);

            if (pincodes.length === 0) continue;

            const isMatch = pincodes.some((pin: string) => {
                const cleanPin = pin.replace(/\s+/g, '').toUpperCase();
                if (!cleanPin) return false;

                // Exact match (e.g. "PR1" === "PR1")
                if (cleaned === cleanPin) return true;

                // Cleaned entered postcode starts with the plant pincode (e.g. "PR12HE" starts with "PR1")
                if (cleaned.startsWith(cleanPin)) return true;

                // Plant pincode starts with entered prefix (e.g. user entered "PR1" and plant has "PR1")
                if (cleanPin.startsWith(cleaned)) return true;

                // Match starting 2-3 letters (e.g. "PR1" or "PR" from "PR1 2HE")
                const prefix2 = cleaned.substring(0, 2);
                const prefix3 = cleaned.substring(0, 3);
                if (cleanPin === prefix2 || cleanPin === prefix3) {
                    return true;
                }

                if (parsed?.district) {
                    const cleanDistrict = parsed.district.replace(/\s+/g, '').toUpperCase();
                    if (cleanDistrict === cleanPin || cleanDistrict.startsWith(cleanPin) || cleanPin.startsWith(cleanDistrict)) {
                        return true;
                    }
                }

                return false;
            });

            if (isMatch) {
                matchedPlant = plant;
                break;
            }
        }

        // 2. Also check postcode_sectors collection if not matched on plant yet
        let sectorMatch: any = null;
        if (!matchedPlant) {
            if (parsed) {
                sectorMatch = await db.collection('postcode_sectors').findOne({
                    district: parsed.district,
                    sector: parsed.sector,
                    is_active: true
                });
            }

            if (!sectorMatch) {
                sectorMatch = await db.collection('postcode_sectors').findOne({
                    district: cleaned,
                    is_active: true
                });
            }

            if (!sectorMatch && parsed) {
                sectorMatch = await db.collection('postcode_sectors').findOne({
                    district: parsed.district,
                    is_active: true
                });
            }

            // If sector is mapped to an active plant, link to plant
            if (sectorMatch?.plant_id) {
                matchedPlant = activePlants.find(
                    (p: any) => String(p._id) === String(sectorMatch.plant_id) || p.id === sectorMatch.plant_id
                );
            }
        }

        // Only mark serviceable if an active plant/manager facility covers it
        const isServiceable = !!matchedPlant;

        let services: any[] = [];
        if (isServiceable) {
            services = await db.collection('services').find({ enabled: true }).toArray();
        }

        // Lookup manager details if plant is matched
        let managerName: string | null = null;
        if (matchedPlant?.manager_id) {
            const manager = await db.collection('users').findOne({ _id: matchedPlant.manager_id as any });
            if (manager) {
                managerName = manager.full_name || manager.name || null;
            }
        }

        const locationName = matchedPlant
            ? `${matchedPlant.name} (${matchedPlant.code})`
            : (sectorMatch?.location || (sectorMatch ? `${sectorMatch.city || sectorMatch.district}` : null));

        return {
            isServiceable,
            location: locationName,
            city: matchedPlant?.address || sectorMatch?.city || null,
            district: matchedPlant?.code || sectorMatch?.district || parsed?.district || null,
            plantId: matchedPlant ? String(matchedPlant._id) : (sectorMatch?.plant_id ? String(sectorMatch.plant_id) : null),
            plantCode: matchedPlant?.code || null,
            plantName: matchedPlant?.name || null,
            managerId: matchedPlant?.manager_id || null,
            managerName: managerName || null,
            services: services.map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                price: s.price,
                basePrice: s.basePrice,
                category: s.category,
                icon: s.icon,
                image: s.image
            }))
        };
    }

    static async getAdminPostcodes() {
        const db = await getDb();
        return db.collection('postcode_sectors').find({}).toArray();
    }

    static async updatePostcode(adminId: string, district: string, sector: string, updates: any) {
        if (!district || !sector) throw new BadRequestError('District and sector are required.');
        const db = await getDb();
        const now = new Date().toISOString();

        // Whitelist fields
        const safeUpdates: any = { updated_at: now, updatedBy: adminId };
        if (updates.is_active !== undefined) safeUpdates.is_active = updates.is_active;
        if (updates.location !== undefined) safeUpdates.location = updates.location;
        if (updates.notes !== undefined) safeUpdates.notes = updates.notes;
        
        await db.collection('postcode_sectors').updateOne(
            { district, sector },
            { $set: safeUpdates },
            { upsert: true }
        );

        await AuditService.recordEvent({
            entityType: 'postcode',
            entityId: `${district}_${sector}`,
            action: 'postcode_updated',
            actorId: adminId,
            actorRole: 'admin'
        });

        return { success: true };
    }

    // ----------------------------------------------------------------------
    // WAITLIST
    // ----------------------------------------------------------------------
    static async joinWaitlist(entry: any) {
        if (!entry?.email || !entry?.postcode) {
            throw new BadRequestError('Email and postcode are required.');
        }

        const email = entry.email.toLowerCase().trim();
        const postcode = entry.postcode.toUpperCase().trim();

        const db = await getDb();
        const existing = await db.collection('service_area_waitlist').findOne({ email, postcode });
        
        if (existing) {
            return { success: true, alreadyRegistered: true };
        }

        // Whitelist fields
        const newEntry = {
            email,
            postcode,
            full_name: entry.full_name || '',
            phone: entry.phone || '',
            requested_service_id: entry.requested_service_id || '',
            launch_notification_consent: entry.launch_notification_consent === true,
            status: 'waiting',
            created_at: new Date().toISOString()
        };

        await db.collection('service_area_waitlist').insertOne(newEntry);
        return { success: true, alreadyRegistered: false };
    }

    static async getAdminWaitlist() {
        const db = await getDb();
        return db.collection('service_area_waitlist').find({}).toArray();
    }

    // ----------------------------------------------------------------------
    // POSTCODE DISTRICT SEARCH
    // ----------------------------------------------------------------------
    static async searchPostcodeDistricts(query: string): Promise<string[]> {
        const rawQ = (query || '').trim().toUpperCase();
        if (!rawQ) return [];

        // If input contains a full postcode (e.g. "PR1 1AB" or "CF611ZB"), return its outward code directly
        const extracted = extractOutwardCode(rawQ);
        if (extracted !== rawQ && extracted.length >= 2) {
            return [extracted];
        }

        const cleanQ = rawQ.replace(/\s+/g, '');
        const districts = new Set<string>();

        const promises: Promise<any>[] = [];

        // 1. Exact outcode lookup for cleanQ
        promises.push(
            fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(cleanQ)}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );

        // 2. Outcode lookup for cleanQ + 0..9
        for (let i = 0; i <= 9; i++) {
            promises.push(
                fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(cleanQ + i)}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            );
        }

        // 3. Autocomplete lookup
        promises.push(
            fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanQ)}/autocomplete`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );

        // 4. DB postcode_sectors lookup
        try {
            const db = await getDb();
            const dbSectors = await db.collection('postcode_sectors')
                .find({ district: { $regex: `^${cleanQ}`, $options: 'i' } })
                .limit(20)
                .toArray();
            dbSectors.forEach((s: any) => {
                if (s.district) districts.add(s.district.toUpperCase());
            });
        } catch {
            // ignore DB error
        }

        const responses = await Promise.all(promises);

        responses.forEach(res => {
            if (!res) return;
            if (res.result && res.result.outcode) {
                const code = res.result.outcode.toUpperCase();
                if (code.startsWith(cleanQ)) {
                    districts.add(code);
                }
            }
            if (Array.isArray(res.result)) {
                res.result.forEach((fullPc: string) => {
                    const out = extractOutwardCode(fullPc);
                    if (out && out.startsWith(cleanQ)) {
                        districts.add(out);
                    }
                });
            }
        });

        // 5. If cleanQ itself matches valid outward code format regex (e.g. PR1, M1, BD2, CF61)
        if (/^[A-Z]{1,2}[0-9][A-Z0-9]?$/i.test(cleanQ)) {
            districts.add(cleanQ);
        }

        return Array.from(districts).sort((a, b) => {
            if (a === cleanQ) return -1;
            if (b === cleanQ) return 1;
            if (a.length !== b.length) return a.length - b.length;
            return a.localeCompare(b);
        });
    }
}


