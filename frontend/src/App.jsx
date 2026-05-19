import React, { useState, useEffect } from 'react';
import Header from './components/client-side/Header';
import Body from './components/client-side/Body';
import Footer from './components/client-side/Footer';
import Cart from './components/client-side/Cart';
import Home from './components/client-side/Home';
import KitchenDashboard from './components/kitchen-dashboard/KitchenDashboard';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    const tokenParam = params.get('token');
    const viewParam = params.get('view');
    if (table) setTableNumber(table);
    if (tokenParam) setToken(tokenParam);
    if (viewParam) setView(viewParam);
  }, []);

  // Kitchen staff view
  if (view === 'kitchen') {
    return <KitchenDashboard />;
  }

  // Customer: no table selected yet
  if (!tableNumber) {
    return <Home />;
  }

  // Customer menu view
  return (
    <div className="flex flex-col min-h-screen">
      <Header onCartClick={() => setIsCartOpen(true)} tableNumber={tableNumber} />
      <Body />
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} tableNumber={tableNumber} token={token} />
    </div>
  );
}

export default App;

