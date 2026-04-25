import type { IPayerAdapter } from './types';
import { PayerNotSupportedError } from './types';
import { DentalXChangeAdapter } from './clearinghouse/dentalxchange';

export interface PayerConfigLike {
  adapterKey: string;
  payerName: string;
  credentials?: string | null;
}

export function getPayerAdapter(config: PayerConfigLike): IPayerAdapter {
  switch (config.adapterKey) {
    case 'clearinghouse.dentalxchange':
      return new DentalXChangeAdapter(config.payerName);
    // Future:
    // case 'medicaid.minnesota':
    //   return new MinnesotaMedicaidAdapter(config.credentials);
    default:
      throw new PayerNotSupportedError(config.adapterKey);
  }
}
