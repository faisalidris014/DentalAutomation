import { z } from 'zod';

const configSchema = z.object({
  db: z.object({
    url: z.string().min(1, 'DATABASE_URL is required'),
    ssl: z.boolean(),
  }),
  auth: z.object({
    jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    jwtExpiry: z.string(),
    refreshTokenExpiryDays: z.number().int().positive(),
    bcryptRounds: z.number().int().min(10).max(15),
  }),
  encryption: z.object({
    credentialKey: z.string().min(32, 'CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters'),
  }),
  openDental: z.object({
    developerKey: z.string().min(1),
    sandboxCustomerKey: z.string().optional(),
    apiBaseUrl: z.string().url(),
  }),
  webhooks: z.object({
    secret: z.string().optional(),
  }),
  app: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']),
    url: z.string().url(),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const raw = {
    db: {
      url: process.env.DATABASE_URL ?? '',
      ssl: process.env.DATABASE_SSL === 'true',
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ?? '',
      jwtExpiry: process.env.JWT_EXPIRY ?? '15m',
      refreshTokenExpiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? '7', 10),
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    },
    encryption: {
      credentialKey: process.env.CREDENTIAL_ENCRYPTION_KEY ?? '',
    },
    openDental: {
      developerKey: process.env.OD_DEVELOPER_KEY ?? '',
      sandboxCustomerKey: process.env.OD_SANDBOX_CUSTOMER_KEY,
      apiBaseUrl: process.env.OD_API_BASE_URL ?? 'https://api.opendental.com/api/v1',
    },
    webhooks: {
      secret: process.env.WEBHOOK_SECRET || undefined,
    },
    app: {
      nodeEnv: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
      url: process.env.APP_URL ?? 'http://localhost:3000',
    },
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `  ${i.path.join('.')}: ${i.message}`
    );
    throw new Error(
      `Invalid configuration:\n${errors.join('\n')}\n\nCheck your .env.local file.`
    );
  }

  return Object.freeze(result.data) as AppConfig;
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// Lazy singleton — only validates when first accessed
export const config = new Proxy({} as AppConfig, {
  get(_, prop: string) {
    return getConfig()[prop as keyof AppConfig];
  },
});
