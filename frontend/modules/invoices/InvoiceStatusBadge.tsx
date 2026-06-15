'use client';

import { InvoiceStatus } from '@/types/invoice';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-700',
  SENT:      'bg-blue-100 text-blue-700',
  PAID:      'bg-green-100 text-green-700',
  OVERDUE:   'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
};

export default function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
