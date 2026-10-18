import { test as base } from '@playwright/test';
import { pool } from '../../packages/database/index';
export { expect } from '@playwright/test';
export const test = base.extend<{}, { databaseLifetime: undefined }>({
  databaseLifetime: [
    async ({}, use) => {
      await use(undefined);
      await pool.end();
    },
    { scope: 'worker', auto: true },
  ],
});
