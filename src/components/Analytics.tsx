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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <div className="flex bg-gray-100 p-1 rounded-md">
          <button 
            onClick={() => setView('buyer')}
            className={`px-3 py-1 rounded text-sm font-medium ${view === 'buyer' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            By Buyer
          </button>
          <button 
            onClick={() => setView('product')}
            className={`px-3 py-1 rounded text-sm font-medium ${view === 'product' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            By Product
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-80">
        <div className="h-full">
          <h3 className="text-sm font-medium text-gray-500 mb-4 text-center">{label}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(val) => `₹${val}`} />
              <Tooltip formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Purchases']} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-full flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4 text-center">Share of Total</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Purchases']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
