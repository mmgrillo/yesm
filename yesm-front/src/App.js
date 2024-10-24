import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TransactionLookup from './components/TransactionLookup';
import TransactionDetails from './components/TransactionDetails';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-[#FFE4B5] to-[#FFB6C1] p-8">
        <div className="max-w-4xl mx-auto rounded-lg p-8">
          <Header />
          <Routes>
            {/* Define the search route */}
            <Route path="/" element={<TransactionLookup />} />
            <Route path="/search" element={<TransactionLookup />} />
            <Route path="/transaction-details/:id" element={<TransactionDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
