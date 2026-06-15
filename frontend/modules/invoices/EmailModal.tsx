'use client';

import { useState } from 'react';
import { XCircle, Send, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailModal({ invoiceId, invoiceNumber, isOpen, onClose, onSuccess }: Props) {
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [subject, setSubject] = useState(`Invoice #${invoiceNumber} from Crop2X`);
  const [message, setMessage] = useState(
    `Dear Client,\n\nPlease find attached Invoice #${invoiceNumber}.\n\nThank you for your business.\n\nBest regards,\nCrop2X (Private) Limited`
  );
  const [loading, setLoading] = useState(false);

  const addRecipient = () => setRecipients([...recipients, '']);
  const removeRecipient = (idx: number) => setRecipients(recipients.filter((_, i) => i !== idx));
  const updateRecipient = (idx: number, val: string) => {
    setRecipients(recipients.map((r, i) => (i === idx ? val : r)));
  };

  const handleSend = async () => {
    const validRecipients = recipients.filter(r => r.trim() && r.includes('@'));
    if (validRecipients.length === 0) {
      toast.warning('Please enter at least one valid email address');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/billing/invoices/${invoiceId}/send`, {
        recipients: validRecipients,
        subject,
        message,
      });
      toast.success(`Invoice sent to ${validRecipients.join(', ')}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to send invoice'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900">Send Invoice #{invoiceNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipients *</label>
            {recipients.map((email, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => updateRecipient(idx, e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRecipient}
              className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add CC
            </button>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
