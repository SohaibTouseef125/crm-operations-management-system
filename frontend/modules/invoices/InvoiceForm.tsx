'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import LineItemsEditor from './LineItemsEditor';
import { InvoiceFormData, InvoiceItemFormData, DEFAULT_PAYMENT_TERMS, DEFAULT_BANK_DETAILS } from '@/types/invoice';

interface Client { id: string; name: string; company_name: string; }

interface Props {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}

export default function InvoiceForm({ initialData, onSubmit, submitLabel = 'Create Invoice', disabled = false }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItemFormData[]>(initialData?.items || []);

  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    client_id: initialData?.client_id || '',
    invoice_date: initialData?.invoice_date || today,
    due_date: initialData?.due_date || defaultDue,
    status: initialData?.status || 'DRAFT',
    tax_percentage: initialData?.tax_percentage ?? 15,
    payment_terms: initialData?.payment_terms || DEFAULT_PAYMENT_TERMS,
    bank_details: initialData?.bank_details || DEFAULT_BANK_DETAILS,
    notes: initialData?.notes || '',
  });

  // Live calculation
  const subtotal = items.reduce((sum, i) => sum + (Number(i.unit_price) || 0), 0);
  const taxAmount = Math.round(subtotal * (form.tax_percentage / 100) * 100) / 100;
  const totalAmount = subtotal + taxAmount;

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { toast.warning('Please select a client'); return; }
    setLoading(true);
    try {
      await onSubmit({ ...form, items });
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save invoice'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none ${disabled ? 'bg-gray-50 text-gray-500' : ''}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client & Dates */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <select
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            disabled={disabled}
            className={inputClass}
          >
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
          <input type="date" value={form.invoice_date}
            onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))}
            disabled={disabled} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
          <input type="date" value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            disabled={disabled} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            disabled={disabled} className={inputClass}>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Tax */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Percentage (%)</label>
          <input type="number" min="0" max="100" step="0.01"
            value={form.tax_percentage}
            onChange={e => setForm(f => ({ ...f, tax_percentage: parseFloat(e.target.value) || 0 }))}
            disabled={disabled} className={inputClass} />
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Line Items</h3>
        <LineItemsEditor items={items} onChange={setItems} disabled={disabled} />

        {/* Totals summary */}
        {items.length > 0 && (
          <div className="mt-4 ml-auto max-w-xs space-y-1.5 border-t pt-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-bold">PKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sales Tax ({form.tax_percentage}%)</span>
              <span className="font-bold">PKR {taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 border-t pt-1.5">
              <span>Total</span>
              <span>PKR {totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Terms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
        <textarea value={form.payment_terms}
          onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
          disabled={disabled} rows={2}
          className={`${inputClass} resize-none`} />
      </div>

      {/* Bank Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bank Details</label>
        <textarea value={form.bank_details}
          onChange={e => setForm(f => ({ ...f, bank_details: e.target.value }))}
          disabled={disabled} rows={2}
          className={`${inputClass} resize-none`} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          disabled={disabled} rows={3}
          placeholder="Additional notes..."
          className={`${inputClass} resize-none`} />
      </div>

      {!disabled && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
