'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Buyer } from '@/types';
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Input, Select } from '@/components/ui';

type PurchaseFormProps = {
  buyers: Buyer[];
  onSuccess: () => void;
};

export default function PurchaseForm({ buyers, onSuccess }: PurchaseFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    buyer_name: '',
    item_description: '',
    quantity: 1,
    price: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyer_name) {
      setError('Please select a buyer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: dbError } = await supabase.from('purchases').insert([formData]);

      if (dbError) throw dbError;

      setFormData((prev) => ({ ...prev, item_description: '', quantity: 1, price: 0 }));
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase. Check if Supabase is connected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add purchase</CardTitle>
      </CardHeader>
      <CardBody>
        {error ? (
          <div role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Date" htmlFor="purchase-date">
            <Input id="purchase-date" type="date" name="date" required value={formData.date} onChange={handleChange} />
          </Field>
          <Field
            label="Supplier / buyer"
            htmlFor="purchase-buyer"
            hint={buyers.length === 0 ? 'Add a buyer in the Buyers tab first.' : undefined}
            error={buyers.length === 0 ? 'No buyers available' : undefined}
          >
            <Select
              id="purchase-buyer"
              name="buyer_name"
              required
              value={formData.buyer_name}
              onChange={handleChange}
            >
              <option value="" disabled>
                Select a buyer…
              </option>
              {buyers.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Item description" htmlFor="purchase-item">
            <Input
              id="purchase-item"
              type="text"
              name="item_description"
              required
              value={formData.item_description}
              onChange={handleChange}
              placeholder="e.g. Gold plated necklace set"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Quantity" htmlFor="purchase-qty">
              <Input
                id="purchase-qty"
                type="number"
                name="quantity"
                min={1}
                inputMode="numeric"
                required
                value={formData.quantity}
                onChange={handleChange}
              />
            </Field>
            <Field label="Total price (₹)" htmlFor="purchase-price">
              <Input
                id="purchase-price"
                type="number"
                name="price"
                min={0}
                step="0.01"
                inputMode="decimal"
                required
                value={formData.price}
                onChange={handleChange}
              />
            </Field>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Adding…' : 'Add purchase'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
