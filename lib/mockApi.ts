import type {
  Patient, Appointment, Recall, Claim, EOB, Job,
  Notification, Payer, AgentStatus, EligibilityResult, EligibilityCheck,
  Clinic, User
} from '@/types';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min = 300, max = 800): Promise<void> {
  return delay(min + Math.random() * (max - min));
}

async function loadJson<T>(path: string): Promise<T> {
  const mod = await import(`@/data/mock/${path}`);
  return mod.default as T;
}

// --- Clinics ---
export async function getClinics(): Promise<Clinic[]> {
  await randomDelay();
  return loadJson<Clinic[]>('clinics.json');
}

export async function getClinic(id: string): Promise<Clinic | undefined> {
  const clinics = await getClinics();
  return clinics.find(c => c.id === id);
}

// --- Users ---
export async function getUsers(): Promise<User[]> {
  await randomDelay();
  return loadJson<User[]>('users.json');
}

// --- Patients ---
export async function getPatients(clinicId?: string): Promise<Patient[]> {
  await randomDelay();
  const patients = await loadJson<Patient[]>('patients.json');
  if (clinicId) return patients.filter(p => p.clinicId === clinicId);
  return patients;
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const patients = await loadJson<Patient[]>('patients.json');
  return patients.find(p => p.id === id);
}

export async function searchPatients(query: string, clinicId?: string): Promise<Patient[]> {
  await randomDelay(200, 500);
  const patients = await getPatients(clinicId);
  const q = query.toLowerCase();
  return patients.filter(
    p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
  );
}

// --- Appointments ---
export async function getAppointments(clinicId?: string): Promise<Appointment[]> {
  await randomDelay();
  const appts = await loadJson<Appointment[]>('appointments.json');
  if (clinicId) return appts.filter(a => a.clinicId === clinicId);
  return appts;
}

// --- Recalls ---
export async function getRecalls(clinicId?: string): Promise<Recall[]> {
  await randomDelay();
  const recalls = await loadJson<Recall[]>('recalls.json');
  if (clinicId) return recalls.filter(r => r.clinicId === clinicId);
  return recalls;
}

export async function sendRecallReminder(recallId: string): Promise<{ success: boolean }> {
  await delay(1500);
  return { success: true };
}

// --- Claims ---
export async function getClaims(clinicId?: string): Promise<Claim[]> {
  await randomDelay();
  const claims = await loadJson<Claim[]>('claims.json');
  if (clinicId) return claims.filter(c => c.clinicId === clinicId);
  return claims;
}

export async function getClaim(id: string): Promise<Claim | undefined> {
  const claims = await loadJson<Claim[]>('claims.json');
  return claims.find(c => c.id === id);
}

export async function submitClaim(): Promise<{ success: boolean; referenceNumber: string }> {
  await delay(3000);
  return {
    success: true,
    referenceNumber: `CLM-${Date.now().toString(36).toUpperCase()}`,
  };
}

// --- EOBs ---
export async function getEOBs(clinicId?: string): Promise<EOB[]> {
  await randomDelay();
  const eobs = await loadJson<EOB[]>('eobs.json');
  if (clinicId) return eobs.filter(e => e.clinicId === clinicId);
  return eobs;
}

export async function getEOB(id: string): Promise<EOB | undefined> {
  const eobs = await loadJson<EOB[]>('eobs.json');
  return eobs.find(e => e.id === id);
}

// --- Jobs ---
export async function getJobs(clinicId?: string): Promise<Job[]> {
  await randomDelay();
  const jobs = await loadJson<Job[]>('jobs.json');
  if (clinicId) return jobs.filter(j => j.clinicId === clinicId);
  return jobs;
}

export async function getJob(id: string): Promise<Job | undefined> {
  const jobs = await loadJson<Job[]>('jobs.json');
  return jobs.find(j => j.id === id);
}

// --- Notifications ---
export async function getNotifications(clinicId?: string): Promise<Notification[]> {
  await randomDelay(200, 400);
  const notifs = await loadJson<Notification[]>('notifications.json');
  if (clinicId) return notifs.filter(n => n.clinicId === clinicId);
  return notifs;
}

// --- Payers ---
export async function getPayers(): Promise<Payer[]> {
  await randomDelay(200, 400);
  return loadJson<Payer[]>('payers.json');
}

// --- Agents ---
export async function getAgents(): Promise<AgentStatus[]> {
  await randomDelay();
  return loadJson<AgentStatus[]>('agents.json');
}

export async function getAgent(id: string): Promise<AgentStatus | undefined> {
  const agents = await loadJson<AgentStatus[]>('agents.json');
  return agents.find(a => a.id === id);
}

// --- Eligibility ---
export async function runEligibilityCheck(patientId: string): Promise<EligibilityResult> {
  await delay(3000); // Simulate 3-second check
  const patients = await loadJson<Patient[]>('patients.json');
  const patient = patients.find(p => p.id === patientId);
  const ins = patient?.primaryInsurance;

  return {
    patientId,
    payerName: ins?.carrierName || 'Unknown',
    checkedAt: new Date().toISOString(),
    status: 'active',
    effectiveDate: ins?.effectiveDate || '2025-01-01',
    planName: ins?.planName || 'Standard Plan',
    planType: ins?.planType || 'PPO',
    deductibleIndividual: 50,
    deductibleUsed: 50,
    deductibleRemaining: 0,
    annualMaximum: 2000,
    annualMaxUsed: 847,
    annualMaxRemaining: 1153,
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthodonticCoverage: 0,
    copayPreventive: 0,
    copayBasic: 20,
    copayMajor: 50,
    waitingPeriods: {
      basic: 'None',
      major: '6 months (met)',
      orthodontic: '12 months',
    },
    inNetwork: true,
  };
}

export async function getEligibilityHistory(patientId: string): Promise<EligibilityCheck[]> {
  await randomDelay();
  // Return mock history
  return [
    {
      id: 'elig_h1',
      patientId,
      patientName: 'Patient',
      payerName: 'Delta Dental',
      checkedAt: '2026-03-15T10:30:00Z',
      status: 'active',
      result: {} as EligibilityResult,
    },
    {
      id: 'elig_h2',
      patientId,
      patientName: 'Patient',
      payerName: 'Delta Dental',
      checkedAt: '2026-01-08T14:15:00Z',
      status: 'active',
      result: {} as EligibilityResult,
    },
  ];
}
