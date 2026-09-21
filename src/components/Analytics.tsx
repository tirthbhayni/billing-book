'use client';

import { Purchase } from '@/types';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardDescription, CardHeader, CardTitle, EmptyState, FilterChip, Money } from '@/components/ui';
import { formatINR } from '@/lib/format';

type AnalyticsProps = {
  purchases: Purchase[];
};

const COLORS = ['#1E3A5F', '#2563EB', '#059669', '#D97706', '#7C3AED', '#0EA5E9'];

export default function Analytics({ purchases }: AnalyticsProps) {
  const [view, setView] = useState<'buyer' | 'product'>('buyer');

  const { buyerData, productData } = useMemo(() => {
    const bStats: Record<string, number> = {};
    const pStats: Record<string, number> = {};

    purchases.forEach((p) => {
      bStats[p.buyer_name] = (bStats[p.buyer_name] || 0) + p.price;
      const product = p.item_description.trim().toLowerCase();
      const displayProduct = product.charAt(0).toUpperCase() + product.slice(1);
      pStats[displayProduct] = (pStats[displayProduct] || 0) + p.price;
    });

    const toTop = (stats: Record<string, number>) => {
      const sorted = Object.entries(stats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      if (sorted.length <= 5) return sorted;
      const top = sorted.slice(0, 5);
      const other = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      return [...top, { name: 'Other', value: other }];
    };

    return { buyerData: toTop(bStats), productData: toTop(pStats) };
  }, [purchases]);

  if (purchases.length === 0) {
    return (
      <Card>
        <EmptyState title="No analytics yet" description="Add purchases to see buyer and product share." />
      </Card>
    );
  }

  const data = view === 'buyer' ? buyerData : productData;
  const title = view === 'buyer' ? 'Buyer analytics' : 'Product analytics';
  const label = view === 'buyer' ? 'Purchase volume by buyer' : 'Purchase volume by product';

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{label}</CardDescription>
        </div>
        <div className="flex gap-1.5">
          <FilterChip active={view === 'buyer'} onClick={() => setView('buyer')}>
            By buyer
          </FilterChip>
          <FilterChip active={view === 'product'} onClick={() => setView('product')}>
            By product
          </FilterChip>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 gap-8 p-4 sm:p-5 lg:grid-cols-2">
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [formatINR(Number(value ?? 0)), 'Purchases']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="value" fill="#1e3a5f" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="45%" innerRadius={56} outerRadius={88} dataKey="value" nameKey="name">
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatINR(Number(value ?? 0)), 'Purchases']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border-t border-border">
        <ul className="divide-y divide-border">
          {data.map((item, index) => (
            <li key={item.name} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {item.name}
              </span>
              <Money value={item.value} className="text-sm font-semibold" />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
