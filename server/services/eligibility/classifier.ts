// ─── Known Commercial Carriers → Clearinghouse Adapter Key ─────────────────

const COMMERCIAL_CARRIERS: Record<string, string> = {
  'delta dental': 'clearinghouse.dentalxchange',
  'metlife': 'clearinghouse.dentalxchange',
  'cigna': 'clearinghouse.dentalxchange',
  'aetna': 'clearinghouse.dentalxchange',
  'united healthcare': 'clearinghouse.dentalxchange',
  'guardian': 'clearinghouse.dentalxchange',
  'humana': 'clearinghouse.dentalxchange',
  'principal': 'clearinghouse.dentalxchange',
  'ameritas': 'clearinghouse.dentalxchange',
  'sunlife': 'clearinghouse.dentalxchange',
};

// ─── Known Medicaid Carriers → State-Specific Adapter Keys ─────────────────

const MEDICAID_CARRIERS: Record<string, string> = {
  'minnesota medicaid': 'medicaid.minnesota',
  'medical assistance': 'medicaid.minnesota',
  'dentaquest': 'medicaid.minnesota',
  'health partners medicaid': 'medicaid.minnesota',
  // Future states:
  // 'texas medicaid': 'medicaid.texas',
  // 'tmhp': 'medicaid.texas',
};

// ─── Classification ────────────────────────────────────────────────────────

export interface PayerClassification {
  adapterKey: string;
  payerType: 'commercial' | 'medicaid' | 'unknown';
}

export function classifyPayer(carrierName: string): PayerClassification {
  const normalized = carrierName.trim().toLowerCase();

  // Check commercial first (most common for pilot)
  for (const [key, adapterKey] of Object.entries(COMMERCIAL_CARRIERS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { adapterKey, payerType: 'commercial' };
    }
  }

  // Check Medicaid
  for (const [key, adapterKey] of Object.entries(MEDICAID_CARRIERS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { adapterKey, payerType: 'medicaid' };
    }
  }

  return { adapterKey: 'manual_review', payerType: 'unknown' };
}

export function isKnownPayer(carrierName: string): boolean {
  return classifyPayer(carrierName).payerType !== 'unknown';
}
