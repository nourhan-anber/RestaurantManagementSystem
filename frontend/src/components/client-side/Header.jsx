import React from 'react';
import useCartStore from '../../store/cartStore';

const Header = ({ onCartClick, tableNumber }) => {
  const totalItems = useCartStore((state) => state.totalItems());
  return (
    <header className="fixed w-full top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-black leading-tight">Bella Vista</h1>
            <span className="text-sm text-gray-500 font-medium">Table {tableNumber}</span>
          </div>
          <div className="flex items-center">
            <button 
              onClick={onCartClick}
              className="text-black hover:text-gray-600 transition-colors duration-200 relative p-2"
              aria-label="View Cart"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
