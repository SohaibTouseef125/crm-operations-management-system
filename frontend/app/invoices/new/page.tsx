'use client';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import InvoiceForm from '@/modules/invoices/InvoiceForm';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { InvoiceFormData } from '@/types/invoice';

export default function NewInvoicePage() {
  const router = useRouter();

  const handleCreate = async (data: InvoiceFormData) => {
    const payload = {
      client_id: data.client_id,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      tax_percentage: data.tax_percentage,
      payment_terms: data.payment_terms,
      bank_details: data.bank_details,
      notes: data.notes,
      items: data.items.filter(i => i.item_name.trim()).map((item, idx) => ({
        item_name: item.item_name,
        description: item.description || null,
        unit_price: item.unit_price,
        serial_number: idx + 1,
      })),
    };

    try {
      const res = await api.post('/invoices', payload);
      toast.success(`Invoice ${res.data.invoice_number} created`);
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      throw err;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTS']}>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <InvoiceForm onSubmit={handleCreate} submitLabel="Create Invoice" />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
