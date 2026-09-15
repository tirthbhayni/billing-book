'use client';

import { useState, useMemo } from 'react';
import { Purchase, Buyer } from '@/types';
import PurchaseForm from '@/components/PurchaseForm';
import TransactionsList from '@/components/TransactionsList';
import { 
  ShoppingBag, 
  Calendar, 
  Users, 
  Package, 
  TrendingUp, 
  Search, 
  ArrowRight, 
  BarChart3, 
  Layers,
  ReceiptText
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell 
} from 'recharts';

type PurchasesTabProps = {
  buyers: Buyer[];
  purchases: Purchase[];
  onUpdate: () => void;
};

type SubTab = 'transactions' | 'buyers' | 'months' | 'items';

export default function PurchasesTab({ buyers, purchases, onUpdate }: PurchasesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('transactions');
  const [selectedBuyerFilter, setSelectedBuyerFilter] = useState<string>('');
  
  // Local searches for breakdowns
  const [buyerSearch, setBuyerSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // Overall KPI metrics
  const { totalPurchasesAmount, totalBillsCount, totalQuantity, thisMonthAmount, thisMonthBills, avgBillAmount, uniqueBuyerCount } = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    let totalAmount = 0;
    let totalQty = 0;
    let mAmount = 0;
    let mBills = 0;
    const buyerSet = new Set<string>();

    purchases.forEach(p => {
      const price = Number(p.price) || 0;
      const qty = Number(p.quantity) || 0;
      totalAmount += price;
      totalQty += qty;

      if (p.buyer_name) {
        buyerSet.add(p.buyer_name.trim());
      }

      if (p.date) {
        const parsed = parseISO(p.date);
        if (isValid(parsed) && isWithinInterval(parsed, { start: monthStart, end: monthEnd })) {
          mAmount += price;
          mBills += 1;
        }
      }
    });

    const avg = purchases.length > 0 ? totalAmount / purchases.length : 0;

    return {
      totalPurchasesAmount: totalAmount,
      totalBillsCount: purchases.length,
      totalQuantity: totalQty,
      thisMonthAmount: mAmount,
      thisMonthBills: mBills,
      avgBillAmount: avg,
      uniqueBuyerCount: buyerSet.size
    };
  }, [purchases]);

  // Buyer-wise breakdown calculation
  const buyerBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalAmount: number }> = {};

    purchases.forEach(p => {
      const bName = (p.buyer_name || 'Unassigned').trim();
      if (!map[bName]) {
        map[bName] = { count: 0, totalQty: 0, totalAmount: 0 };
      }
      map[bName].count += 1;
      map[bName].totalQty += Number(p.quantity) || 0;
      map[bName].totalAmount += Number(p.price) || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalQty: data.totalQty,
        totalAmount: data.totalAmount,
        avgBill: data.count > 0 ? data.totalAmount / data.count : 0,
        percentage: totalPurchasesAmount > 0 ? (data.totalAmount / totalPurchasesAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [purchases, totalPurchasesAmount]);

  const filteredBuyerBreakdown = useMemo(() => {
    if (!buyerSearch.trim()) return buyerBreakdown;
    const q = buyerSearch.toLowerCase();
    return buyerBreakdown.filter(b => b.name.toLowerCase().includes(q));
  }, [buyerBreakdown, buyerSearch]);

  // Month-wise breakdown calculation
  const { monthBreakdown, chartData } = useMemo(() => {
    const map: Record<string, { label: string; count: number; totalQty: number; totalAmount: number; sortKey: string }> = {};

    purchases.forEach(p => {
      if (!p.date) return;
      const parsed = parseISO(p.date);
      if (!isValid(parsed)) return;

      const sortKey = format(parsed, 'yyyy-MM');
      const label = format(parsed, 'MMM yyyy');

      if (!map[sortKey]) {
        map[sortKey] = { label, count: 0, totalQty: 0, totalAmount: 0, sortKey };
      }
      map[sortKey].count += 1;
      map[sortKey].totalQty += Number(p.quantity) || 0;
      map[sortKey].totalAmount += Number(p.price) || 0;
    });

    const sortedMonths = Object.values(map).sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    const list = sortedMonths.map(m => ({
      ...m,
      avgBill: m.count > 0 ? m.totalAmount / m.count : 0,
      percentage: totalPurchasesAmount > 0 ? (m.totalAmount / totalPurchasesAmount) * 100 : 0
    }));

    // For chart: chronological order (oldest to newest, max 12 months)
    const chart = [...sortedMonths]
      .reverse()
      .slice(-12)
      .map(m => ({
        name: m.label,
        amount: m.totalAmount,
        bills: m.count,
        qty: m.totalQty
      }));

    return { monthBreakdown: list, chartData: chart };
  }, [purchases, totalPurchasesAmount]);

  // Item-wise breakdown calculation
  const itemBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalAmount: number }> = {};

    purchases.forEach(p => {
      const desc = (p.item_description || 'Unspecified').trim();
      const norm = desc.charAt(0).toUpperCase() + desc.slice(1);
      if (!map[norm]) {
        map[norm] = { count: 0, totalQty: 0, totalAmount: 0 };
      }
      map[norm].count += 1;
      map[norm].totalQty += Number(p.quantity) || 0;
      map[norm].totalAmount += Number(p.price) || 0;
    });

    return Object.entries(map)
      .map(([item, data]) => ({
        item,
        count: data.count,
        totalQty: data.totalQty,
        totalAmount: data.totalAmount,
        avgPrice: data.totalQty > 0 ? data.totalAmount / data.totalQty : 0,
        percentage: totalPurchasesAmount > 0 ? (data.totalAmount / totalPurchasesAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [purchases, totalPurchasesAmount]);

  const filteredItemBreakdown = useMemo(() => {
    if (!itemSearch.trim()) return itemBreakdown;
    const q = itemSearch.toLowerCase();
    return itemBreakdown.filter(i => i.item.toLowerCase().includes(q));
  }, [itemBreakdown, itemSearch]);

  const handleFilterByBuyer = (buyerName: string) => {
    setSelectedBuyerFilter(buyerName);
    setActiveSubTab('transactions');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Total Purchases Card */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Purchases</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              ₹{totalPurchasesAmount.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
              <span>{totalBillsCount} Total Invoices</span>
              <span>Avg: ₹{Math.round(avgBillAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* This Month's Purchases Card */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Month</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              ₹{thisMonthAmount.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
              <span>{thisMonthBills} Purchases this month</span>
              <span className="text-blue-600 font-semibold">{totalPurchasesAmount > 0 ? `${((thisMonthAmount / totalPurchasesAmount) * 100).toFixed(0)}% of total` : '0%'}</span>
            </div>
          </div>
        </div>

        {/* Total Quantity Card */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Units Bought</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {totalQuantity.toLocaleString()} <span className="text-sm font-semibold text-slate-500">pcs</span>
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
              <span>Avg per Bill: {totalBillsCount > 0 ? (totalQuantity / totalBillsCount).toFixed(1) : 0} pcs</span>
              <span className="text-emerald-600 font-semibold">Inventory in</span>
            </div>
          </div>
        </div>

        {/* Active Buyers / Suppliers */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 flex flex-col justify-between relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Suppliers</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {uniqueBuyerCount} <span className="text-sm font-semibold text-slate-500">Parties</span>
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
              <span>Registered: {buyers.length}</span>
              <span className="text-purple-600 font-semibold">Supplier Network</span>
            </div>
          </div>
        </div>

      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'transactions'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <ReceiptText size={16} />
          <span>Purchases & Entry</span>
        </button>

        <button
          onClick={() => setActiveSubTab('buyers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'buyers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Users size={16} />
          <span>Buyer-wise Total</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeSubTab === 'buyers' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {buyerBreakdown.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('months')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'months'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Calendar size={16} />
          <span>Month-wise Purchase</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeSubTab === 'months' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {monthBreakdown.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('items')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'items'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Layers size={16} />
          <span>Item-wise Total</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeSubTab === 'items' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {itemBreakdown.length}
          </span>
        </button>
      </div>

      {/* Sub-tab 1: Transactions List & Add Form */}
      {activeSubTab === 'transactions' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1">
            <PurchaseForm buyers={buyers} onSuccess={onUpdate} />
          </div>
          <div className="xl:col-span-2">
            <TransactionsList 
              purchases={purchases} 
              onUpdate={onUpdate}
              buyerFilter={selectedBuyerFilter}
              onBuyerFilterChange={setSelectedBuyerFilter}
              title="All Purchase Transactions"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 2: Buyer-wise Breakdown */}
      {activeSubTab === 'buyers' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buyer-wise Purchase Summary</h2>
              <p className="text-xs text-slate-500 mt-1">
                Total purchase spending and unit volume broken down by supplier/buyer.
              </p>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search buyer name..."
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <th className="p-4 font-semibold">#</th>
                  <th className="p-4 font-semibold whitespace-nowrap">Buyer / Supplier</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Bills</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Total Qty</th>
                  <th className="p-4 font-semibold text-right whitespace-nowrap">Total Purchase (₹)</th>
                  <th className="p-4 font-semibold text-right whitespace-nowrap">Avg / Bill</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">% Share</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBuyerBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No buyer purchase data found.
                    </td>
                  </tr>
                ) : (
                  filteredBuyerBreakdown.map((b, idx) => (
                    <tr key={b.name} className="hover:bg-indigo-50/40 transition-colors group">
                      <td className="p-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                        {b.name}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold">
                          {b.count}
                        </span>
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                        {b.totalQty.toLocaleString()} pcs
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 whitespace-nowrap text-base">
                        ₹{b.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-600 whitespace-nowrap">
                        ₹{Math.round(b.avgBill).toLocaleString()}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                            {b.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleFilterByBuyer(b.name)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200/60"
                        >
                          <span>View Bills</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Grand Total Row */}
              {buyerBreakdown.length > 0 && (
                <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 text-sm font-semibold">
                  <tr>
                    <td colSpan={2} className="p-4 text-slate-800 font-extrabold whitespace-nowrap">
                      Grand Total ({buyerBreakdown.length} Suppliers)
                    </td>
                    <td className="p-4 text-center font-extrabold text-slate-800 whitespace-nowrap">
                      {buyerBreakdown.reduce((sum, b) => sum + b.count, 0)}
                    </td>
                    <td className="p-4 text-center font-extrabold text-indigo-700 whitespace-nowrap">
                      {buyerBreakdown.reduce((sum, b) => sum + b.totalQty, 0).toLocaleString()} pcs
                    </td>
                    <td className="p-4 text-right font-black text-indigo-700 text-base whitespace-nowrap">
                      ₹{buyerBreakdown.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-700 whitespace-nowrap">
                      ₹{Math.round(avgBillAmount).toLocaleString()}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 whitespace-nowrap">100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Month-wise Purchase Summary */}
      {activeSubTab === 'months' && (
        <div className="space-y-6">
          {/* Visual Trend Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Monthly Purchase Trends</h3>
                    <p className="text-xs text-slate-500">Monthly spending volume over time</p>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tickFormatter={(val) => `₹${Number(val).toLocaleString()}`} 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        `₹${Number(value || 0).toLocaleString()}`, 
                        'Total Purchase'
                      ]}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#ffffff'
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#4f46e5" 
                      radius={[6, 6, 0, 0]} 
                      name="Purchases"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Month Table */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Month-wise Purchase Breakdown</h2>
              <p className="text-xs text-slate-500 mt-1">
                Detailed monthly breakdown of purchase values, bill counts, and quantities.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                    <th className="p-4 font-semibold whitespace-nowrap">Month & Year</th>
                    <th className="p-4 font-semibold text-center whitespace-nowrap">Number of Bills</th>
                    <th className="p-4 font-semibold text-center whitespace-nowrap">Total Quantity</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Total Purchase (₹)</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Avg / Bill (₹)</th>
                    <th className="p-4 font-semibold text-center whitespace-nowrap">% Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {monthBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        No purchase records available for monthly grouping.
                      </td>
                    </tr>
                  ) : (
                    monthBreakdown.map((m) => (
                      <tr key={m.sortKey} className="hover:bg-indigo-50/40 transition-colors group">
                        <td className="p-4 font-bold text-slate-800 whitespace-nowrap flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-500" />
                          <span>{m.label}</span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold">
                            {m.count} bills
                          </span>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {m.totalQty.toLocaleString()} pcs
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 whitespace-nowrap text-base">
                          ₹{m.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-600 whitespace-nowrap">
                          ₹{Math.round(m.avgBill).toLocaleString()}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(0, m.percentage))}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                              {m.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Grand Total Row */}
                {monthBreakdown.length > 0 && (
                  <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 text-sm font-semibold">
                    <tr>
                      <td className="p-4 text-slate-800 font-extrabold whitespace-nowrap">
                        Grand Total ({monthBreakdown.length} Months)
                      </td>
                      <td className="p-4 text-center font-extrabold text-slate-800 whitespace-nowrap">
                        {monthBreakdown.reduce((sum, m) => sum + m.count, 0)} bills
                      </td>
                      <td className="p-4 text-center font-extrabold text-indigo-700 whitespace-nowrap">
                        {monthBreakdown.reduce((sum, m) => sum + m.totalQty, 0).toLocaleString()} pcs
                      </td>
                      <td className="p-4 text-right font-black text-indigo-700 text-base whitespace-nowrap">
                        ₹{monthBreakdown.reduce((sum, m) => sum + m.totalAmount, 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-700 whitespace-nowrap">
                        ₹{Math.round(avgBillAmount).toLocaleString()}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700 whitespace-nowrap">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Item-wise Breakdown ("Other") */}
      {activeSubTab === 'items' && (
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Item-wise Purchase Summary</h2>
              <p className="text-xs text-slate-500 mt-1">
                Volume and total cost per product / inventory item description.
              </p>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search item name..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <th className="p-4 font-semibold">#</th>
                  <th className="p-4 font-semibold whitespace-nowrap">Item Description</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Orders</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Total Qty</th>
                  <th className="p-4 font-semibold text-right whitespace-nowrap">Total Purchase (₹)</th>
                  <th className="p-4 font-semibold text-right whitespace-nowrap">Avg Price / Unit</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">% Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItemBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No item purchase data found.
                    </td>
                  </tr>
                ) : (
                  filteredItemBreakdown.map((i, idx) => (
                    <tr key={i.item} className="hover:bg-indigo-50/40 transition-colors group">
                      <td className="p-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                        {i.item}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold">
                          {i.count}
                        </span>
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                        {i.totalQty.toLocaleString()} pcs
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 whitespace-nowrap text-base">
                        ₹{i.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-600 whitespace-nowrap">
                        ₹{i.avgPrice.toFixed(2)}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(0, i.percentage))}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                            {i.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Grand Total Row */}
              {itemBreakdown.length > 0 && (
                <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 text-sm font-semibold">
                  <tr>
                    <td colSpan={2} className="p-4 text-slate-800 font-extrabold whitespace-nowrap">
                      Grand Total ({itemBreakdown.length} Items)
                    </td>
                    <td className="p-4 text-center font-extrabold text-slate-800 whitespace-nowrap">
                      {itemBreakdown.reduce((sum, i) => sum + i.count, 0)}
                    </td>
                    <td className="p-4 text-center font-extrabold text-indigo-700 whitespace-nowrap">
                      {itemBreakdown.reduce((sum, i) => sum + i.totalQty, 0).toLocaleString()} pcs
                    </td>
                    <td className="p-4 text-right font-black text-indigo-700 text-base whitespace-nowrap">
                      ₹{itemBreakdown.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-700 whitespace-nowrap">
                      ₹{totalQuantity > 0 ? (totalPurchasesAmount / totalQuantity).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 whitespace-nowrap">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
