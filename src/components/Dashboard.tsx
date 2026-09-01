'use client';
import { Purchase, Payment, ReceivedPayment, Expense } from '@/types';
import { startOfMonth, startOfWeek, endOfMonth, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { Calendar, CalendarDays, Wallet, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

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
  
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const monthlyPurchases = purchases.filter((p) => isWithinInterval(parseISO(p.date), { start: thisMonthStart, end: thisMonthEnd }));
  const totalMonthlyAmount = monthlyPurchases.reduce((sum, p) => sum + p.price, 0);
  
  const totalPurchases = purchases.reduce((sum, p) => sum + p.price, 0);
  const totalPaidToSuppliers = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDueToSuppliers = totalPurchases - totalPaidToSuppliers;

  const totalRevenue = receivedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const netBalance = totalRevenue - totalPurchases - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Total Revenue (Sales)</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <CalendarDays size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Total Purchases</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{totalPurchases.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
              <TrendingDown size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Total Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{totalExpenses.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${netBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <Landmark size={20} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Net Business Balance</h3>
          </div>
          <p className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {netBalance >= 0 ? '+' : ''}₹{netBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-full">
            <Wallet size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Pending Due to Suppliers</h3>
            <p className="text-xl font-bold text-slate-900">₹{totalDueToSuppliers.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Purchases This Month</h3>
            <p className="text-xl font-bold text-slate-900">₹{totalMonthlyAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
