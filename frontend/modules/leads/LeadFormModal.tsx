'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';

const SERVICES_OPTIONS = ['AquaSave Pro', 'Ag5x', 'Faas', 'Drone Spray', 'Drone Survey'] as const;

const leadSchema = z.object({
  name: z.string().min(1, 'Lead name is required'),
  contact_mobile: z.string().min(1, 'Contact mobile is required'),
  company_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().min(1, 'Location is required'),
  stage: z.enum([
    'discovery', 'outreach', 'quotation_requested', 'quotation_forwarded',
    'in-negotiation', 'won', 'lost',
  ]),
  assigned_to_id: z.string().min(1, 'Assigned team member is required'),
  next_follow_up: z.string().optional().nullable(),
  services_interested: z.array(z.string()).optional(),
  other_services: z.string().optional().nullable(),
});

export type LeadFormData = z.infer<typeof leadSchema>;

interface UserOption {
  id: string;
  full_name: string;
  role?: string;
}

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId?: string;
  initialData?: Partial<LeadFormData>;
}

export default function LeadFormModal({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  initialData,
}: LeadFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: { stage: 'discovery', services_interested: [], ...initialData },
  });

  const selectedServices = watch('services_interested') || [];

  useEffect(() => {
    if (isOpen) {
      api.get('/users?limit=100').then(r => setUsers(r.data)).catch(() => {});
    }
  }, [isOpen]);

  const toggleService = (svc: string) => {
    const current = selectedServices;
    if (current.includes(svc)) {
      setValue('services_interested', current.filter(s => s !== svc));
    } else {
      setValue('services_interested', [...current, svc]);
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = { ...data };
      if (leadId) {
        await api.patch(`/leads/${leadId}`, payload);
        toast.success('Lead updated successfully');
      } else {
        await api.post('/leads', payload);
        toast.success('Lead created successfully');
      }
      onSuccess();
      reset();
      onClose();
    } catch (err: unknown) {
      const message = formatApiError(err, 'Failed to save lead');
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full shadow-xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          {leadId ? 'Edit Lead' : 'Create Lead'}
        </h2>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 border border-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lead Name *</label>
              <input {...register('name')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Amit Patel" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Mobile *</label>
              <input {...register('contact_mobile')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., +92 300 1234567" />
              {errors.contact_mobile && <p className="mt-1 text-xs text-red-500">{errors.contact_mobile.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company / Farm Name</label>
              <input {...register('company_name')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Patel Agriculture" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location *</label>
              <input {...register('location')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Kotri, Sindh" />
              {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input {...register('email')} type="email"
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone (Alternate)</label>
              <input {...register('phone')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Assigned To *</label>
              <select {...register('assigned_to_id')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="">Select team member</option>
                {users.filter(u => ['BUSINESS', 'BDM', 'ADMIN', 'MANAGER'].includes(u.role || '')).map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              {errors.assigned_to_id && <p className="mt-1 text-xs text-red-500">{errors.assigned_to_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stage *</label>
              <select {...register('stage')}
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="discovery">Discovery</option>
                <option value="outreach">Outreach</option>
                <option value="quotation_requested">Quotation Requested</option>
                <option value="quotation_forwarded">Quotation Forwarded</option>
                <option value="in-negotiation">In Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Services Interested</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES_OPTIONS.map(svc => (
                <button key={svc} type="button" onClick={() => toggleService(svc)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    selectedServices.includes(svc)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}>
                  {svc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Other Services (custom)</label>
            <input {...register('other_services')}
              className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Any custom requirements not listed above" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Next Follow-up Date</label>
              <input {...register('next_follow_up')} type="date"
                className="w-full px-4 py-2 mt-1 border rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
