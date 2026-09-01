'use client';
import { Purchase, Payment, ReceivedPayment, Expense } from '@/types';
import { startOfMonth, startOfWeek, endOfMonth, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { Calendar, CalendarDays, Wallet, TrendingUp, TrendingDown, Landmark, CheckCircle2, AlertCircle, Award } from 'lucide-react';

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
        
        {/* Revenue Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
            <Wallet size={24} />
          </div>
          <h3 className="text-sm text-slate-500 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-[#1a365d] tracking-tight">₹ {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={14} />
            <span>Verified Sales</span>
          </div>
        </div>

        {/* Purchases Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-sm text-slate-500 mb-1">Total Purchases</h3>
          <p className="text-2xl font-bold text-[#1a365d] tracking-tight">₹ {totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
            <span className="text-slate-400">Monthly Avg:</span> 
            <span>₹ {(totalPurchases / 12 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <TrendingDown size={24} />
          </div>
          <h3 className="text-sm text-slate-500 mb-1">Total Expenses</h3>
          <p className="text-2xl font-bold text-[#1a365d] tracking-tight">₹ {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
            <span>Operating costs & overheads</span>
          </div>
        </div>
        
        {/* Net Balance Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Award size={24} />
          </div>
          <h3 className="text-sm text-slate-500 mb-1">Net Balance</h3>
          <p className="text-2xl font-bold text-[#1a365d] tracking-tight">
            {netBalance < 0 ? '-' : ''}₹ {Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{netBalance >= 0 ? 'Profitable' : 'Loss'}</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <Wallet size={24} />
          </div>
          <h3 className="text-sm text-slate-500 mb-1">Pending Due to Suppliers</h3>
          <p className="text-2xl font-bold text-[#1a365d] tracking-tight">₹ {totalDueToSuppliers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
            <span>Requires settlement</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <h3 className="text-sm text-slate-500 mb-1">Purchases This Month</h3>
          <p className="text-2xl font-bold text-[#1a365d] tracking-tight">₹ {totalMonthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
            <span>Current billing cycle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
