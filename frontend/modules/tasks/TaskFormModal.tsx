'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';

const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigned_to_id: z.string().min(1, 'Assignee is required'),
  client_id: z.string().optional().nullable(),
  quotation_id: z.string().optional().nullable(),
  invoice_id: z.string().optional().nullable(),
  payment_followup_id: z.string().optional().nullable(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskId?: string;
  initialData?: Partial<TaskFormData>;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  onSuccess,
  taskId,
  initialData,
}: TaskFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [quotations, setQuotations] = useState<{ id: string; quote_number?: string }[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; title?: string; invoice_number?: string }[]>([]);
  const [payments, setPayments] = useState<{ id: string; amount: number; invoice_id: string; payment_date: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchClients();
      fetchQuotations();
      fetchInvoices();
      fetchPayments();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load users'));
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load clients'));
    }
  };

  const fetchQuotations = async () => {
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load quotations'));
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(Array.isArray(res.data) ? res.data : (res.data?.items ?? []));
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load invoices'));
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get('/billing/payments');
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load payments'));
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: 'PENDING', priority: 'MEDIUM', ...initialData },
  });

  const onSubmit = async (data: TaskFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (taskId) {
        await api.patch(`/tasks/${taskId}`, data);
        toast.success('Task updated successfully');
      } else {
        await api.post('/tasks', data);
        toast.success('Task created successfully');
      }
      onSuccess();
      reset();
      onClose();
    } catch (err: unknown) {
      const message = formatApiError(err, 'Failed to save task');
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl overflow-y-auto max-h-screen">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          {taskId ? 'Edit Task' : 'Create Task'}
        </h2>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 border border-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              {...register('title')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Task title"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Task description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status *</label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority *</label>
            <select
              {...register('priority')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assign To *</label>
            <select
              {...register('assigned_to_id')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select assignee</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
            {errors.assigned_to_id && (
              <p className="mt-1 text-xs text-red-500">{errors.assigned_to_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <select
                {...register('client_id')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">None</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quotation</label>
              <select
                {...register('quotation_id')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">None</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>{q.quote_number || q.id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice</label>
              <select
                {...register('invoice_id')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">None</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.invoice_number || inv.title || inv.id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Follow-up</label>
              <select
                {...register('payment_followup_id')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">None</option>
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>{`Rs. ${Number(p.amount).toLocaleString()} — ${new Date(p.payment_date).toLocaleDateString()}`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
