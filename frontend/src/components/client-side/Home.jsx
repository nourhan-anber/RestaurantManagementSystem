import React from 'react';

const Home = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
            <svg className="w-12 h-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Welcome to Bella Vista</h1>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            Please scan the QR code located on your table to view our digital menu and place your order.
          </p>
        </div>
        <div className="pt-8 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-400">
            For assistance, please ask one of our staff members.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
