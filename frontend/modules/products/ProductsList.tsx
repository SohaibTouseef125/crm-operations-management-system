'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api/axios';
import { toast } from '@/lib/toast';
import { Pencil, Trash2, Plus, Package } from 'lucide-react';
import { useAuthStore } from '@/store/auth/useAuthStore';

interface ProductType {
  id: string;
  name: string;
  category: string;
  product_type: 'PRODUCT' | 'SERVICE';
  description: string | null;
  price: number;
  tax_percentage: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export default function ProductsList() {
  const { user } = useAuthStore();
  const canWrite = user && ['ADMIN', 'BDM'].includes(user.role);
  const canDelete = user && ['ADMIN'].includes(user.role);
  const [items, setItems] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ProductType | null>(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', price: 0, tax_percentage: 0 });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { product_type: 'PRODUCT' } });
      setItems(res.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async () => {
    try {
      const payload = { ...form, product_type: 'PRODUCT', status: 'ACTIVE' };
      if (editItem) {
        await api.patch(`/products/${editItem.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post('/products', payload);
        toast.success('Created');
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ name: '', category: '', description: '', price: 0, tax_percentage: 0 });
      fetchItems();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Deleted');
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <button onClick={() => { setEditItem(null); setForm({ name: '', category: '', description: '', price: 0, tax_percentage: 0 }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} /> Add Product
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">{editItem ? 'Edit' : 'New'} Product</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                <input type="number" step="0.01" value={form.tax_percentage} onChange={e => setForm({ ...form, tax_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-500">Loading...</p> : items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No products found</p>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="text-blue-500" size={20} />
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.category}{item.description ? ` - ${item.description}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold">Rs. {item.price.toLocaleString()}</span>
                <span className={`text-xs px-2 py-1 rounded ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span>
                {canWrite && (
                  <button onClick={() => { setEditItem(item); setForm({ name: item.name, category: item.category, description: item.description || '', price: item.price, tax_percentage: item.tax_percentage }); setShowForm(true); }}
                    className="p-1 hover:bg-gray-100 rounded"><Pencil size={16} /></button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}