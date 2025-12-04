# Testing Guide

## Overview

This project uses a comprehensive testing strategy with Vitest for unit/integration tests and Playwright for end-to-end tests.

## Test Infrastructure

### Vitest (Unit & Integration Tests)

**Configuration:** `vitest.config.ts`

- **Environment:** jsdom (for React component testing)
- **Globals:** Enabled for describe/it/expect without imports
- **Setup:** `src/__tests__/setup.ts` runs before all tests
- **Coverage:** V8 provider with HTML/JSON/text reporters

**Running Tests:**

```bash
npm test                 # Run all unit tests in watch mode
npm run test:ui          # Open Vitest UI dashboard
npm run test:coverage    # Generate coverage report
```

### Playwright (E2E Tests)

**Configuration:** `playwright.config.ts`

- **Test Directory:** `e2e/`
- **Browsers:** Chromium, Firefox, WebKit
- **Base URL:** http://localhost:800
- **Auto-start:** Automatically starts dev server

**Running Tests:**

```bash
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Open Playwright UI
```

## Test Utilities

### Mock Prisma (`src/__tests__/utils/mockPrisma.ts`)

Provides deep mocks for Prisma Client with helper functions:

```typescript
import { prismaMock, createMockUser, createMockAsset } from '@/__tests__/utils/mockPrisma';

// Use in tests
prismaMock.user.findUnique.mockResolvedValue(createMockUser());
```

**Available Helpers:**
- `createMockUser(overrides?)`
- `createMockAsset(overrides?)`
- `createMockLiability(overrides?)`
- `createMockCashflowTxn(overrides?)`
- `createMockBudgetEnvelope(overrides?)`

### Mock Auth (`src/__tests__/utils/mockAuth.ts`)

Utilities for mocking NextAuth sessions:

```typescript
import { createMockSession, mockUseSession } from '@/__tests__/utils/mockAuth';

// Mock authenticated session
const session = createMockSession();
mockUseSession(session, 'authenticated');
```

## Writing Tests

### Unit Tests (Library Functions)

Place tests next to the file: `src/lib/__tests__/[filename].test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle clicks', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### API Route Tests

```typescript
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prismaMock } from '@/__tests__/utils/mockPrisma';

describe('GET /api/tasks', () => {
  it('should return tasks for authenticated user', async () => {
    prismaMock.task.findMany.mockResolvedValue([...mockTasks]);

    const request = new NextRequest('http://localhost:800/api/tasks');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
  });
});
```

### E2E Tests

Place in `e2e/[feature].spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Tasks', () => {
  test('should create a new task', async ({ page }) => {
    await page.goto('/');

    // Sign in
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Sign in")');

    // Navigate to tasks
    await page.click('a:has-text("Tasks")');

    // Create task
    await page.click('button:has-text("New Task")');
    await page.fill('input[name="title"]', 'Test Task');
    await page.click('button:has-text("Save")');

    // Verify
    await expect(page.locator('text=Test Task')).toBeVisible();
  });
});
```

## Coverage Goals

### Phase 1 (Testing Infrastructure)
- ✅ Finance module: 80%+ coverage
- ✅ Test utilities created
- ✅ E2E framework configured

### Phase 2+ (New Features)
Each new module should include:
- Unit tests for all lib functions (90%+ coverage)
- Integration tests for API routes (80%+ coverage)
- Component tests for UI (70%+ coverage)
- E2E test for critical user journey

## Best Practices

1. **Isolation:** Each test should be independent and not rely on others
2. **Cleanup:** Use `beforeEach`/`afterEach` to reset state
3. **Descriptive:** Test names should describe the expected behavior
4. **Arrange-Act-Assert:** Structure tests clearly
5. **Mock External Dependencies:** Never hit real database or external APIs
6. **Test Edge Cases:** Include error scenarios, empty states, etc.

## CI/CD Integration

Tests run automatically on:
- Pre-commit hooks (unit tests)
- Pull requests (full suite)
- Main branch merges (full suite + coverage)

## Debugging Tests

```bash
# Run specific test file
npm test -- finance.test.ts

# Run tests matching pattern
npm test -- --grep "should calculate"

# Debug with UI
npm run test:ui

# Debug E2E in headed mode
npm run test:e2e:ui
```

## Common Issues

### Prisma Mock Not Working
- Ensure `vi.mock('../prisma')` is at top of file
- Use `vi.mocked(prisma.model.method)` to access mocks

### NextAuth Session Not Mocked
- Check that `src/__tests__/setup.ts` is running
- Use `mockUseSession()` helper for specific tests

### E2E Tests Flaky
- Add explicit waits: `await page.waitForSelector(...)`
- Use test retries in CI: configured in `playwright.config.ts`

## Next Steps

- [ ] Add mutation testing with Stryker
- [ ] Set up visual regression testing
- [ ] Configure CI coverage thresholds
- [ ] Add performance benchmarks
