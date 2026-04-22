import type {
  ODPatient,
  ODAppointment,
  ODPatPlan,
  ODInsSub,
  ODInsPlan,
  ODCarrier,
  ODInsVerify,
  ODClaim,
} from './types';
import type {
  CanonicalPatient,
  CanonicalAppointment,
  CanonicalInsurancePlan,
  CanonicalVerificationStatus,
  CanonicalClaim,
} from '../types';

function mapGender(odGender: number): CanonicalPatient['gender'] {
  switch (odGender) {
    case 0: return 'M';
    case 1: return 'F';
    default: return 'Unknown';
  }
}

function mapPatientStatus(odStatus: number): CanonicalPatient['status'] {
  switch (odStatus) {
    case 0: return 'active';
    case 2: return 'inactive';
    case 3: return 'archived';
    default: return 'inactive';
  }
}

function mapAptStatus(odStatus: number): CanonicalAppointment['status'] {
  switch (odStatus) {
    case 1: return 'scheduled';
    case 2: return 'completed';
    case 3: return 'cancelled';
    case 5: return 'broken';
    case 6: return 'scheduled';
    default: return 'scheduled';
  }
}

function mapPreferredContact(odPref: number | undefined): string | undefined {
  switch (odPref) {
    case 2: case 3: case 4: return 'phone';
    case 5: return 'email';
    case 6: return 'mail';
    default: return undefined;
  }
}

export function mapPatient(od: ODPatient): CanonicalPatient {
  return {
    pmsId: String(od.PatNum),
    firstName: od.FName,
    lastName: od.LName,
    dateOfBirth: od.Birthdate,
    gender: mapGender(od.Gender),
    phoneHome: od.HmPhone || undefined,
    phoneCell: od.WirelessPhone || undefined,
    email: od.Email || undefined,
    address: [od.Address, od.Address2].filter(Boolean).join(', ') || undefined,
    city: od.City || undefined,
    state: od.State || undefined,
    zip: od.Zip || undefined,
    guarantorPmsId: od.Guarantor ? String(od.Guarantor) : undefined,
    preferredContact: mapPreferredContact(od.PreferContactMethod),
    balance: od.BalTotal ?? 0,
    status: mapPatientStatus(od.PatStatus),
  };
}

export function mapAppointment(od: ODAppointment): CanonicalAppointment {
  // Pattern is a string of '/' and 'X' chars where each char = 5 minutes
  const durationMinutes = od.Pattern ? od.Pattern.length * 5 : 30;

  return {
    pmsId: String(od.AptNum),
    patientPmsId: String(od.PatNum),
    dateTime: od.AptDateTime,
    duration: durationMinutes,
    status: mapAptStatus(od.AptStatus),
    provider: od.ProvAbbr ?? String(od.ProvNum),
    operatory: od.Op ? String(od.Op) : undefined,
    procedures: od.ProcDescript ? od.ProcDescript.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    notes: od.Note || undefined,
  };
}

export function mapInsurancePlan(
  patPlan: ODPatPlan,
  insSub: ODInsSub,
  insPlan: ODInsPlan,
  carrier: ODCarrier,
): CanonicalInsurancePlan {
  return {
    patientPmsId: String(patPlan.PatNum),
    ordinal: patPlan.Ordinal,
    patPlanPmsId: String(patPlan.PatPlanNum),
    insSubPmsId: String(insSub.InsSubNum),
    insPlanPmsId: String(insPlan.PlanNum),
    carrierPmsId: String(carrier.CarrierNum),
    carrierName: carrier.CarrierName,
    carrierPhone: carrier.Phone || undefined,
    carrierElectId: carrier.ElectID || undefined,
    groupName: insPlan.GroupName || undefined,
    groupNumber: insPlan.GroupNum || undefined,
    subscriberId: insSub.SubscriberID,
    subscriberName: undefined, // Would need subscriber patient lookup
    planType: insPlan.PlanType || undefined,
    filingCode: insPlan.FilingCode ? String(insPlan.FilingCode) : undefined,
  };
}

export function mapVerificationStatus(od: ODInsVerify): CanonicalVerificationStatus {
  return {
    patPlanPmsId: String(od.FKey),
    verifyType: od.VerifyType === 1 ? 'insurance_benefit' : 'patient_enrollment',
    lastVerifiedDate: od.DateLastVerified || undefined,
    verifyNote: od.Note || undefined,
  };
}

export function mapClaim(od: ODClaim): CanonicalClaim {
  return {
    pmsId: String(od.ClaimNum),
    patientPmsId: String(od.PatNum),
    carrierName: od.CarrierName ?? '',
    claimType: od.ClaimType ?? 'primary',
    status: od.ClaimStatus,
    amountBilled: od.ClaimFee,
    amountPaid: od.InsPayAmt,
    dateSubmitted: od.DateSent || undefined,
    dateReceived: od.DateReceived || undefined,
    procedures: [], // Populated separately from ClaimProcs
  };
}
