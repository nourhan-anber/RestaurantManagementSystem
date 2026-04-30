import React, { useState, useEffect } from 'react';
import Header from './components/client-side/Header';
import Body from './components/client-side/Body';
import Footer from './components/client-side/Footer';
import Cart from './components/client-side/Cart';
import Home from './components/client-side/Home';

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(null);

  useEffect(() => {
    // Parse the query parameter when the component mounts
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    if (table) {
      setTableNumber(table);
    }
  }, []);

  if (!tableNumber) {
    return <Home />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onCartClick={() => setIsCartOpen(true)} tableNumber={tableNumber} />
      <Body />
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default App;
