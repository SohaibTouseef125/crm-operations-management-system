'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';

const farmerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_mobile: z.string().min(1, 'Mobile number is required'),
  cnic: z.string().optional().nullable(),
  village: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  pipeline_stage: z.enum(['prospect', 'active', 'inactive']),
  client_id: z.string().optional().nullable(),
});

type FarmerFormData = z.infer<typeof farmerSchema>;

interface FarmerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FarmerFormModal({ isOpen, onClose, onSuccess }: FarmerFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<{id: string; name: string; company_name: string}[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/clients').then(r => setClients(r.data)).catch(() => {});
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FarmerFormData>({
    resolver: zodResolver(farmerSchema),
    defaultValues: {
      pipeline_stage: 'prospect',
    },
  });

  const onSubmit = async (data: FarmerFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/farmers', {
        ...data,
        cnic: data.cnic || null,
        village: data.village || null,
        district: data.district || null,
        client_id: data.client_id || null,
      });
      onSuccess();
      reset();
      toast.success('Farmer created successfully');
      onClose();
    } catch (err: unknown) {
      const message = formatApiError(err, 'Failed to create farmer');
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Create Farmer</h2>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 border border-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input
              {...register('name')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Farmer name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
            <input
              {...register('contact_mobile')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="03xx-xxxxxxx"
            />
            {errors.contact_mobile && <p className="mt-1 text-xs text-red-500">{errors.contact_mobile.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CNIC</label>
              <input
                {...register('cnic')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="xxxxx-xxxxxxx-x"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pipeline Stage</label>
              <select
                {...register('pipeline_stage')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assign to Client</label>
            <select {...register('client_id')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">None (create independent farmer)</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.company_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Village</label>
              <input
                {...register('village')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">District</label>
              <input
                {...register('district')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-bold"
            >
              {isLoading ? 'Creating...' : 'Create Farmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
