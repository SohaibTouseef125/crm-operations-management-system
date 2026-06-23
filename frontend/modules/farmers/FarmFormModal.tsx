'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';

const farmSchema = z.object({
  farm_name: z.string().min(1, 'Farm name is required'),
  total_acreage: z.preprocess(
    (v) => (v === '' ? undefined : Number(v)),
    z.number().positive('Acreage must be positive')
  ),
  location_address: z.string().optional().nullable(),
  primary_crop: z.string().optional().nullable(),
  secondary_crop: z.string().optional().nullable(),
});

type FarmFormData = z.infer<typeof farmSchema>;

interface FarmFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  farmerId: string;
}

export default function FarmFormModal({ isOpen, onClose, onSuccess, farmerId }: FarmFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FarmFormData>({
    resolver: zodResolver(farmSchema) as any,
  });

  const onSubmit = async (data: FarmFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/farms', {
        farmer_id: farmerId,
        farm_name: data.farm_name,
        total_acreage: data.total_acreage,
        location_address: data.location_address || null,
        primary_crop: data.primary_crop || null,
        secondary_crop: data.secondary_crop || null,
      });
      onSuccess();
      reset();
      toast.success('Farm added successfully');
      onClose();
    } catch (err: unknown) {
      const message = formatApiError(err, 'Failed to add farm');
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
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Add Farm</h2>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 border border-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Farm Name *</label>
            <input
              {...register('farm_name')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Kotri plot"
            />
            {errors.farm_name && <p className="mt-1 text-xs text-red-500">{errors.farm_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Total Acreage (Acres) *</label>
            <input
              type="number"
              step="0.1"
              {...register('total_acreage')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., 12.5"
            />
            {errors.total_acreage && <p className="mt-1 text-xs text-red-500">{errors.total_acreage.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location Address</label>
            <input
              {...register('location_address')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Near main road, Kotri"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Crop</label>
            <input
              {...register('primary_crop')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Wheat, Cotton"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Secondary Crop</label>
            <input
              {...register('secondary_crop')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Mustard, Pulses"
            />
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-bold"
            >
              {isLoading ? 'Saving...' : 'Add Farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
