'use client';

import { useState, useMemo } from 'react';
import { Purchase, Buyer } from '@/types';
import PurchaseForm from '@/components/PurchaseForm';
import TransactionsList from '@/components/TransactionsList';
import { ShoppingBag, Calendar, Users, Package, Search, ArrowRight, BarChart3, Layers, ReceiptText } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  Input,
  Money,
  ProgressBar,
  StatCard,
  TFoot,
  THead,
  Td,
  Tf,
  Th,
  Tr,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatINR, formatNumber, formatQty } from '@/lib/format';

type PurchasesTabProps = {
  buyers: Buyer[];
  purchases: Purchase[];
  onUpdate: () => void;
};

type SubTab = 'transactions' | 'buyers' | 'months' | 'items';

export default function PurchasesTab({ buyers, purchases, onUpdate }: PurchasesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('transactions');
  const [selectedBuyerFilter, setSelectedBuyerFilter] = useState<string>('');
  const [buyerSearch, setBuyerSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const { totalPurchasesAmount, totalBillsCount, totalQuantity, thisMonthAmount, thisMonthBills, avgBillAmount, uniqueBuyerCount } =
    useMemo(() => {
      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      let totalAmount = 0;
      let totalQty = 0;
      let mAmount = 0;
      let mBills = 0;
      const buyerSet = new Set<string>();

      purchases.forEach((p) => {
        const price = Number(p.price) || 0;
        const qty = Number(p.quantity) || 0;
        totalAmount += price;
        totalQty += qty;

        if (p.buyer_name) buyerSet.add(p.buyer_name.trim());

        if (p.date) {
          const parsed = parseISO(p.date);
          if (isValid(parsed) && isWithinInterval(parsed, { start: monthStart, end: monthEnd })) {
            mAmount += price;
            mBills += 1;
          }
        }
      });

      return {
        totalPurchasesAmount: totalAmount,
        totalBillsCount: purchases.length,
        totalQuantity: totalQty,
        thisMonthAmount: mAmount,
        thisMonthBills: mBills,
        avgBillAmount: purchases.length > 0 ? totalAmount / purchases.length : 0,
        uniqueBuyerCount: buyerSet.size,
      };
    }, [purchases]);

  const buyerBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalAmount: number }> = {};

    purchases.forEach((p) => {
      const bName = (p.buyer_name || 'Unassigned').trim();
      if (!map[bName]) map[bName] = { count: 0, totalQty: 0, totalAmount: 0 };
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
        percentage: totalPurchasesAmount > 0 ? (data.totalAmount / totalPurchasesAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [purchases, totalPurchasesAmount]);

  const filteredBuyerBreakdown = useMemo(() => {
    if (!buyerSearch.trim()) return buyerBreakdown;
    const q = buyerSearch.toLowerCase();
    return buyerBreakdown.filter((b) => b.name.toLowerCase().includes(q));
  }, [buyerBreakdown, buyerSearch]);

  const { monthBreakdown, chartData } = useMemo(() => {
    const map: Record<string, { label: string; count: number; totalQty: number; totalAmount: number; sortKey: string }> = {};

    purchases.forEach((p) => {
      if (!p.date) return;
      const parsed = parseISO(p.date);
      if (!isValid(parsed)) return;

      const sortKey = format(parsed, 'yyyy-MM');
      const label = format(parsed, 'MMM yyyy');

      if (!map[sortKey]) map[sortKey] = { label, count: 0, totalQty: 0, totalAmount: 0, sortKey };
      map[sortKey].count += 1;
      map[sortKey].totalQty += Number(p.quantity) || 0;
      map[sortKey].totalAmount += Number(p.price) || 0;
    });

    const sortedMonths = Object.values(map).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    const list = sortedMonths.map((m) => ({
      ...m,
      avgBill: m.count > 0 ? m.totalAmount / m.count : 0,
      percentage: totalPurchasesAmount > 0 ? (m.totalAmount / totalPurchasesAmount) * 100 : 0,
    }));

    const chart = [...sortedMonths]
      .reverse()
      .slice(-12)
      .map((m) => ({
        name: m.label,
        amount: m.totalAmount,
      }));

    return { monthBreakdown: list, chartData: chart };
  }, [purchases, totalPurchasesAmount]);

  const itemBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalAmount: number }> = {};

    purchases.forEach((p) => {
      const desc = (p.item_description || 'Unspecified').trim();
      const norm = desc.charAt(0).toUpperCase() + desc.slice(1);
      if (!map[norm]) map[norm] = { count: 0, totalQty: 0, totalAmount: 0 };
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
        percentage: totalPurchasesAmount > 0 ? (data.totalAmount / totalPurchasesAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [purchases, totalPurchasesAmount]);

  const filteredItemBreakdown = useMemo(() => {
    if (!itemSearch.trim()) return itemBreakdown;
    const q = itemSearch.toLowerCase();
    return itemBreakdown.filter((i) => i.item.toLowerCase().includes(q));
  }, [itemBreakdown, itemSearch]);

  const handleFilterByBuyer = (buyerName: string) => {
    setSelectedBuyerFilter(buyerName);
    setActiveSubTab('transactions');
  };

  const tabs: { id: SubTab; label: string; icon: typeof ReceiptText; count?: number }[] = [
    { id: 'transactions', label: 'Entry', icon: ReceiptText },
    { id: 'buyers', label: 'By buyer', icon: Users, count: buyerBreakdown.length },
    { id: 'months', label: 'By month', icon: Calendar, count: monthBreakdown.length },
    { id: 'items', label: 'By item', icon: Layers, count: itemBreakdown.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total purchases"
          value={formatINR(totalPurchasesAmount, { maximumFractionDigits: 0 })}
          icon={ShoppingBag}
          tone="navy"
          hint={`${totalBillsCount} invoices · avg ${formatINR(avgBillAmount, { maximumFractionDigits: 0 })}`}
        />
        <StatCard
          label="This month"
          value={formatINR(thisMonthAmount, { maximumFractionDigits: 0 })}
          icon={Calendar}
          tone="blue"
          hint={`${thisMonthBills} purchases this month`}
        />
        <StatCard
          label="Units bought"
          value={formatNumber(totalQuantity)}
          icon={Package}
          tone="green"
          hint={`Avg ${totalBillsCount > 0 ? (totalQuantity / totalBillsCount).toFixed(1) : 0} pcs per bill`}
        />
        <StatCard
          label="Active suppliers"
          value={String(uniqueBuyerCount)}
          icon={Users}
          tone="slate"
          hint={`${buyers.length} registered parties`}
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Purchase views">
        <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
          {tabs.map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-200',
                  active ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                <tab.icon className="size-4" aria-hidden />
                {tab.label}
                {tab.count != null ? (
                  <span className={cn('rounded-md px-1.5 py-0.5 text-xs', active ? 'bg-white/15' : 'bg-muted')}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeSubTab === 'transactions' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <PurchaseForm buyers={buyers} onSuccess={onUpdate} />
          </div>
          <div className="xl:col-span-2">
            <TransactionsList
              purchases={purchases}
              onUpdate={onUpdate}
              buyerFilter={selectedBuyerFilter}
              onBuyerFilterChange={setSelectedBuyerFilter}
              title="All purchase transactions"
            />
          </div>
        </div>
      )}

      {activeSubTab === 'buyers' && (
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Buyer-wise purchase summary</CardTitle>
              <CardDescription>Spending and volume by supplier.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                placeholder="Search buyer"
                className="pl-9"
                aria-label="Search buyer"
              />
            </div>
          </CardHeader>

          {filteredBuyerBreakdown.length === 0 ? (
            <EmptyState title="No buyer data" />
          ) : (
            <DataTable minWidth={860}>
              <THead>
                <tr>
                  <Th align="center">Sr</Th>
                  <Th>Buyer / supplier</Th>
                  <Th align="center">Bills</Th>
                  <Th align="center">Qty</Th>
                  <Th align="right">Purchase (₹)</Th>
                  <Th align="right">Avg / bill (₹)</Th>
                  <Th align="center">Share</Th>
                  <Th align="center">Action</Th>
                </tr>
              </THead>
              <tbody>
                {filteredBuyerBreakdown.map((b, idx) => (
                  <Tr key={b.name}>
                    <Td align="center">{idx + 1}</Td>
                    <Td className="font-semibold">{b.name}</Td>
                    <Td align="center">
                      <Badge>{b.count}</Badge>
                    </Td>
                    <Td align="center">{formatQty(b.totalQty)}</Td>
                    <Td align="right">
                      <Money value={b.totalAmount} />
                    </Td>
                    <Td align="right">
                      <Money value={b.avgBill} />
                    </Td>
                    <Td align="center">
                      <div className="flex justify-center">
                        <ProgressBar value={b.percentage} />
                      </div>
                    </Td>
                    <Td align="center">
                      <button
                        type="button"
                        onClick={() => handleFilterByBuyer(b.name)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-muted"
                      >
                        View bills <ArrowRight className="size-3.5" />
                      </button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
              <TFoot>
                <tr>
                  <Tf colSpan={2}>Grand total ({buyerBreakdown.length})</Tf>
                  <Tf align="center">{buyerBreakdown.reduce((sum, b) => sum + b.count, 0)}</Tf>
                  <Tf align="center">{formatQty(buyerBreakdown.reduce((sum, b) => sum + b.totalQty, 0))}</Tf>
                  <Tf align="right">
                    <Money value={buyerBreakdown.reduce((sum, b) => sum + b.totalAmount, 0)} className="text-white" />
                  </Tf>
                  <Tf align="right">
                    <Money value={avgBillAmount} className="text-white" />
                  </Tf>
                  <Tf align="center">100%</Tf>
                  <Tf />
                </tr>
              </TFoot>
            </DataTable>
          )}
        </Card>
      )}

      {activeSubTab === 'months' && (
        <div className="flex flex-col gap-5">
          {chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="size-4" aria-hidden />
                  </div>
                  <div>
                    <CardTitle>Monthly purchase trend</CardTitle>
                    <CardDescription>Last 12 months of spending</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="h-64 w-full px-2 pb-4 sm:h-72 sm:px-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      formatter={(value) => [formatINR(Number(value ?? 0)), 'Purchase']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: 'none' }}
                    />
                    <Bar dataKey="amount" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Month-wise breakdown</CardTitle>
              <CardDescription>Bills, quantity, and spend by month.</CardDescription>
            </CardHeader>
            {monthBreakdown.length === 0 ? (
              <EmptyState title="No monthly data" />
            ) : (
              <DataTable minWidth={720}>
                <THead>
                  <tr>
                    <Th align="center">Sr</Th>
                    <Th>Month</Th>
                    <Th align="center">Bills</Th>
                    <Th align="center">Qty</Th>
                    <Th align="right">Purchase (₹)</Th>
                    <Th align="right">Avg / bill (₹)</Th>
                    <Th align="center">Share</Th>
                  </tr>
                </THead>
                <tbody>
                  {monthBreakdown.map((m, idx) => (
                    <Tr key={m.sortKey}>
                      <Td align="center">{idx + 1}</Td>
                      <Td className="font-semibold">{m.label}</Td>
                      <Td align="center">{m.count}</Td>
                      <Td align="center">{formatQty(m.totalQty)}</Td>
                      <Td align="right">
                        <Money value={m.totalAmount} />
                      </Td>
                      <Td align="right">
                        <Money value={m.avgBill} />
                      </Td>
                      <Td align="center">
                        <div className="flex justify-center">
                          <ProgressBar value={m.percentage} />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
                <TFoot>
                  <tr>
                    <Tf colSpan={2}>Grand total ({monthBreakdown.length} months)</Tf>
                    <Tf align="center">{monthBreakdown.reduce((sum, m) => sum + m.count, 0)}</Tf>
                    <Tf align="center">{formatQty(monthBreakdown.reduce((sum, m) => sum + m.totalQty, 0))}</Tf>
                    <Tf align="right">
                      <Money value={monthBreakdown.reduce((sum, m) => sum + m.totalAmount, 0)} className="text-white" />
                    </Tf>
                    <Tf align="right">
                      <Money value={avgBillAmount} className="text-white" />
                    </Tf>
                    <Tf align="center">100%</Tf>
                  </tr>
                </TFoot>
              </DataTable>
            )}
          </Card>
        </div>
      )}

      {activeSubTab === 'items' && (
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Item-wise purchase summary</CardTitle>
              <CardDescription>Volume and cost by product description.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search item"
                className="pl-9"
                aria-label="Search item"
              />
            </div>
          </CardHeader>
          {filteredItemBreakdown.length === 0 ? (
            <EmptyState title="No item data" />
          ) : (
            <DataTable minWidth={780}>
              <THead>
                <tr>
                  <Th align="center">Sr</Th>
                  <Th>Item description</Th>
                  <Th align="center">Orders</Th>
                  <Th align="center">Qty</Th>
                  <Th align="right">Purchase (₹)</Th>
                  <Th align="right">Avg / unit (₹)</Th>
                  <Th align="center">Share</Th>
                </tr>
              </THead>
              <tbody>
                {filteredItemBreakdown.map((i, idx) => (
                  <Tr key={i.item}>
                    <Td align="center">{idx + 1}</Td>
                    <Td className="font-semibold">{i.item}</Td>
                    <Td align="center">{i.count}</Td>
                    <Td align="center">{formatQty(i.totalQty)}</Td>
                    <Td align="right">
                      <Money value={i.totalAmount} />
                    </Td>
                    <Td align="right">
                      <Money value={i.avgPrice} />
                    </Td>
                    <Td align="center">
                      <div className="flex justify-center">
                        <ProgressBar value={i.percentage} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
              <TFoot>
                <tr>
                  <Tf colSpan={2}>Grand total ({itemBreakdown.length} items)</Tf>
                  <Tf align="center">{itemBreakdown.reduce((sum, i) => sum + i.count, 0)}</Tf>
                  <Tf align="center">{formatQty(itemBreakdown.reduce((sum, i) => sum + i.totalQty, 0))}</Tf>
                  <Tf align="right">
                    <Money value={itemBreakdown.reduce((sum, i) => sum + i.totalAmount, 0)} className="text-white" />
                  </Tf>
                  <Tf align="right">
                    <Money
                      value={totalQuantity > 0 ? totalPurchasesAmount / totalQuantity : 0}
                      className="text-white"
                    />
                  </Tf>
                  <Tf align="center">100%</Tf>
                </tr>
              </TFoot>
            </DataTable>
          )}
        </Card>
      )}
    </div>
  );
}
