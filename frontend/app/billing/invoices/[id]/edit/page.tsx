'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import InvoiceForm from '@/modules/invoices/InvoiceForm';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { InvoiceDetail, InvoiceFormData } from '@/types/invoice';

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/billing/invoices/${id}`)
      .then(res => setInvoice(res.data))
      .catch(err => {
        toast.error(formatApiError(err, 'Failed to load invoice'));
        router.push('/billing/invoices');
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleUpdate = async (data: InvoiceFormData) => {
    if (!invoice) return;

    // Update invoice metadata
    await api.patch(`/billing/invoices/${invoice.id}`, {
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      tax_percentage: data.tax_percentage,
      payment_terms: data.payment_terms,
      bank_details: data.bank_details,
      notes: data.notes,
    });

    // Sync line items: delete all existing, re-add new ones
    const existingItems = invoice.items || [];
    for (const item of existingItems) {
      await api.delete(`/billing/invoices/${invoice.id}/items/${item.id}`);
    }
    for (let idx = 0; idx < data.items.length; idx++) {
      const item = data.items[idx];
      if (!item.item_name.trim()) continue;
      await api.post(`/billing/invoices/${invoice.id}/items`, {
        item_name: item.item_name,
        description: item.description || null,
        unit_price: item.unit_price,
        serial_number: idx + 1,
      });
    }

    toast.success('Invoice updated successfully');
    router.push(`/billing/invoices/${invoice.id}`);
  };

  const isDraft = invoice?.status === 'DRAFT';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTS']}>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Invoice {invoice?.invoice_number || ''}
            </h1>
            {!isDraft && (
              <span className="text-sm bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">
                Read-only — {invoice?.status}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-gray-400">Loading...</div>
          ) : invoice ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {!isDraft && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium">
                  This invoice is in <strong>{invoice.status}</strong> status and cannot be edited.
                </div>
              )}
              <InvoiceForm
                initialData={{
                  client_id: invoice.client_id,
                  invoice_date: invoice.invoice_date || '',
                  due_date: invoice.due_date,
                  tax_percentage: Number(invoice.tax_percentage || 15),
                  payment_terms: invoice.payment_terms || '',
                  bank_details: invoice.bank_details || '',
                  notes: invoice.notes || '',
                  items: (invoice.items || []).map(i => ({
                    item_name: i.item_name,
                    description: i.description || '',
                    unit_price: Number(i.unit_price),
                  })),
                }}
                onSubmit={handleUpdate}
                submitLabel="Save Changes"
                disabled={!isDraft}
              />
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
