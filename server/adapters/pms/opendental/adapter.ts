import type {
  IPMSAdapter,
  CanonicalPatient,
  CanonicalAppointment,
  CanonicalInsurancePlan,
  CanonicalVerificationStatus,
  CanonicalClaim,
  SyncResult,
  WriteResult,
} from '../types';
import { OpenDentalClient } from './client';
import type {
  ODPatient,
  ODAppointment,
  ODPatPlan,
  ODInsSub,
  ODInsPlan,
  ODCarrier,
  ODInsVerify,
  ODClaim,
  OpenDentalConfig,
} from './types';
import {
  mapPatient,
  mapAppointment,
  mapInsurancePlan,
  mapVerificationStatus,
  mapClaim,
} from './mappers';

export class OpenDentalAdapter implements IPMSAdapter {
  readonly pmsType = 'opendental';
  private client: OpenDentalClient;
  private isMockMode: boolean;

  constructor(config: OpenDentalConfig) {
    this.client = new OpenDentalClient(config);
    this.isMockMode =
      process.env.PMS_MOCK_MODE === 'true' ||
      config.developerKey === 'placeholder' ||
      config.customerKey === 'placeholder';
  }

  async testConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
    try {
      await this.client.get<ODPatient[]>('/patients', { Limit: '1' });
      return { connected: true };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  async getPatients(params: {
    modifiedSince?: string;
    limit?: number;
    offset?: number;
  }): Promise<SyncResult<CanonicalPatient>> {
    const reqParams: Record<string, string> = {};
    if (params.modifiedSince) reqParams.DateTStamp = params.modifiedSince;
    if (params.limit) reqParams.Limit = String(params.limit);
    if (params.offset) reqParams.Offset = String(params.offset);

    const odPatients = params.limit
      ? await this.client.get<ODPatient[]>('/patients', reqParams)
      : await this.client.getAll<ODPatient>('/patients', reqParams);

    const items = odPatients.map(mapPatient);

    return {
      items,
      totalCount: items.length,
      hasMore: params.limit ? items.length >= params.limit : false,
      syncTimestamp: new Date().toISOString(),
    };
  }

  async getPatientById(pmsPatientId: string): Promise<CanonicalPatient | null> {
    try {
      const od = await this.client.get<ODPatient>(`/patients/${pmsPatientId}`);
      return od ? mapPatient(od) : null;
    } catch {
      return null;
    }
  }

  async getAppointments(params: {
    dateFrom: string;
    dateTo: string;
    status?: string;
    modifiedSince?: string;
    limit?: number;
    offset?: number;
  }): Promise<SyncResult<CanonicalAppointment>> {
    const reqParams: Record<string, string> = {
      AptDateTime: params.dateFrom,
    };
    if (params.modifiedSince) reqParams.DateTStamp = params.modifiedSince;
    if (params.limit) reqParams.Limit = String(params.limit);
    if (params.offset) reqParams.Offset = String(params.offset);

    const odApts = params.limit
      ? await this.client.get<ODAppointment[]>('/appointments', reqParams)
      : await this.client.getAll<ODAppointment>('/appointments', reqParams);

    // Filter by date range client-side (OD API may not support dateTo directly)
    const filtered = odApts
      .map(mapAppointment)
      .filter((a) => a.dateTime >= params.dateFrom && a.dateTime <= params.dateTo + 'T23:59:59');

    return {
      items: filtered,
      totalCount: filtered.length,
      hasMore: params.limit ? odApts.length >= params.limit : false,
      syncTimestamp: new Date().toISOString(),
    };
  }

  async getInsurancePlans(patientPmsId: string): Promise<CanonicalInsurancePlan[]> {
    // Step 1: Get patient's plan links
    const patPlans = await this.client.get<ODPatPlan[]>('/patplans', { PatNum: patientPmsId });
    if (!patPlans?.length) return [];

    const plans: CanonicalInsurancePlan[] = [];

    for (const patPlan of patPlans) {
      try {
        // Step 2: Get insurance subscription
        const insSub = await this.client.get<ODInsSub>(`/inssubs/${patPlan.InsSubNum}`);
        // Step 3: Get insurance plan details
        const insPlan = await this.client.get<ODInsPlan>(`/insplans/${insSub.PlanNum}`);
        // Step 4: Get carrier details
        const carrier = await this.client.get<ODCarrier>(`/carriers/${insPlan.CarrierNum}`);

        plans.push(mapInsurancePlan(patPlan, insSub, insPlan, carrier));
      } catch {
        // Skip plans that fail to resolve — log but don't crash
        console.error(`[OpenDental] Failed to resolve insurance plan for PatPlan ${patPlan.PatPlanNum}`);
      }
    }

    return plans;
  }

  async getVerificationStatus(patPlanPmsId: string): Promise<CanonicalVerificationStatus | null> {
    try {
      const verifies = await this.client.get<ODInsVerify[]>('/insverifies', {
        VerifyType: '2', // PatientEnrollment
        FKey: patPlanPmsId,
      });

      if (!verifies?.length) return null;
      return mapVerificationStatus(verifies[0]);
    } catch {
      return null;
    }
  }

  async writeVerificationResult(params: {
    patPlanPmsId: string;
    verifyDate: string;
    verifyNote?: string;
    verifiedBy?: string;
  }): Promise<WriteResult> {
    try {
      const result = await this.client.put<{ InsVerifyNum?: number }>('/insverifies', {
        FKey: parseInt(params.patPlanPmsId, 10),
        VerifyType: 2, // PatientEnrollment
        DateLastVerified: params.verifyDate,
        Note: params.verifyNote
          ? `${params.verifyNote} (DentalFlow${params.verifiedBy ? ` - ${params.verifiedBy}` : ''})`
          : `DentalFlow auto-verified`,
      });

      return {
        success: true,
        pmsRecordId: result?.InsVerifyNum ? String(result.InsVerifyNum) : undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Write failed',
      };
    }
  }

  async getClaims(params: {
    patientPmsId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    modifiedSince?: string;
    limit?: number;
    offset?: number;
  }): Promise<SyncResult<CanonicalClaim>> {
    const reqParams: Record<string, string> = {};
    if (params.patientPmsId) reqParams.PatNum = params.patientPmsId;
    if (params.status) reqParams.ClaimStatus = params.status;
    if (params.modifiedSince) reqParams.DateTStamp = params.modifiedSince;
    if (params.limit) reqParams.Limit = String(params.limit);
    if (params.offset) reqParams.Offset = String(params.offset);

    const odClaims = params.limit
      ? await this.client.get<ODClaim[]>('/claims', reqParams)
      : await this.client.getAll<ODClaim>('/claims', reqParams);

    const items = odClaims.map(mapClaim);

    return {
      items,
      totalCount: items.length,
      hasMore: params.limit ? odClaims.length >= params.limit : false,
      syncTimestamp: new Date().toISOString(),
    };
  }

  async postInsurancePayment(params: {
    checkNumber: string;
    checkDate: string;
    checkAmount: number;
    carrierName: string;
    lineItems: {
      claimPmsId: string;
      procedureCode: string;
      amountPaid: number;
      amountAllowed: number;
      adjustment: number;
      patientResponsibility: number;
      denialCode?: string;
    }[];
  }): Promise<WriteResult> {
    if (this.isMockMode) {
      const mockId = `MOCK-${Date.now()}`;
      console.log(
        `[PMS-MOCK] OpenDental.postInsurancePayment short-circuited — check=${params.checkNumber} amount=${params.checkAmount} lineItems=${params.lineItems.length} pmsRecordId=${mockId}`,
      );
      return { success: true, pmsRecordId: mockId };
    }

    try {
      // Step 1: Create the claim payment record
      const payment = await this.client.post<{ ClaimPaymentNum: number }>('/claimpayments', {
        CheckNum: params.checkNumber,
        CheckDate: params.checkDate,
        CheckAmt: params.checkAmount,
        CarrierName: params.carrierName,
      });

      // Step 2: Create claim proc entries for each line item
      for (const item of params.lineItems) {
        await this.client.post('/claimprocs', {
          ClaimNum: parseInt(item.claimPmsId, 10),
          ClaimPaymentNum: payment.ClaimPaymentNum,
          CodeSent: item.procedureCode,
          InsPayAmt: item.amountPaid,
          AllowedOverride: item.amountAllowed,
          WriteOff: item.adjustment,
        });
      }

      return {
        success: true,
        pmsRecordId: String(payment.ClaimPaymentNum),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Payment posting failed',
      };
    }
  }

  parseWebhookPayload(rawPayload: unknown): {
    eventType: string;
    entityType: string;
    entityId: string;
    timestamp: string;
    data: unknown;
  } {
    const payload = rawPayload as Record<string, unknown>;

    return {
      eventType: String(payload.EventType ?? 'unknown'),
      entityType: String(payload.TableName ?? 'unknown'),
      entityId: String(payload.KeyNum ?? '0'),
      timestamp: String(payload.DateTimeEntry ?? new Date().toISOString()),
      data: payload,
    };
  }
}
