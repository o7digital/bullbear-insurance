import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', timeout: 120000, use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4387', browserName: 'chromium' }, reporter: 'list' });
