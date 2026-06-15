'use client';

import { Trash2, Plus } from 'lucide-react';
import { InvoiceItemFormData } from '@/types/invoice';

interface Props {
  items: InvoiceItemFormData[];
  onChange: (items: InvoiceItemFormData[]) => void;
  disabled?: boolean;
}

export default function LineItemsEditor({ items, onChange, disabled = false }: Props) {
  const addItem = () => {
    onChange([...items, { item_name: '', description: '', unit_price: 0 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof InvoiceItemFormData, value: string | number) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase px-1">
        <div className="col-span-4">Item Name *</div>
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-right">Price (PKR) *</div>
        <div className="col-span-1"></div>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-start">
          <div className="col-span-4">
            <input
              type="text"
              value={item.item_name}
              onChange={e => updateItem(idx, 'item_name', e.target.value)}
              disabled={disabled}
              placeholder="e.g., Security Deposit"
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div className="col-span-5">
            <input
              type="text"
              value={item.description}
              onChange={e => updateItem(idx, 'description', e.target.value)}
              disabled={disabled}
              placeholder="Description (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
            />
          </div>
          <div className="col-span-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={item.unit_price || ''}
              onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
              disabled={disabled}
              placeholder="0"
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 text-right focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
            />
          </div>
          <div className="col-span-1 flex justify-center pt-2">
            {!disabled && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          No items added yet. Click "Add Item" to begin.
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors mt-2"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      )}
    </div>
  );
}
