const BASE_URL = 'http://localhost:5001/api';

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
