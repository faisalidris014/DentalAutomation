// Raw OpenDental API response types

export interface ODPatient {
  PatNum: number;
  LName: string;
  FName: string;
  MiddleI?: string;
  Birthdate: string;
  Gender: number; // 0=Male, 1=Female, 2=Unknown
  HmPhone?: string;
  WirelessPhone?: string;
  Email?: string;
  Address?: string;
  Address2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Guarantor?: number;
  PreferContactMethod?: number; // 0=None, 1=DoNotCall, 2=HmPhone, 3=WkPhone, 4=WirelessPh, 5=Email, 6=Mail
  BalTotal?: number;
  PatStatus: number; // 0=Patient, 1=NonPatient, 2=Inactive, 3=Archived, 4=Deceased, 5=Prospective
  DateTStamp?: string;
}

export interface ODAppointment {
  AptNum: number;
  PatNum: number;
  AptDateTime: string;
  Pattern: string;
  AptStatus: number; // 1=Scheduled, 2=Complete, 3=UnschedList, 5=Broken, 6=Planned
  ProvNum: number;
  ProvAbbr?: string;
  Op?: number;
  ProcDescript?: string;
  Note?: string;
  DateTStamp?: string;
}

export interface ODPatPlan {
  PatPlanNum: number;
  PatNum: number;
  InsSubNum: number;
  Ordinal: number;
}

export interface ODInsSub {
  InsSubNum: number;
  PlanNum: number;
  Subscriber: number;
  SubscriberID: string;
  DateEffective?: string;
  DateTerm?: string;
}

export interface ODInsPlan {
  PlanNum: number;
  GroupName?: string;
  GroupNum?: string;
  CarrierNum: number;
  PlanType?: string;
  FilingCode?: number;
}

export interface ODCarrier {
  CarrierNum: number;
  CarrierName: string;
  Phone?: string;
  ElectID?: string;
}

export interface ODInsVerify {
  InsVerifyNum: number;
  FKey: number;
  VerifyType: number; // 1=InsuranceBenefit, 2=PatientEnrollment
  DateLastVerified?: string;
  Note?: string;
  DateLastAssigned?: string;
}

export interface ODClaim {
  ClaimNum: number;
  PatNum: number;
  ClaimStatus: string; // U=Unsent, W=WaitingToSend, S=Sent, R=Received, etc.
  ClaimFee: number;
  InsPayAmt: number;
  DateService?: string;
  DateSent?: string;
  DateReceived?: string;
  PlanNum?: number;
  CarrierName?: string;
  ClaimType?: string;
}

export interface ODClaimPayment {
  ClaimPaymentNum: number;
  CheckNum: string;
  CheckDate: string;
  CheckAmt: number;
  CarrierName: string;
}

export interface ODClaimProc {
  ClaimProcNum: number;
  ClaimNum: number;
  PatNum: number;
  CodeSent: string;
  FeeBilled: number;
  InsPayAmt: number;
  AllowedOverride: number;
  WriteOff: number;
  Status: number;
}

export interface OpenDentalConfig {
  baseUrl: string;
  developerKey: string;
  customerKey: string;
  apiMode: 'remote' | 'local' | 'service';
}
