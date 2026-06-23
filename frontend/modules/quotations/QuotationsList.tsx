'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { FileText, Plus, ArrowRight, Trash2, XCircle, Mail, Download, Copy, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth/useAuthStore';

interface Quotation {
  id: string;
  client_id: string;
  client_name: string | null;
  quote_number: string;
  date: string;
  expiry_date: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount: number;
  grand_total: number;
  terms_and_conditions: string | null;
  notes: string | null;
  status?: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  company_name: string;
}

interface FormItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function QuotationsList() {
  const { user } = useAuthStore();
  const canWrite = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);
  const canEmail = user && ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role);
  const canDelete = user && ['ADMIN'].includes(user.role);
  const canConvert = user && ['ADMIN', 'ACCOUNTS'].includes(user.role);
  const canApprove = user && ['ADMIN'].includes(user.role);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_id: '', expiry_date: '', discount: 0, tax_percentage: 15, notes: '', terms_and_conditions: '' });
  const [items, setItems] = useState<FormItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);

  const [emailModal, setEmailModal] = useState<{ open: boolean; id: string; quote_number: string }>({ open: false, id: '', quote_number: '' });
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch { toast.error('Failed to load quotations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuotations(); }, []);

  useEffect(() => {
    if (showForm) {
      api.get('/clients').then(r => setClients(r.data)).catch(() => {});
    }
  }, [showForm]);

  const handleConvert = async (id: string) => {
    try {
      await api.post(`/quotations/${id}/convert-to-invoice`);
      toast.success('Converted to invoice');
      fetchQuotations();
    } catch { toast.error('Failed to convert'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quotation?')) return;
    try {
      await api.delete(`/quotations/${id}`);
      toast.success('Deleted');
      fetchQuotations();
    } catch { toast.error('Failed to delete'); }
  };

  const handleEmailOpen = (id: string, quote_number: string) => {
    setEmailModal({ open: true, id, quote_number });
    setEmailRecipients('');
    setEmailSubject('');
    setEmailMessage('');
  };

  const handleEmailSend = async () => {
    if (!emailRecipients.trim()) { toast.error('At least one recipient is required'); return; }
    try {
      await api.post(`/quotations/${emailModal.id}/email`, {
        recipients: emailRecipients.split(',').map(r => r.trim()).filter(Boolean),
        subject: emailSubject,
        message: emailMessage,
      });
      toast.success('Email sent');
      setEmailModal({ open: false, id: '', quote_number: '' });
    } catch { toast.error('Failed to send email'); }
  };

  const handleDownloadPdf = async (id: string, quote_number: string) => {
    try {
      const res = await api.post(`/quotations/${id}/pdf`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation_${quote_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/quotations/${id}/approve`);
      toast.success('Quotation approved');
      fetchQuotations();
    } catch { toast.error('Failed to approve'); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/quotations/${id}/duplicate`);
      toast.success('Duplicated');
      fetchQuotations();
    } catch { toast.error('Failed to duplicate'); }
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof FormItem, value: string | number) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const handleCreate = async () => {
    if (!form.client_id || !form.expiry_date) { toast.error('Client and expiry date are required'); return; }
    setSaving(true);
    try {
      await api.post('/quotations', {
        client_id: form.client_id,
        expiry_date: form.expiry_date,
        discount: form.discount || 0,
        tax_percentage: form.tax_percentage || 0,
        notes: form.notes || undefined,
        terms_and_conditions: form.terms_and_conditions || undefined,
        items: items.filter(i => i.description).map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success('Quotation created');
      setShowForm(false);
      setForm({ client_id: '', expiry_date: '', discount: 0, tax_percentage: 15, notes: '', terms_and_conditions: '' });
      setItems([{ description: '', quantity: 1, unit_price: 0 }]);
      fetchQuotations();
    } catch { toast.error('Failed to create'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</p>
          {canWrite && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors shadow-sm">
              <Plus size={18} /> New Quotation
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">New Quotation</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select a client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-20 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <input type="number" step="0.01" placeholder="Price" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-28 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-600"><XCircle size={18} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {(() => {
                const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
                const taxAmount = subtotal * (form.tax_percentage || 0) / 100;
                const grandTotal = subtotal + taxAmount - (form.discount || 0);
                return (
                  <div className="flex justify-end">
                    <div className="bg-gray-50 rounded-lg p-4 w-72 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>Rs. {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tax ({form.tax_percentage || 0}%)</span>
                        <span>Rs. {taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Discount</span>
                        <span>- Rs. {(form.discount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-900 font-bold text-base pt-2 border-t border-gray-200">
                        <span>Grand Total</span>
                        <span>Rs. {grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <input type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                  <input type="number" step="0.01" value={form.tax_percentage} onChange={e => setForm({ ...form, tax_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <textarea rows={3} value={form.terms_and_conditions} onChange={e => setForm({ ...form, terms_and_conditions: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm transition-colors">
                  {saving ? 'Creating...' : 'Create Quotation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Email Quotation</h2>
              <button onClick={() => setEmailModal({ open: false, id: '', quote_number: '' })} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Sending: <span className="font-medium text-gray-700">{emailModal.quote_number}</span></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients *</label>
                <input value={emailRecipients} onChange={e => setEmailRecipients(e.target.value)} placeholder="email1@example.com, email2@example.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Quotation"
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea rows={3} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} placeholder="Optional message..."
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEmailModal({ open: false, id: '', quote_number: '' })} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button onClick={handleEmailSend} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors">Send Email</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : quotations.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <FileText size={56} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No quotations yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first quotation to get started</p>
          {canWrite && (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors">
              <Plus size={18} /> New Quotation
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {quotations.map(q => (
            <div key={q.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{q.quote_number}</p>
                      <p className="text-sm text-gray-500">{q.client_name || 'Client #' + q.client_id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">Rs. {q.grand_total?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Expires: {q.expiry_date}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Date: {q.date}</span>
                  <div className="flex gap-2 flex-wrap">
                    {canEmail && (
                    <button onClick={() => handleEmailOpen(q.id, q.quote_number)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 text-sm font-medium transition-colors">
                      <Mail size={14} /> Email
                    </button>
                    )}
                    <button onClick={() => handleDownloadPdf(q.id, q.quote_number)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 text-sm font-medium transition-colors">
                      <Download size={14} /> PDF
                    </button>
                    {canWrite && (
                      <button onClick={() => handleDuplicate(q.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 text-sm font-medium transition-colors">
                        <Copy size={14} /> Duplicate
                      </button>
                    )}
                    {canApprove && q.status === 'DRAFT' && (
                      <button onClick={() => handleApprove(q.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 text-sm font-medium transition-colors">
                        <CheckCircle size={14} /> Approve
                      </button>
                    )}
                    {canConvert && (
                      <button onClick={() => handleConvert(q.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-sm font-medium transition-colors">
                        <ArrowRight size={14} /> Convert to Invoice
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(q.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-sm font-medium transition-colors">
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
