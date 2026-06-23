'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api/axios';
import { useAuthStore } from '@/store/auth/useAuthStore';
import { toast } from '@/lib/toast';
import { formatApiError } from '@/lib/formatApiError';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, Plus, Trash2 } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  status: string;
  location: string | null;
  farmer_id: string | null;
  client_id: string | null;
  assigned_to_id: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const TYPE_STYLES: Record<string, string> = {
  FIELD_VISIT: 'bg-blue-100 text-blue-700',
  REPORTING: 'bg-purple-100 text-purple-700',
  QA: 'bg-orange-100 text-orange-700',
  FOLLOW_UP: 'bg-cyan-100 text-cyan-700',
  MEETING: 'bg-pink-100 text-pink-700',
};

export default function CalendarView() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_type: 'FIELD_VISIT', event_date: '', location: '' });
  const [saving, setSaving] = useState(false);

  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role);
  const canComplete = user && ['ADMIN', 'MANAGER', 'AGRONOMY'].includes(user.role);
  const canCreate = user && ['ADMIN', 'MANAGER', 'BUSINESS', 'AGRONOMY'].includes(user.role);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calendar');
      setEvents(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to load calendar'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.event_date) { toast.error('Title and date are required'); return; }
    setSaving(true);
    try {
      await api.post('/calendar', form);
      toast.success('Event created');
      setShowForm(false);
      setForm({ title: '', description: '', event_type: 'FIELD_VISIT', event_date: '', location: '' });
      fetchEvents();
    } catch { toast.error('Failed to create event'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/calendar/${id}/complete`);
      toast.success('Visit marked complete');
      fetchEvents();
    } catch { toast.error('Failed to update'); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/calendar/${id}`, { status: 'CANCELLED' });
      toast.success('Visit cancelled');
      fetchEvents();
    } catch { toast.error('Failed to cancel'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/calendar/${id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch { toast.error('Failed to delete event'); }
  };

  const filtered = filterStatus === 'ALL' ? events : events.filter(e => e.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  if (loading) return <div className="p-8 text-center text-gray-500">Loading calendar...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}>
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Event
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Calendar Event</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="FIELD_VISIT">Field Visit</option>
                  <option value="REPORTING">Reporting</option>
                  <option value="QA">QA</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="MEETING">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {sorted.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No calendar events found.</p>
          </div>
        ) : (
          sorted.map(event => (
            <div key={event.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${TYPE_STYLES[event.event_type] || 'bg-gray-100 text-gray-700'}`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_STYLES[event.status] || 'bg-gray-100 text-gray-600'}`}>
                        {event.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${TYPE_STYLES[event.event_type] || 'bg-gray-100 text-gray-600'}`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.event_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canComplete && event.status === 'SCHEDULED' && (
                    <button onClick={() => handleComplete(event.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Complete
                    </button>
                  )}
                  {canManage && event.status === 'SCHEDULED' && (
                    <button onClick={() => handleCancel(event.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(event.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Event">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
