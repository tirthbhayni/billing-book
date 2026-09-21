'use client';
import { Purchase, Payment, ReceivedPayment, Expense } from '@/types';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Wallet, TrendingUp, TrendingDown, Award, Landmark, Calendar } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { formatINR } from '@/lib/format';

type DashboardProps = {
  purchases: Purchase[];
  payments: Payment[];
  receivedPayments: ReceivedPayment[];
  expenses: Expense[];
};

export default function Dashboard({ purchases, payments, receivedPayments, expenses }: DashboardProps) {
  const today = new Date();
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);

  const monthlyPurchases = purchases.filter((p) =>
    isWithinInterval(parseISO(p.date), { start: thisMonthStart, end: thisMonthEnd })
  );
  const totalMonthlyAmount = monthlyPurchases.reduce((sum, p) => sum + p.price, 0);

  const totalPurchases = purchases.reduce((sum, p) => sum + p.price, 0);
  const totalPaidToSuppliers = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDueToSuppliers = totalPurchases - totalPaidToSuppliers;

  const totalRevenue = receivedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const netBalance = totalRevenue - totalPurchases - totalExpenses;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total received"
          value={formatINR(totalRevenue)}
          icon={Wallet}
          tone="green"
          hint="Meesho, Flipkart, Amazon and other receipts"
        />
        <StatCard
          label="Total purchases"
          value={formatINR(totalPurchases)}
          icon={TrendingUp}
          tone="blue"
          hint={`Monthly avg ${formatINR(totalPurchases / 12 || 0)}`}
        />
        <StatCard
          label="Total expenses"
          value={formatINR(totalExpenses)}
          icon={TrendingDown}
          tone="amber"
          hint="Operating costs and overheads"
        />
        <StatCard
          label="Net balance"
          value={`${netBalance < 0 ? '-' : ''}${formatINR(Math.abs(netBalance))}`}
          icon={Award}
          tone={netBalance >= 0 ? 'green' : 'red'}
          hint={netBalance >= 0 ? 'Currently profitable' : 'Currently in loss'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Pending due to suppliers"
          value={formatINR(totalDueToSuppliers)}
          icon={Landmark}
          tone="red"
          hint="Requires settlement"
        />
        <StatCard
          label="Purchases this month"
          value={formatINR(totalMonthlyAmount)}
          icon={Calendar}
          tone="navy"
          hint="Current billing cycle"
        />
      </div>
    </div>
  );
}
