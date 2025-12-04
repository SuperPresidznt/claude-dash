import { PrismaClient } from '@prisma/client';
import { beforeEach } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Helper to create mock user
export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  email: 'test@example.com',
  createdAt: new Date(),
  timezone: 'America/Chicago',
  currency: 'USD',
  defaultStartDuration: 10,
  ...overrides,
});

// Helper to create mock asset
export const createMockAsset = (overrides = {}) => ({
  id: 'asset_123',
  userId: 'user_123',
  name: 'Test Asset',
  category: 'cash',
  valueCents: 100000,
  isLiquid: true,
  note: null,
  updatedAt: new Date(),
  ...overrides,
});

// Helper to create mock liability
export const createMockLiability = (overrides = {}) => ({
  id: 'liability_123',
  userId: 'user_123',
  name: 'Test Liability',
  category: 'credit_card',
  balanceCents: 50000,
  aprPercent: 15.99,
  minimumPayment: 2500,
  note: null,
  updatedAt: new Date(),
  ...overrides,
});

// Helper to create mock cashflow transaction
export const createMockCashflowTxn = (overrides = {}) => ({
  id: 'txn_123',
  userId: 'user_123',
  description: 'Test Transaction',
  amountCents: 10000,
  date: new Date(),
  category: 'food',
  direction: 'outflow' as const,
  note: null,
  ...overrides,
});

// Helper to create mock budget envelope
export const createMockBudgetEnvelope = (overrides = {}) => ({
  id: 'envelope_123',
  userId: 'user_123',
  name: 'Test Budget',
  category: 'food',
  period: 'monthly' as const,
  targetCents: 50000,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
