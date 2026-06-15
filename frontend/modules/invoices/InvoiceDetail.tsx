'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Download, Send, Edit, Trash2, CreditCard,
  AlertCircle, Calendar, FileText, Eye
} from 'lucide-react';
import api from '@/services/api/axios';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import EmailModal from './EmailModal';
import { InvoiceDetail as InvoiceDetailType } from '@/types/invoice';

interface Client {
  id: string;
  name: string;
  company_name: string;
  address: string | null;
  contact_info: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
}

interface Props {
  invoice: InvoiceDetailType;
  client: Client | null;
  payments: Payment[];
  onRefresh: () => void;
}

export default function InvoiceDetail({ invoice, client, payments, onRefresh }: Props) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [emailOpen, setEmailOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const canEdit   = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);
  const canDelete = user && ['ADMIN', 'MANAGER'].includes(user.role);
  const canSend   = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);
  const canPay    = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);

  const isEditable   = invoice.status === 'DRAFT';
  const canRecordPay = ['SENT', 'OVERDUE'].includes(invoice.status);
  const isOverdue    = invoice.status === 'OVERDUE';

  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;

  // ── PDF handlers ───────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${invoice.id}/pdf`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to generate PDF'));
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${invoice.id}/pdf`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to generate PDF preview'));
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/billing/invoices/${invoice.id}`);
      toast.success('Invoice deleted');
      router.push('/billing/invoices');
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete invoice'));
    }
  };

  const subtotal     = Number(invoice.subtotal || invoice.amount || 0);
  const taxPct       = Number(invoice.tax_percentage || 0);
  const taxAmount    = Number(invoice.tax_amount || 0);
  const totalAmount  = Number(invoice.total_amount || invoice.amount || 0);

  return (
    <>
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900">{invoiceNumber}</h1>
          <InvoiceStatusBadge status={invoice.status} />
          {isOverdue && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Preview PDF */}
          <button onClick={handlePreviewPDF} disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>

          {/* Download PDF */}
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>

          {/* Send Email */}
          {canSend && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
            <button onClick={() => setEmailOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
              <Send className="w-3.5 h-3.5" /> Send Email
            </button>
          )}

          {/* Record Payment */}
          {canPay && canRecordPay && (
            <Link href={`/billing?record_payment=${invoice.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </Link>
          )}

          {/* Edit */}
          {canEdit && isEditable && (
            <Link href={`/billing/invoices/${invoice.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors">
              <Edit className="w-3.5 h-3.5" /> Edit
            </Link>
          )}

          {/* Delete */}
          {canDelete && invoice.status !== 'PAID' && (
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Invoice meta */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Invoice Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Invoice #</dt>
                <dd className="font-bold text-gray-900">{invoiceNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Invoice Date</dt>
                <dd className="text-gray-700">
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div className={`flex justify-between ${isOverdue ? 'text-red-600' : ''}`}>
                <dt className={isOverdue ? 'text-red-500' : 'text-gray-500'}>Due Date</dt>
                <dd className="font-bold">{new Date(invoice.due_date).toLocaleDateString()}</dd>
              </div>
              {invoice.sent_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sent At</dt>
                  <dd className="text-gray-700">{new Date(invoice.sent_at).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Client info */}
          {client && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Prepared For</h3>
              <p className="font-bold text-gray-900">{client.company_name}</p>
              <p className="text-sm text-gray-600 mt-1">{client.name}</p>
              {client.address && <p className="text-sm text-gray-500 mt-1">{client.address}</p>}
              {client.contact_info && <p className="text-sm text-gray-500">{client.contact_info}</p>}
            </div>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Payments Received</h3>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{new Date(p.payment_date).toLocaleDateString()}</span>
                    <span className="font-bold text-green-700">PKR {Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column (main content) ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Line items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-bold text-gray-700">Services / Items</h3>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-500 uppercase w-10">S.No</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Item</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">Price (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoice.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400 italic">
                      No line items. {isEditable && <Link href={`/billing/invoices/${invoice.id}/edit`} className="text-blue-600 hover:underline">Add items →</Link>}
                    </td>
                  </tr>
                ) : (
                  invoice.items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-500">{item.serial_number}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{item.item_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{item.description || '—'}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                        {Number(item.unit_price).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="px-5 py-4 border-t bg-gray-50">
              <div className="ml-auto max-w-xs space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold">PKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sales Tax ({taxPct}%)</span>
                  <span className="font-bold">PKR {taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t">
                  <span>Total Budget (incl. Sales Tax)</span>
                  <span>PKR {totalAmount.toLocaleString()} /-</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Bank */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoice.payment_terms && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-blue-700 uppercase mb-2">Terms & Conditions</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{invoice.payment_terms}</p>
              </div>
            )}
            {invoice.bank_details && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-green-700 uppercase mb-2">Crop2X Account Details</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{invoice.bank_details}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Notes</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      <EmailModal
        invoiceId={invoice.id}
        invoiceNumber={invoiceNumber}
        isOpen={emailOpen}
        onClose={() => setEmailOpen(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}
