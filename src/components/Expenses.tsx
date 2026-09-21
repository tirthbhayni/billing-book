'use client';

import { Expense } from '@/types';
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
import { Receipt } from 'lucide-react';

type ExpensesProps = {
  expenses: Expense[];
  onUpdate: () => void;
};

export default function Expenses({ expenses, onUpdate }: ExpensesProps) {
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Packaging',
    description: '',
    amount: 0,
  });

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert([formData]);
      if (error) throw error;
      setFormData((prev) => ({ ...prev, description: '', amount: 0 }));
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total operating expenses" value={formatINR(totalExpenses)} icon={Receipt} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Record expense</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Date" htmlFor="exp-date">
                <Input
                  id="exp-date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </Field>
              <Field label="Category" htmlFor="exp-category">
                <Select
                  id="exp-category"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Packaging">Packaging (boxes, polythene)</option>
                  <option value="Shipping">Shipping / courier</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Description" htmlFor="exp-desc">
                <Input
                  id="exp-desc"
                  type="text"
                  required
                  placeholder="e.g. 100 corrugated boxes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Field>
              <Field label="Amount (₹)" htmlFor="exp-amount">
                <Input
                  id="exp-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />
              </Field>
              <Button type="submit" disabled={loading || formData.amount <= 0} className="w-full">
                {loading ? 'Saving…' : 'Save expense'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expense history</CardTitle>
          </CardHeader>
          <div className="md:hidden divide-y divide-border">
            {expenses.length === 0 ? (
              <EmptyState title="No expenses yet" description="Record packaging, shipping, or other costs." />
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="flex flex-col gap-2 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone={e.category === 'Packaging' ? 'amber' : 'slate'}>{e.category}</Badge>
                      <p className="mt-2 text-sm text-foreground">{e.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{e.date}</p>
                    </div>
                    <Money value={e.amount} className="shrink-0 text-sm font-semibold text-red-600" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.id)}
                    disabled={deletingId === e.id}
                    className="self-start text-xs font-semibold text-destructive disabled:opacity-50"
                  >
                    {deletingId === e.id ? 'Deleting…' : 'Delete'}
                  </button>
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
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No expenses yet" />
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{e.date}</td>
                        <td className="px-5 py-3">
                          <Badge tone={e.category === 'Packaging' ? 'amber' : 'slate'}>{e.category}</Badge>
                        </td>
                        <td className="max-w-xs truncate px-5 py-3">{e.description}</td>
                        <td className="px-5 py-3 text-right font-semibold text-red-600">
                          <Money value={e.amount} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === e.id ? 'Deleting…' : 'Delete'}
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
