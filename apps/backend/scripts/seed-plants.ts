import { getDb } from '../src/lib/mongodb';

async function seedPlants() {
  console.log('=== Seeding Operational Plants & Linking Managers ===');
  const db = await getDb();
  const now = new Date().toISOString();

  // 1. Ensure Preston Central Processing Plant exists
  const prestonPlantId = 'plant_preston_central';
  let prestonPlant = await db.collection('plants').findOne({
    $or: [{ _id: prestonPlantId as any }, { id: prestonPlantId }, { code: 'PST-01' }]
  });

  if (!prestonPlant) {
    prestonPlant = {
      _id: prestonPlantId as any,
      id: prestonPlantId,
      name: 'Preston Central Processing Plant',
      code: 'PST-01',
      address: 'Unit 4, Laundelle Industrial Estate, Preston PR1 1AA',
      phone: '+44 1772 900010',
      email: 'plant.preston@laundelle.co.uk',
      service_pincodes: ['PR1', 'PR2', 'PR3', 'PR4', 'PR5'],
      status: 'active',
      capacity_kg_per_day: 2500,
      created_at: now,
      updated_at: now,
    };
    await db.collection('plants').insertOne(prestonPlant);
    console.log('✓ Created Preston Central Processing Plant');
  } else {
    console.log('✓ Preston Central Processing Plant already exists');
  }

  // 2. Ensure Manchester Processing Facility exists
  const manchesterPlantId = 'plant_manchester_central';
  let manchesterPlant = await db.collection('plants').findOne({
    $or: [{ _id: manchesterPlantId as any }, { id: manchesterPlantId }, { code: 'MCR-01' }]
  });

  if (!manchesterPlant) {
    manchesterPlant = {
      _id: manchesterPlantId as any,
      id: manchesterPlantId,
      name: 'Manchester Regional Processing Plant',
      code: 'MCR-01',
      address: 'Bay 2, Salford Logistics Hub, Manchester M5 3EQ',
      phone: '+44 161 900020',
      email: 'plant.manchester@laundelle.co.uk',
      service_pincodes: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
      status: 'active',
      capacity_kg_per_day: 3500,
      created_at: now,
      updated_at: now,
    };
    await db.collection('plants').insertOne(manchesterPlant);
    console.log('✓ Created Manchester Regional Processing Plant');
  } else {
    console.log('✓ Manchester Regional Processing Plant already exists');
  }

  // 3. Link all managers in MongoDB to Preston Central Plant
  const managers = await db.collection('users').find({
    role: { $in: ['manager', 'plant_manager'] }
  }).toArray();

  console.log(`\nFound ${managers.length} manager(s) in MongoDB:`);
  for (const m of managers) {
    await db.collection('users').updateOne(
      { _id: m._id } as any,
      {
        $set: {
          plant_id: prestonPlantId,
          plantId: prestonPlantId,
          updated_at: now
        }
      }
    );
    console.log(`✓ Linked manager ${m.email} (${m._id}) to plant ${prestonPlantId}`);
  }

  // Also set manager_id on preston plant to first manager
  if (managers.length > 0) {
    await db.collection('plants').updateOne(
      { _id: prestonPlantId as any },
      { $set: { manager_id: String(managers[0]._id), updated_at: now } }
    );
    console.log(`✓ Set primary plant manager_id to ${managers[0].email} (${managers[0]._id})`);
  }

  // 4. Also link existing drivers and processors to Preston Central Plant if missing
  const staff = await db.collection('users').find({
    role: { $in: ['driver', 'processor'] }
  }).toArray();

  for (const s of staff) {
    if (!s.plant_id) {
      await db.collection('users').updateOne(
        { _id: s._id } as any,
        {
          $set: {
            plant_id: prestonPlantId,
            plantId: prestonPlantId,
            updated_at: now
          }
        }
      );
      console.log(`✓ Linked staff ${s.email} (${s.role}) to plant ${prestonPlantId}`);
    }
  }

  console.log('\n=== Plant Seeding & Linking Complete ===');
  process.exit(0);
}

seedPlants().catch(err => {
  console.error('Plant Seeding Error:', err);
  process.exit(1);
});
