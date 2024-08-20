import React from 'react';
import Header from './components/Header';
import TransactionLookup from './components/TransactionLookup';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFE4B5] to-[#FFB6C1] p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <Header />
        <TransactionLookup />
      </div>
    </div>
  );
}

export default App;