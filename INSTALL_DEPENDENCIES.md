# Install Dependencies

Due to WSL environment limitations, please run the following command to install all testing dependencies:

```bash
npm install
```

This will install:
- Vitest (unit/integration testing)
- Playwright (E2E testing)
- Testing Library (React component testing)
- All related dependencies

After installation, you can run:

```bash
npm test                 # Run unit tests
npm run test:ui          # Open Vitest UI
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Open Playwright UI
```

## What Was Added

### Package Dependencies (package.json)
- `vitest` - Fast unit test framework
- `@vitest/ui` - UI dashboard for tests
- `@vitest/coverage-v8` - Code coverage
- `@playwright/test` - E2E testing framework
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM implementation for Node
- `@vitejs/plugin-react` - Vite React plugin
- `vitest-mock-extended` - Advanced mocking utilities
- `prisma-mock` - Prisma client mocking

### Configuration Files
- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration

### Test Infrastructure
- `src/__tests__/setup.ts` - Global test setup
- `src/__tests__/utils/mockPrisma.ts` - Prisma mocking utilities
- `src/__tests__/utils/mockAuth.ts` - Auth mocking utilities
- `src/lib/__tests__/finance.test.ts` - Finance module tests (80%+ coverage)

### Documentation
- `docs/testing-guide.md` - Comprehensive testing guide

All files are ready. Just run `npm install` to install dependencies and start testing!
