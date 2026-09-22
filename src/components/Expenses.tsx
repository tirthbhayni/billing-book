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
  DataTable,
  EmptyState,
  Field,
  Input,
  Money,
  Select,
  StatCard,
  TFoot,
  THead,
  Td,
  Tf,
  Th,
  Tr,
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
            <CardTitle>Expense register</CardTitle>
          </CardHeader>
          {expenses.length === 0 ? (
            <EmptyState title="No expenses yet" description="Record packaging, shipping, or other costs." />
          ) : (
            <DataTable minWidth={680}>
              <THead>
                <tr>
                  <Th align="center">Sr</Th>
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th align="right">Amount (₹)</Th>
                  <Th align="center">Action</Th>
                </tr>
              </THead>
              <tbody>
                {expenses.map((e, idx) => (
                  <Tr key={e.id}>
                    <Td align="center">{idx + 1}</Td>
                    <Td>{e.date}</Td>
                    <Td>
                      <Badge tone={e.category === 'Packaging' ? 'amber' : 'slate'}>{e.category}</Badge>
                    </Td>
                    <Td className="max-w-xs truncate">{e.description}</Td>
                    <Td align="right" className="font-semibold text-red-600">
                      <Money value={e.amount} />
                    </Td>
                    <Td align="center">
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === e.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
              <TFoot>
                <tr>
                  <Tf colSpan={4}>Total ({expenses.length} expenses)</Tf>
                  <Tf align="right">
                    <Money value={totalExpenses} className="text-white" />
                  </Tf>
                  <Tf />
                </tr>
              </TFoot>
            </DataTable>
          )}
        </Card>
      </div>
    </div>
  );
}
