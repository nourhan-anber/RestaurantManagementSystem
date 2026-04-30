import React from 'react';
import useCartStore from '../../store/cartStore';

const Cart = ({ isOpen, onClose }) => {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalPrice = useCartStore((state) => state.totalPrice);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Cart Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">

          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">Your Order</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-black transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-black">Your cart is empty</p>
                  <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">Looks like you haven't added any dishes yet.</p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2 border border-black text-sm font-medium rounded-full text-black hover:bg-black hover:text-white transition-colors"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-black">{item.name}</p>
                      <p className="text-sm text-gray-500">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => decrementItem(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-black hover:border-black transition-colors text-base font-medium"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-black">{item.quantity}</span>
                      <button
                        onClick={() => addItem({ id: item.id, name: item.name, price: item.price })}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-colors text-base font-medium"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-1 text-gray-300 hover:text-red-400 transition-colors"
                        aria-label="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-6">
            <div className="flex justify-between text-base font-bold text-black mb-4">
              <p>Total</p>
              <p>${totalPrice().toFixed(2)}</p>
            </div>
            <button
              disabled={items.length === 0}
              className="w-full flex items-center justify-center px-6 py-3 rounded-full text-base font-medium text-white bg-black hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Place Order
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cart;
