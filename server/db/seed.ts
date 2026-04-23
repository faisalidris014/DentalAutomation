import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { hash } from 'bcryptjs';
import * as schema from './schema';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle({ client: pool, schema });
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'DentalFlow2026!';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const passwordHash = await hash(password, rounds);

  console.log('Seeding database...');

  // ─── Clinic ─────────────────────────────────────────────
  const [clinic] = await db.insert(schema.clinics).values({
    name: 'Bright Smiles Dental',
    address: '1234 Oak Valley Dr, Suite 200',
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    phone: '5124567890',
    npi: '1234567890',
    pmsType: 'opendental',
    pmsConfig: {
      api_mode: 'remote',
      base_url: 'https://api.opendental.com/api/v1',
      developer_key: 'placeholder',
      customer_key: 'placeholder',
      econnector_url: null,
      api_tier: 'standard',
      last_sync_at: null,
      sync_interval_minutes: 60,
    },
    status: 'active',
    timezone: 'America/Chicago',
  }).returning();

  console.log(`  Created clinic: ${clinic.name} (${clinic.id})`);

  // ─── Users ──────────────────────────────────────────────
  const usersData = [
    { email: 'marcus@niftybyte.io', firstName: 'Marcus', lastName: 'Chen', role: 'it_admin', clinicId: null },
    { email: 'sarah@brightsmiles.com', firstName: 'Sarah', lastName: 'Mitchell', role: 'staff_admin', clinicId: clinic.id },
    { email: 'jessica@brightsmiles.com', firstName: 'Jessica', lastName: 'Torres', role: 'staff_user', clinicId: clinic.id },
  ];

  const createdUsers = await db.insert(schema.users).values(
    usersData.map((u) => ({
      ...u,
      passwordHash,
    }))
  ).returning();

  for (const u of createdUsers) {
    console.log(`  Created user: ${u.firstName} ${u.lastName} (${u.role})`);
  }

  // ─── Patients ───────────────────────────────────────────
  const patientsData = [
    { pmsPatientId: '1001', firstName: 'Emily', lastName: 'Hartwell', dateOfBirth: '1988-03-15', gender: 'F', phoneCell: '5125551001', email: 'emily.h@email.com', balance: '125.00', status: 'active' },
    { pmsPatientId: '1002', firstName: 'James', lastName: 'Rodriguez', dateOfBirth: '1975-09-22', gender: 'M', phoneCell: '5125551002', email: 'james.r@email.com', balance: '0.00', status: 'active' },
    { pmsPatientId: '1003', firstName: 'Sarah', lastName: 'Chen', dateOfBirth: '1992-07-04', gender: 'F', phoneCell: '5125551003', email: 'sarah.c@email.com', balance: '45.50', status: 'active' },
    { pmsPatientId: '1004', firstName: 'Michael', lastName: 'Thompson', dateOfBirth: '1965-12-01', gender: 'M', phoneCell: '5125551004', email: 'michael.t@email.com', balance: '230.00', status: 'active' },
    { pmsPatientId: '1005', firstName: 'Lisa', lastName: 'Patel', dateOfBirth: '1998-05-18', gender: 'F', phoneCell: '5125551005', email: 'lisa.p@email.com', balance: '0.00', status: 'active' },
    { pmsPatientId: '1006', firstName: 'Robert', lastName: 'Kim', dateOfBirth: '1982-11-30', gender: 'M', phoneCell: '5125551006', email: 'robert.k@email.com', balance: '75.00', status: 'active' },
    { pmsPatientId: '1007', firstName: 'Amanda', lastName: 'Foster', dateOfBirth: '1970-02-14', gender: 'F', phoneCell: '5125551007', email: 'amanda.f@email.com', balance: '0.00', status: 'active' },
    { pmsPatientId: '1008', firstName: 'David', lastName: 'Martinez', dateOfBirth: '1955-08-25', gender: 'M', phoneCell: '5125551008', email: 'david.m@email.com', balance: '340.00', status: 'active' },
    { pmsPatientId: '1009', firstName: 'Jennifer', lastName: 'Nguyen', dateOfBirth: '2001-01-10', gender: 'F', phoneCell: '5125551009', email: 'jennifer.n@email.com', balance: '0.00', status: 'active' },
    { pmsPatientId: '1010', firstName: 'William', lastName: 'Brown', dateOfBirth: '1978-06-20', gender: 'M', phoneCell: '5125551010', email: 'william.b@email.com', balance: '160.00', status: 'active' },
  ];

  const createdPatients = await db.insert(schema.patientsCache).values(
    patientsData.map((p) => ({
      ...p,
      clinicId: clinic.id,
      lastSyncedAt: new Date(),
    }))
  ).returning();

  console.log(`  Created ${createdPatients.length} patients`);

  // ─── Insurance Records ──────────────────────────────────
  const insuranceData = [
    { patientIdx: 0, carrierName: 'Delta Dental', subscriberId: 'DD-88031501', groupNumber: 'GRP-4521', planType: 'ppo' },
    { patientIdx: 1, carrierName: 'MetLife', subscriberId: 'ML-75092201', groupNumber: 'GRP-7832', planType: 'ppo' },
    { patientIdx: 2, carrierName: 'Cigna', subscriberId: 'CG-92070401', groupNumber: 'GRP-1156', planType: 'ppo' },
    { patientIdx: 3, carrierName: 'Delta Dental', subscriberId: 'DD-65120101', groupNumber: 'GRP-4521', planType: 'ppo' },
    { patientIdx: 4, carrierName: 'MetLife', subscriberId: 'ML-98051801', groupNumber: 'GRP-3290', planType: 'hmo' },
    { patientIdx: 5, carrierName: 'Cigna', subscriberId: 'CG-82113001', groupNumber: 'GRP-1156', planType: 'ppo' },
    { patientIdx: 6, carrierName: 'Delta Dental', subscriberId: 'DD-70021401', groupNumber: 'GRP-8901', planType: 'ppo' },
    { patientIdx: 7, carrierName: 'MetLife', subscriberId: 'ML-55082501', groupNumber: 'GRP-7832', planType: 'ppo' },
  ];

  const insuranceRecords = await db.insert(schema.insuranceCache).values(
    insuranceData.map((ins) => ({
      patientId: createdPatients[ins.patientIdx].id,
      clinicId: clinic.id,
      ordinal: 1,
      carrierName: ins.carrierName,
      subscriberId: ins.subscriberId,
      groupNumber: ins.groupNumber,
      planType: ins.planType,
      verificationStatus: 'stale',
      lastSyncedAt: new Date(),
    }))
  ).returning();

  console.log(`  Created ${insuranceRecords.length} insurance records`);

  // ─── Payer Configs ──────────────────────────────────────
  await db.insert(schema.payerConfigs).values([
    {
      clinicId: clinic.id,
      payerName: 'Delta Dental',
      payerType: 'commercial',
      adapterKey: 'clearinghouse.dentalxchange',
      isEnabled: true,
      autoVerify: true,
      featuresEnabled: { eligibility: true, eob: true, claims: false },
      healthStatus: 'healthy',
    },
    {
      clinicId: clinic.id,
      payerName: 'MetLife',
      payerType: 'commercial',
      adapterKey: 'clearinghouse.dentalxchange',
      isEnabled: true,
      autoVerify: true,
      featuresEnabled: { eligibility: true, eob: true, claims: false },
      healthStatus: 'healthy',
    },
    {
      clinicId: clinic.id,
      payerName: 'Cigna',
      payerType: 'commercial',
      adapterKey: 'clearinghouse.dentalxchange',
      isEnabled: true,
      autoVerify: true,
      featuresEnabled: { eligibility: true, eob: true, claims: false },
      healthStatus: 'healthy',
    },
  ]);

  console.log('  Created 3 payer configs (Delta Dental, MetLife, Cigna)');

  // ─── Default Settings ───────────────────────────────────
  await db.insert(schema.settings).values([
    { clinicId: clinic.id, category: 'eligibility', key: 'batch_time', value: '22:00' },
    { clinicId: clinic.id, category: 'eligibility', key: 'verification_threshold_days', value: 30 },
    { clinicId: clinic.id, category: 'eligibility', key: 'lookahead_days', value: 3 },
    { clinicId: clinic.id, category: 'eob', key: 'auto_post_threshold', value: 250 },
    { clinicId: clinic.id, category: 'eob', key: 'post_frequency', value: 'weekly' },
    { clinicId: clinic.id, category: 'recalls', key: 'reminder_intervals', value: [7, 14, 30] },
    { clinicId: null, category: 'system', key: 'feature_flags', value: { eob_enabled: true, claims_enabled: false } },
  ]);

  console.log('  Created default settings');

  // ─── Sample Notifications ───────────────────────────────
  await db.insert(schema.notifications).values([
    {
      clinicId: clinic.id,
      type: 'system_alert',
      severity: 'info',
      title: 'Welcome to DentalFlow',
      message: 'Your clinic has been set up successfully. Configure your payer settings to get started.',
      targetRoles: ['it_admin', 'staff_admin'],
    },
    {
      clinicId: clinic.id,
      type: 'eligibility_failed',
      severity: 'warning',
      title: 'Eligibility verification pending',
      message: '8 patients have unverified insurance for upcoming appointments.',
      targetRoles: ['staff_admin', 'staff_user'],
    },
  ]);

  console.log('  Created sample notifications');

  console.log('\nSeed complete!');
  console.log(`\nLogin credentials:`);
  console.log(`  IT Admin:    marcus@niftybyte.io / ${password}`);
  console.log(`  Staff Admin: sarah@brightsmiles.com / ${password}`);
  console.log(`  Staff User:  jessica@brightsmiles.com / ${password}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
