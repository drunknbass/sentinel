import { vi } from 'vitest';

beforeEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch not mocked'))));
});

afterAll(() => {
  vi.unstubAllGlobals();
});
