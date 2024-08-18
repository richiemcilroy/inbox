import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const stringToJSON = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str) as unknown;
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});

export const env = createEnv({
  server: {
    MAILBRIDGE_TRANSACTIONAL_CREDENTIALS: stringToJSON.pipe(
      z.object({
        apiUrl: z.string().url(),
        apiKey: z.string().min(1),
        sendAsName: z.string().min(1),
        sendAsEmail: z.string().email()
      })
    )
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
});
