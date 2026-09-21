'use client';

import { ReceivedPayment } from '@/types';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Money,
  Select,
  StatCard,
  TableWrap,
} from '@/components/ui';
import { formatINR } from '@/lib/format';
import { HandCoins, Package, Store, Wallet } from 'lucide-react';

type ReceivedPaymentsProps = {
  receivedPayments: ReceivedPayment[];
  onUpdate: () => void;
};

const PLATFORMS = ['Meesho', 'Flipkart', 'Amazon', 'Other'] as const;
type Platform = (typeof PLATFORMS)[number];

function asPlatform(value: string): Platform {
  return (PLATFORMS as readonly string[]).includes(value) ? (value as Platform) : 'Other';
}

export default function ReceivedPayments({ receivedPayments, onUpdate }: ReceivedPaymentsProps) {
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    platform: 'Meesho',
    amount: 0,
  });

  const stats = useMemo(() => {
    const data: Record<Platform, number> = { Meesho: 0, Flipkart: 0, Amazon: 0, Other: 0 };
    receivedPayments.forEach((p) => {
      data[asPlatform(p.platform)] += p.amount;
    });
    return data;
  }, [receivedPayments]);

  const totalReceived = stats.Meesho + stats.Flipkart + stats.Amazon + stats.Other;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('received_payments').insert([formData]);
      if (error) throw error;
      setFormData((prev) => ({ ...prev, amount: 0 }));
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to save received amount');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this received amount?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('received_payments').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to delete received amount');
    } finally {
      setDeletingId(null);
    }
  };

  const platformTone = (platform: string) => {
    const key = asPlatform(platform);
    if (key === 'Meesho') return 'red' as const;
    if (key === 'Flipkart') return 'amber' as const;
    if (key === 'Amazon') return 'navy' as const;
    return 'slate' as const;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Meesho received" value={formatINR(stats.Meesho)} icon={Store} tone="red" />
        <StatCard label="Flipkart received" value={formatINR(stats.Flipkart)} icon={HandCoins} tone="amber" />
        <StatCard label="Amazon received" value={formatINR(stats.Amazon)} icon={Package} tone="navy" />
        <StatCard label="Other received" value={formatINR(stats.Other)} icon={Wallet} tone="slate" />
        <StatCard label="Total received" value={formatINR(totalReceived)} icon={Wallet} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Save received amount</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Date" htmlFor="received-date">
                <Input
                  id="received-date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </Field>
              <Field label="Received from" htmlFor="received-platform">
                <Select
                  id="received-platform"
                  required
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                >
                  <option value="Meesho">Meesho</option>
                  <option value="Flipkart">Flipkart</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Received amount (₹)" htmlFor="received-amount">
                <Input
                  id="received-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </Field>
              <Button type="submit" disabled={loading || formData.amount <= 0} className="w-full">
                {loading ? 'Saving…' : 'Save received amount'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Received history</CardTitle>
          </CardHeader>
          <div className="md:hidden divide-y divide-border">
            {receivedPayments.length === 0 ? (
              <EmptyState
                title="No received amounts yet"
                description="Save money received from Meesho, Flipkart, Amazon, or other platforms."
              />
            ) : (
              receivedPayments.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <Badge tone={platformTone(p.platform)}>{p.platform}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">{p.date}</p>
                  </div>
                  <div className="text-right">
                    <Money value={p.amount} className="text-sm font-semibold text-emerald-700" />
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="mt-1 block text-xs font-semibold text-destructive disabled:opacity-50"
                    >
                      {deletingId === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden md:block">
            <TableWrap>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/70 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Received from</th>
                    <th className="px-5 py-3 text-right font-semibold">Received amount</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receivedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState title="No received amounts yet" />
                      </td>
                    </tr>
                  ) : (
                    receivedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                        <td className="px-5 py-3">
                          <Badge tone={platformTone(p.platform)}>{p.platform}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                          <Money value={p.amount} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === p.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </Card>
      </div>
    </div>
  );
}
