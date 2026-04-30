import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMenuItems } from '../../services/api';
import useCartStore from '../../store/cartStore';

const CATEGORIES = ['main-course', 'appetizers', 'desserts', 'drinks'];

const CATEGORY_LABELS = {
  'main-course': 'Main Course',
  'appetizers': 'Appetizers',
  'desserts': 'Desserts',
  'drinks': 'Drinks',
};

const Body = () => {
  const [activeCategory, setActiveCategory] = useState('main-course');
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  const { data: menuItems = [], isLoading, isError } = useQuery({
    queryKey: ['menuItems', activeCategory],
    queryFn: () => fetchMenuItems(activeCategory),
  });

  return (
    <main className="flex-grow pt-24 pb-16 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Category Tabs */}
        <div className="flex space-x-6 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pb-1 whitespace-nowrap font-medium transition-colors ${activeCategory === cat
                ? 'text-black font-semibold border-b-2 border-black'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-start py-4 border-b border-gray-100">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-xl flex-shrink-0 animate-pulse" />
                <div className="flex-grow space-y-3 pt-2">
                  <div className="h-5 bg-gray-100 rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">Could not load menu items. Please try again later.</p>
          </div>
        )}

        {/* Menu Items List */}
        {!isLoading && !isError && (
          <div className="flex flex-col space-y-6">
            {menuItems.length === 0 ? (
              <p className="text-center text-gray-400 py-16 text-sm">No items in this category.</p>
            ) : (
              menuItems.map((item) => {
                // Parse price string "$24.00" -> 24.00
                const numericPrice = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                const cartItem = cartItems.find((c) => c.id === item.id);

                return (
                  <div key={item.id} className="flex gap-4 items-start py-4 border-b border-gray-100 last:border-0">
                    {/* Placeholder for Image */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-xl flex-shrink-0" />

                    {/* Content */}
                    <div className="flex-grow flex flex-col justify-between h-full min-h-[6rem] sm:min-h-[8rem]">
                      <div>
                        <h3 className="text-lg font-bold text-black">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      </div>

                      <div className="flex justify-between items-center mt-3 sm:mt-auto">
                        <span className="text-lg font-semibold text-black">{item.price}</span>

                        {cartItem ? (
                          /* Quantity Controls */
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => useCartStore.getState().decrementItem(item.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-black hover:border-black transition-colors text-lg font-medium"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-semibold text-black">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => addItem({ id: item.id, name: item.name, price: numericPrice })}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-colors text-lg font-medium"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          /* Initial Add Button */
                          <button
                            onClick={() => addItem({ id: item.id, name: item.name, price: numericPrice })}
                            className="px-4 py-1.5 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </main>
  );
};

export default Body;
