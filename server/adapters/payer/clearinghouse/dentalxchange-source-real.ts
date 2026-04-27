// STUB — Wave 2 (plan 03.5-04) implements the HTTP client + 835 parser
// orchestration. This file exists today so the Wave 1 adapter dispatch
// (`DentalXChangeAdapter.constructor`) can instantiate the class without
// importing a non-existent module. Any actual call to `fetch()` throws
// `PayerConnectionError` until Wave 2 lands.
import type { IClearinghouseEOBSource } from './source-types';
import type { RawEOBDocument } from '../types';
import type { DXCCredentialsBlob } from './dentalxchange';
import { PayerConnectionError } from '../types';

export interface RealSourceConfig {
  payerName: string;
  env: 'sandbox' | 'production';
  credentials: DXCCredentialsBlob | null;
}

export class RealClearinghouseEOBSource implements IClearinghouseEOBSource {
  constructor(private readonly config: RealSourceConfig) {}

  async fetch(_params: {
    dateFrom: string;
    dateTo: string;
    clinicNpi: string;
  }): Promise<RawEOBDocument[]> {
    throw new PayerConnectionError(
      `RealClearinghouseEOBSource not implemented yet — Wave 2 (plan 03.5-04). env=${this.config.env}`,
    );
  }
}
