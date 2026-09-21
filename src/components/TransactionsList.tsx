'use client';

import { Purchase } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo, useEffect } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Search, X } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FilterChip,
  Input,
  Money,
  Select,
  TableWrap,
} from '@/components/ui';
import { formatINR, formatNumber } from '@/lib/format';

type TransactionsListProps = {
  purchases: Purchase[];
  onUpdate: () => void;
  buyerFilter?: string;
  onBuyerFilterChange?: (buyer: string) => void;
  title?: string;
};

export default function TransactionsList({
  purchases,
  onUpdate,
  buyerFilter: controlledBuyerFilter,
  onBuyerFilterChange,
  title = 'Recent purchases',
}: TransactionsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalBuyerFilter, setInternalBuyerFilter] = useState('');

  const activeBuyerFilter = controlledBuyerFilter !== undefined ? controlledBuyerFilter : internalBuyerFilter;
  const setBuyerFilter = (val: string) => {
    if (onBuyerFilterChange) {
      onBuyerFilterChange(val);
    } else {
      setInternalBuyerFilter(val);
    }
  };

  useEffect(() => {
    if (controlledBuyerFilter !== undefined) {
      setInternalBuyerFilter(controlledBuyerFilter);
    }
  }, [controlledBuyerFilter]);

  const uniqueBuyers = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => {
      if (p.buyer_name) set.add(p.buyer_name);
    });
    return Array.from(set).sort();
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    let list = purchases;

    if (dateFilter !== 'all') {
      const today = new Date();
      let start: Date;
      let end: Date;

      if (dateFilter === 'week') {
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
      } else if (dateFilter === 'month') {
        start = startOfMonth(today);
        end = endOfMonth(today);
      } else if (customStart && customEnd) {
        start = startOfDay(parseISO(customStart));
        end = endOfDay(parseISO(customEnd));
      } else {
        start = new Date(0);
        end = new Date(8640000000000000);
      }

      if (dateFilter !== 'custom' || (customStart && customEnd)) {
        list = list.filter((p) => {
          const d = parseISO(p.date);
          return isWithinInterval(d, { start, end });
        });
      }
    }

    if (activeBuyerFilter) {
      list = list.filter((p) => p.buyer_name.toLowerCase() === activeBuyerFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.buyer_name && p.buyer_name.toLowerCase().includes(q)) ||
          (p.item_description && p.item_description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [purchases, dateFilter, customStart, customEnd, activeBuyerFilter, searchQuery]);

  const { totalQty, totalAmount } = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, p) => ({
        totalQty: acc.totalQty + (Number(p.quantity) || 0),
        totalAmount: acc.totalAmount + (Number(p.price) || 0),
      }),
      { totalQty: 0, totalAmount: 0 }
    );
  }, [filteredPurchases]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase?')) return;

    setLoadingId(id);
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to delete purchase.');
    } finally {
      setLoadingId(null);
    }
  };

  const hasActiveFilters = dateFilter !== 'all' || activeBuyerFilter !== '' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setDateFilter('all');
    setCustomStart('');
    setCustomEnd('');
    setSearchQuery('');
    setBuyerFilter('');
  };

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Showing {filteredPurchases.length} of {purchases.length} records
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'week', 'month', 'custom'] as const).map((f) => (
              <FilterChip key={f} active={dateFilter === f} onClick={() => setDateFilter(f)}>
                {f === 'all' ? 'All time' : f === 'week' ? 'This week' : f === 'month' ? 'This month' : 'Custom'}
              </FilterChip>
            ))}
          </div>
        </div>

        {dateFilter === 'custom' ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} aria-label="Start date" />
            <span className="hidden text-sm text-muted-foreground sm:inline">to</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} aria-label="End date" />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search buyer or item"
              className="pl-9 pr-10"
              aria-label="Search purchases"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <Select
            value={activeBuyerFilter}
            onChange={(e) => setBuyerFilter(e.target.value)}
            className="sm:w-52"
            aria-label="Filter by buyer"
          >
            <option value="">All buyers</option>
            {uniqueBuyers.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" onClick={clearAllFilters} className="sm:w-auto">
              Reset
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-semibold">{filteredPurchases.length}</span> purchases in view
          </span>
          <span className="font-medium">
            {formatNumber(totalQty)} units · <Money value={totalAmount} className="font-semibold" />
          </span>
        </div>
      </CardHeader>

      <div className="md:hidden">
        {filteredPurchases.length === 0 ? (
          <EmptyState title="No purchases found" description="Try a different date range, buyer, or search term." />
        ) : (
          <ul className="divide-y divide-border">
            {filteredPurchases.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setBuyerFilter(p.buyer_name)}
                      className="truncate text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {p.buyer_name}
                    </button>
                    <p className="mt-0.5 text-sm text-muted-foreground">{p.item_description}</p>
                  </div>
                  <Money value={p.price} className="shrink-0 text-sm font-semibold" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {p.date} · {p.quantity} qty
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={loadingId === p.id}
                    className="min-h-9 px-2 font-semibold text-destructive disabled:opacity-50"
                  >
                    {loadingId === p.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/70 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Buyer</th>
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-5 py-3 text-center font-semibold">Qty</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No purchases found" description="Try a different date range, buyer, or search term." />
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{p.date}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setBuyerFilter(p.buyer_name)}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {p.buyer_name}
                      </button>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">{p.item_description}</td>
                    <td className="px-5 py-3 text-center font-medium tabular-nums">{p.quantity}</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      <Money value={p.price} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={loadingId === p.id}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-red-50 disabled:opacity-50"
                      >
                        {loadingId === p.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredPurchases.length > 0 ? (
              <tfoot className="border-t border-border bg-muted/70 text-sm font-semibold">
                <tr>
                  <td colSpan={3} className="px-5 py-3">
                    Total ({filteredPurchases.length} records)
                  </td>
                  <td className="px-5 py-3 text-center tabular-nums">{formatNumber(totalQty)}</td>
                  <td className="px-5 py-3 text-right">
                    <Money value={totalAmount} />
                  </td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </TableWrap>
      </div>

      {filteredPurchases.length > 0 ? (
        <CardBody className="border-t border-border py-3 md:hidden">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span>
              {formatNumber(totalQty)} · {formatINR(totalAmount)}
            </span>
          </div>
        </CardBody>
      ) : null}
    </Card>
  );
}
