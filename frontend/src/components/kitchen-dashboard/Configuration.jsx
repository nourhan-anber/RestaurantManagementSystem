import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  fetchTables,
  createTable,
  updateTable,
  deleteTable,
  fetchTableToken,
} from '../../services/api';

// ── Icons ───────────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ── Menu Management Tab ─────────────────────────────────────────────────────
const MenuManagement = () => {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ category: 'main-course', name: '', description: '', price: '', image_url: '', is_available: true });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: () => fetchMenuItems('all'),
  });

  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] }); setEditingItem(null); setFormData({ category: 'main-course', name: '', description: '', price: '', image_url: '', is_available: true }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMenuItem(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] }); setEditingItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, price: parseFloat(formData.price) };
    if (editingItem?.id) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price.replace('$', '')),
      image_url: item.image_url || '',
      is_available: item.is_available,
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ category: 'main-course', name: '', description: '', price: '', image_url: '', is_available: true });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="appetizer">Appetizer</option>
            <option value="main-course">Main Course</option>
            <option value="dessert">Dessert</option>
            <option value="drink">Drink</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Price ($)</label>
          <input required type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Image URL</label>
          <input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://example.com/image.jpg" className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input type="checkbox" checked={formData.is_available} onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })} id="is_available" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="is_available" className="text-sm text-gray-700">Available</label>
        </div>
        <div className="md:col-span-2 flex gap-3 mt-2">
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            {editingItem ? 'Update Item' : 'Add Item'}
          </button>
          {editingItem && (
            <button type="button" onClick={cancelEdit} className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          )}
        </div>
      </form>

      <h3 className="text-lg font-bold mb-4">Current Menu</h3>
      {isLoading ? <p>Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {menuItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {item.image_url && <img src={item.image_url} alt="" className="h-8 w-8 rounded object-cover mr-3" />}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{item.category.replace('-', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.price}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_available ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right flex justify-end gap-3">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                    <button onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate(item.id); }} className="text-red-600 hover:text-red-900"><TrashIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Table Management Tab ────────────────────────────────────────────────────
const TableManagement = () => {
  const queryClient = useQueryClient();
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ number: '', capacity: '4', is_active: true });
  const [generatedTokens, setGeneratedTokens] = useState({}); // mapping table number to generated URL

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['admin-tables'],
    queryFn: fetchTables,
  });

  const createMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tables'] }); setEditingTable(null); setFormData({ number: '', capacity: '4', is_active: true }); },
    onError: (err) => alert(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTable(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tables'] }); setEditingTable(null); },
    onError: (err) => alert(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTable,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tables'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, number: parseInt(formData.number), capacity: parseInt(formData.capacity) };
    if (editingTable?.id) {
      updateMutation.mutate({ id: editingTable.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (table) => {
    setEditingTable(table);
    setFormData({
      number: table.number,
      capacity: table.capacity,
      is_active: table.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingTable(null);
    setFormData({ number: '', capacity: '4', is_active: true });
  };

  const generateQRCodeURL = async (tableNumber) => {
    try {
      const { token } = await fetchTableToken(tableNumber);
      const url = `${window.location.origin}/?table=${tableNumber}&token=${token}`;
      setGeneratedTokens((prev) => ({ ...prev, [tableNumber]: url }));
    } catch (error) {
      alert('Failed to generate token');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{editingTable ? 'Edit Table' : 'Add New Table'}</h2>
      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Table Number</label>
          <input required type="number" min="1" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Capacity (seats)</label>
          <input required type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} id="table_is_active" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="table_is_active" className="text-sm text-gray-700">Active</label>
        </div>
        <div className="md:col-span-2 flex gap-3 mt-2">
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            {editingTable ? 'Update Table' : 'Add Table'}
          </button>
          {editingTable && (
            <button type="button" onClick={cancelEdit} className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          )}
        </div>
      </form>

      <h3 className="text-lg font-bold mb-4">Current Tables</h3>
      {isLoading ? <p>Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secure URL / QR</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">Table {table.number}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{table.capacity} seats</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${table.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {table.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {generatedTokens[table.number] ? (
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={generatedTokens[table.number]} className="text-xs p-1 border rounded w-48 bg-gray-50" />
                        <button onClick={() => navigator.clipboard.writeText(generatedTokens[table.number])} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Copy</button>
                      </div>
                    ) : (
                      <button onClick={() => generateQRCodeURL(table.number)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        Generate URL
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right flex justify-end gap-3">
                    <button onClick={() => handleEdit(table)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                    <button onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate(table.id); }} className="text-red-600 hover:text-red-900"><TrashIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Main Configuration Layout ───────────────────────────────────────────────
const Configuration = () => {
  const [activeTab, setActiveTab] = useState('menu');

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'menu' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Menu Management
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'tables' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Table Management
        </button>
      </div>

      {activeTab === 'menu' && <MenuManagement />}
      {activeTab === 'tables' && <TableManagement />}
    </div>
  );
};

export default Configuration;
