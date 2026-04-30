import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">Menu</a></li>
              <li><a href="#" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">Reservations</a></li>
              <li><a href="#" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">About Us</a></li>
              <li><a href="#" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">Reviews</a></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start text-sm text-gray-500 font-medium">
                <svg className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                123 Culinary Ave, Food City
              </li>
              <li className="flex items-center text-sm text-gray-500 font-medium">
                <svg className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +1 (555) 123-4567
              </li>
              <li className="flex items-center text-sm text-gray-500 font-medium">
                <svg className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                hello@bellavista.com
              </li>
            </ul>
          </div>
          
          {/* Opening Hours */}
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Opening Hours</h3>
            <ul className="space-y-3">
              <li className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Mon - Fri</span>
                <span>11:00 AM - 10:00 PM</span>
              </li>
              <li className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Saturday</span>
                <span>10:00 AM - 11:00 PM</span>
              </li>
              <li className="flex justify-between text-sm text-gray-500 font-medium">
                <span>Sunday</span>
                <span>10:00 AM - 9:00 PM</span>
              </li>
            </ul>
          </div>

        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-xs font-medium text-gray-400">
          <p>&copy; {new Date().getFullYear()} Bella Vista. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
