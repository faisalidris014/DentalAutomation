import type { IPMSAdapter } from './types';
import { PMSNotSupportedError } from './types';
import { OpenDentalAdapter } from './opendental/adapter';
import type { OpenDentalConfig } from './opendental/types';
import { decrypt } from '../../services/encryption/credentials';

interface ClinicLike {
  pmsType: string;
  pmsConfig: unknown;
}

function decryptOpenDentalConfig(rawConfig: Record<string, unknown>): OpenDentalConfig {
  return {
    baseUrl: String(rawConfig.base_url ?? ''),
    developerKey: rawConfig.developer_key
      ? tryDecrypt(String(rawConfig.developer_key))
      : '',
    customerKey: rawConfig.customer_key
      ? tryDecrypt(String(rawConfig.customer_key))
      : '',
    apiMode: (rawConfig.api_mode as OpenDentalConfig['apiMode']) ?? 'remote',
  };
}

function tryDecrypt(value: string): string {
  // If the value contains ':' it's likely encrypted (iv:tag:ciphertext format)
  if (value.includes(':')) {
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function getAdapter(clinic: ClinicLike): IPMSAdapter {
  switch (clinic.pmsType) {
    case 'opendental': {
      const config = decryptOpenDentalConfig(clinic.pmsConfig as Record<string, unknown>);
      return new OpenDentalAdapter(config);
    }
    default:
      throw new PMSNotSupportedError(clinic.pmsType);
  }
}
