'use client';

import { Purchase } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo, useEffect } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Search, X } from 'lucide-react';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  FilterChip,
  Input,
  Money,
  Select,
  TFoot,
  THead,
  Td,
  Tf,
  Th,
  Tr,
} from '@/components/ui';
import { formatNumber } from '@/lib/format';

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
      </CardHeader>

      {filteredPurchases.length === 0 ? (
        <EmptyState title="No purchases found" description="Try a different date range, buyer, or search term." />
      ) : (
        <DataTable minWidth={760}>
          <THead>
            <tr>
              <Th align="center">Sr</Th>
              <Th>Date</Th>
              <Th>Buyer / supplier</Th>
              <Th>Item description</Th>
              <Th align="center">Qty</Th>
              <Th align="right">Amount (₹)</Th>
              <Th align="center">Action</Th>
            </tr>
          </THead>
          <tbody>
            {filteredPurchases.map((p, idx) => (
              <Tr key={p.id}>
                <Td align="center">{idx + 1}</Td>
                <Td>{p.date}</Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => setBuyerFilter(p.buyer_name)}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {p.buyer_name}
                  </button>
                </Td>
                <Td className="max-w-xs truncate">{p.item_description}</Td>
                <Td align="center">{p.quantity}</Td>
                <Td align="right">
                  <Money value={p.price} />
                </Td>
                <Td align="center">
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={loadingId === p.id}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-red-50 disabled:opacity-50"
                  >
                    {loadingId === p.id ? 'Deleting…' : 'Delete'}
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
          <TFoot>
            <tr>
              <Tf colSpan={4}>Total ({filteredPurchases.length} bills)</Tf>
              <Tf align="center">{formatNumber(totalQty)}</Tf>
              <Tf align="right">
                <Money value={totalAmount} className="text-white" />
              </Tf>
              <Tf />
            </tr>
          </TFoot>
        </DataTable>
      )}
    </Card>
  );
}
