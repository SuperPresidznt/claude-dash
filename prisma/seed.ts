import { PrismaClient, MacroTargetMetricType, ExperimentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? 'owner@example.com';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      macroGoals: {
        create: [
          { title: '1000 Missionaries', targetMetricType: MacroTargetMetricType.count },
          { title: '$100,000,000 Net Worth', targetMetricType: MacroTargetMetricType.money },
          { title: '10 Kids', targetMetricType: MacroTargetMetricType.count },
          { title: '1 Wife/Marriage', targetMetricType: MacroTargetMetricType.custom }
        ]
      },
      reminders: {
        create: [
          {
            title: 'Read Bible 1s — 5:10 AM (America/Chicago)',
            schedule: 'FREQ=DAILY;BYHOUR=5;BYMINUTE=10',
            nextFireAt: new Date()
          }
        ]
      },
      routineExperiments: {
        create: [
          {
            title: '10-second start before any task',
            hypothesis: 'Daily 10s start increases starts/day by 2.',
            metric: 'starts_per_day',
            targetValue: 2,
            startDate: new Date(),
            status: ExperimentStatus.planned
          }
        ]
      }
    }
  });

  console.log(`Seeded base data for ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
