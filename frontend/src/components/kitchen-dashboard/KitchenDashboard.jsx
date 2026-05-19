import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchKitchenOrders, updateOrderStatus } from '../../services/api';
import Configuration from './Configuration';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMinutesAgo(dateString) {
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (mins < 1) return 'just now';
  return `${mins} min${mins !== 1 ? 's' : ''} ago`;
}

const STATUS_STYLES = {
  pending:   { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-600',    label: 'Pending'     },
  preparing: { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-600', label: 'In Progress' },
  ready:     { bar: 'bg-green-500',  badge: 'bg-green-100 text-green-700', label: 'Ready'       },
};

// ── OrderCard ─────────────────────────────────────────────────────────────────
const OrderCard = ({ order, onStatusChange }) => {
  // If the status is not in STATUS_STYLES (e.g. delivered/cancelled), fallback to a default
  const style = STATUS_STYLES[order.status] || { bar: 'bg-gray-300' };
  const isInProgress = order.status === 'preparing';
  const isReady      = order.status === 'ready';

  return (
    <div className={`relative bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 flex`}>
      {/* Left status bar */}
      <div className={`w-1.5 flex-shrink-0 ${style.bar}`} />

      {/* Card content */}
      <div className="flex-1 p-5">
        {/* Card header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Person icon */}
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0a4 4 0 016 0m-6 0V14a3 3 0 116 0v2.13" />
            </svg>
            <span className="text-lg font-bold text-gray-900">Table {order.table_number}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {getMinutesAgo(order.created_at)}
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-3 mb-5">
          {order.items && order.items.map((item) => (
            <div key={item.id}>
              <div className="flex items-center gap-3">
                {/* Quantity badge */}
                <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {item.quantity}
                </span>
                <span className="text-base font-semibold text-gray-900">{item.name}</span>
              </div>
              {item.notes && (
                <p className="ml-10 mt-0.5 text-sm text-gray-400">Note: {item.notes}</p>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-4" />

        {/* Action checkboxes */}
        <div className="space-y-3">
          {/* In Progress */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <span
              onClick={() => !isInProgress && !isReady && onStatusChange({ orderId: order.id, status: 'preparing' })}
              className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0
                ${isInProgress || isReady
                  ? 'bg-amber-400 border-amber-400'
                  : 'border-gray-300 group-hover:border-amber-300'
                }`}
            >
              {(isInProgress || isReady) && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={`text-sm font-medium ${isInProgress || isReady ? 'text-amber-600' : 'text-gray-600'}`}>
              In Progress
            </span>
          </label>

          {/* Ready for Pickup */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <span
              onClick={() => !isReady && onStatusChange({ orderId: order.id, status: 'ready' })}
              className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0
                ${isReady
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 group-hover:border-green-300'
                }`}
            >
              {isReady && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={`text-sm font-medium ${isReady ? 'text-green-600' : 'text-gray-600'}`}>
              Ready for Pickup
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

// ── KitchenDashboard ──────────────────────────────────────────────────────────
const KitchenDashboard = () => {
  const [activeView, setActiveView] = React.useState('orders');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['kitchenOrders'],
    queryFn: () => fetchKitchenOrders(),
    // Poll every 10 seconds to keep KDS up to date
    refetchInterval: 10000, 
  });

  const mutation = useMutation({
    mutationFn: ({ orderId, status }) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      // Invalidate to refresh the list instantly
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
    },
  });

  // Optional: Add an effect to trigger an immediate re-render of timestamps every minute
  const [, setTick] = React.useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-red-500">
        <p>Failed to load orders: {error?.message}</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 border rounded hover:bg-gray-100 text-gray-800">
          Retry
        </button>
      </div>
    );
  }

  const pending    = orders.filter((o) => o.status === 'pending').length;
  const inProgress = orders.filter((o) => o.status === 'preparing').length;
  const ready      = orders.filter((o) => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900">Bella Vista Admin</h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveView('orders')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Live Orders
              </button>
              <button
                onClick={() => setActiveView('config')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'config' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Restaurant Config
              </button>
            </nav>
          </div>
          {activeView === 'orders' && (
            <div className="flex items-center gap-4 text-sm bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
              <span>
                <span className="text-gray-500">Pending: </span>
                <span className="font-semibold text-gray-800">{pending}</span>
              </span>
              <span>
                <span className="text-gray-500">In Progress: </span>
                <span className="font-semibold text-gray-800">{inProgress}</span>
              </span>
              <span>
                <span className="text-gray-500">Ready: </span>
                <span className="font-semibold text-gray-800">{ready}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === 'config' ? (
          <div className="p-6">
            <Configuration />
          </div>
        ) : (
          <div className="p-6 max-w-2xl mx-auto w-full">
            <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-base font-medium">No active orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={mutation.mutate}
              />
            ))
          )}
        </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;

