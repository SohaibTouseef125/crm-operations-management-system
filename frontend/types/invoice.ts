export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  serial_number: number;
  item_name: string;
  description: string | null;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRecipient {
  id: string;
  invoice_id: string;
  email: string;
  created_at: string;
}

export interface InvoiceDetail {
  id: string;
  invoice_number: string | null;
  client_id: string;
  amount: number;
  status: InvoiceStatus;
  file_path: string | null;
  due_date: string;
  invoice_date: string | null;
  subtotal: number | null;
  tax_percentage: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  payment_terms: string | null;
  bank_details: string | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  items: InvoiceItem[];
}

export interface PaginatedInvoices {
  total: number;
  page: number;
  page_size: number;
  items: InvoiceDetail[];
}

export interface InvoiceItemFormData {
  item_name: string;
  description: string;
  unit_price: number;
}

export interface InvoiceFormData {
  client_id: string;
  invoice_date: string;
  due_date: string;
  tax_percentage: number;
  payment_terms: string;
  bank_details: string;
  notes: string;
  items: InvoiceItemFormData[];
}

export interface InvoiceSendPayload {
  recipients: string[];
  subject?: string;
  message?: string;
}

export const DEFAULT_PAYMENT_TERMS =
  'Payment can be made in the form of Cheque to the favour of Crop2X Pvt Ltd. The Quotation is valid for 30 days.';

export const DEFAULT_BANK_DETAILS =
  'Meezan Bank, Title: Crop2X (Private) Limited, Account no: 9952-0105470950, IBAN: PK14MEZN0099520105470950';
