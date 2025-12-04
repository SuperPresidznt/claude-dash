import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const debtPayoffSchema = z.object({
  strategy: z.enum(['snowball', 'avalanche', 'custom']),
  monthlyPaymentCents: z.number().int().positive(),
  customOrder: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { strategy, monthlyPaymentCents, customOrder } = debtPayoffSchema.parse(body);

    // Get all liabilities
    const liabilities = await prisma.liability.findMany({
      where: { userId: user.id },
    });

    if (liabilities.length === 0) {
      return NextResponse.json({
        totalDebt: 0,
        monthsToPayoff: 0,
        totalInterest: 0,
        schedule: [],
      });
    }

    // Sort debts based on strategy
    let sortedDebts = [...liabilities];
    if (strategy === 'snowball') {
      // Smallest balance first
      sortedDebts.sort((a, b) => a.balanceCents - b.balanceCents);
    } else if (strategy === 'avalanche') {
      // Highest APR first
      sortedDebts.sort((a, b) => (b.aprPercent || 0) - (a.aprPercent || 0));
    } else if (strategy === 'custom' && customOrder) {
      const orderMap = new Map(customOrder.map((id, idx) => [id, idx]));
      sortedDebts.sort((a, b) => (orderMap.get(a.id) || 999) - (orderMap.get(b.id) || 999));
    }

    // Calculate payoff schedule
    const schedule: any[] = [];
    const debts = sortedDebts.map(d => ({
      id: d.id,
      name: d.name,
      balance: d.balanceCents,
      apr: d.aprPercent || 0,
      minPayment: d.minimumPayment || 0,
    }));

    let totalInterestPaid = 0;
    let month = 0;
    let availablePayment = monthlyPaymentCents;

    while (debts.some(d => d.balance > 0)) {
      month++;
      if (month > 600) break; // Safety limit (50 years)

      const monthSchedule: any = {
        month,
        payments: [],
        remainingBalances: [],
      };

      // Apply interest to all debts
      debts.forEach(debt => {
        if (debt.balance > 0) {
          const monthlyInterest = (debt.balance * (debt.apr / 100)) / 12;
          debt.balance += monthlyInterest;
          totalInterestPaid += monthlyInterest;
        }
      });

      // Pay minimum on all debts first
      let remainingPayment = availablePayment;
      debts.forEach(debt => {
        if (debt.balance > 0) {
          const minPay = Math.min(debt.minPayment, debt.balance, remainingPayment);
          debt.balance -= minPay;
          remainingPayment -= minPay;
          monthSchedule.payments.push({
            debtId: debt.id,
            name: debt.name,
            payment: minPay,
            type: 'minimum',
          });
        }
      });

      // Apply remaining payment to target debt (first in sorted order with balance)
      if (remainingPayment > 0) {
        const targetDebt = debts.find(d => d.balance > 0);
        if (targetDebt) {
          const extraPay = Math.min(remainingPayment, targetDebt.balance);
          targetDebt.balance -= extraPay;
          monthSchedule.payments.push({
            debtId: targetDebt.id,
            name: targetDebt.name,
            payment: extraPay,
            type: 'extra',
          });
        }
      }

      // Record remaining balances
      monthSchedule.remainingBalances = debts.map(d => ({
        debtId: d.id,
        name: d.name,
        balance: Math.max(0, d.balance),
      }));

      schedule.push(monthSchedule);
    }

    const totalDebtCents = liabilities.reduce((sum, l) => sum + l.balanceCents, 0);

    return NextResponse.json({
      strategy,
      totalDebtCents,
      monthlyPaymentCents,
      monthsToPayoff: month,
      totalInterestPaidCents: Math.round(totalInterestPaid),
      totalPaidCents: Math.round(totalDebtCents + totalInterestPaid),
      schedule: schedule.slice(0, 60), // Return first 60 months detail
      debts: sortedDebts.map(d => ({
        id: d.id,
        name: d.name,
        balanceCents: d.balanceCents,
        aprPercent: d.aprPercent,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error calculating debt payoff:', error);
    return NextResponse.json(
      { error: 'Failed to calculate debt payoff' },
      { status: 500 }
    );
  }
}
