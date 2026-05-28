const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export const fetchMenuItems = async (category = 'all') => {
  const url = new URL(`${BASE_URL}/menu`);
  
  if (category && category !== 'all') {
    url.searchParams.append('category', category);
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch menu items');
  }
  
  return response.json();
};

export const placeOrder = async ({ tableNumber, items, notes, token }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      table_number: Number(tableNumber),
      items: items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
      notes: notes ?? undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to place order');
  }

  return response.json();
};

export const fetchKitchenOrders = async (status) => {
  const url = new URL(`${BASE_URL}/orders/kitchen`);
  if (status) {
    url.searchParams.append('status', status);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch kitchen orders');
  }
  return response.json();
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update order status');
  }
  return response.json();
};

// ── Menu Configuration ────────────────────────────────────────────────────────

export const createMenuItem = async (menuItem) => {
  const response = await fetch(`${BASE_URL}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menuItem),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create menu item');
  }
  return response.json();
};

export const updateMenuItem = async (id, menuItem) => {
  const response = await fetch(`${BASE_URL}/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menuItem),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update menu item');
  }
  return response.json();
};

export const deleteMenuItem = async (id) => {
  const response = await fetch(`${BASE_URL}/menu/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete menu item');
  }
  return response.json();
};

// ── Table Configuration ───────────────────────────────────────────────────────

export const fetchTables = async () => {
  const response = await fetch(`${BASE_URL}/tables`);
  if (!response.ok) throw new Error('Failed to fetch tables');
  return response.json();
};

export const createTable = async (tableData) => {
  const response = await fetch(`${BASE_URL}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tableData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create table');
  }
  return response.json();
};

export const updateTable = async (id, tableData) => {
  const response = await fetch(`${BASE_URL}/tables/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tableData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update table');
  }
  return response.json();
};

export const deleteTable = async (id) => {
  const response = await fetch(`${BASE_URL}/tables/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete table');
  }
  return response.json();
};

// ── Table Token Generation ────────────────────────────────────────────────────

export const fetchTableToken = async (tableNumber) => {
  const response = await fetch(`${BASE_URL}/auth/table-token/${tableNumber}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate token');
  }
  return response.json();
};
