'use client';

import { Purchase } from '@/types';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type AnalyticsProps = {
  purchases: Purchase[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#ef4444', '#10b981', '#3b82f6'];

export default function Analytics({ purchases }: AnalyticsProps) {
  const [view, setView] = useState<'buyer' | 'product'>('buyer');

  const { buyerData, productData } = useMemo(() => {
    const bStats: Record<string, number> = {};
    const pStats: Record<string, number> = {};

    purchases.forEach(p => {
      // Group by buyer
      bStats[p.buyer_name] = (bStats[p.buyer_name] || 0) + p.price;
      
      // Group by product (ignoring case for better grouping)
      const product = p.item_description.trim().toLowerCase();
      // Capitalize first letter for display
      const displayProduct = product.charAt(0).toUpperCase() + product.slice(1);
      
      pStats[displayProduct] = (pStats[displayProduct] || 0) + p.price;
    });

    const bData = Object.entries(bStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const pData = Object.entries(pStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { buyerData: bData, productData: pData };
  }, [purchases]);

  if (purchases.length === 0) return null;

  const data = view === 'buyer' ? buyerData : productData;
  const title = view === 'buyer' ? 'Buyer Analytics' : 'Product Analytics';
  const label = view === 'buyer' ? 'Purchase Volume by Buyer (₹)' : 'Purchase Volume by Product (₹)';

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200/60 p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <div className="flex bg-slate-100 p-1.5 rounded-xl">
          <button 
            onClick={() => setView('buyer')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'buyer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            By Buyer
          </button>
          <button 
            onClick={() => setView('product')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'product' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            By Product
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-80 pt-4">
        <div className="h-full">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">{label}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Purchases']} 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-full flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">Share of Total</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={110}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Purchases']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
