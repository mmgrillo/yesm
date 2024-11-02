import React from 'react';
import { getSupportedImplementation } from '../utils/tokenUtils';

const TransactionCard = ({ transaction, tokenPrices, navigate, onUndoChange }) => {
  const { transactionNumber, operation_type: action, attributes } = transaction;

  if (!attributes) return null; 

  // Helper function to get current price from tokenPrices
  const getCurrentPrice = (chain, address, symbol) => {
    const priceKey = symbol.toLowerCase() === 'eth' ? 'ethereum:eth' : `${chain}:${address || symbol.toLowerCase()}`;
    return tokenPrices[priceKey]?.usd || 'N/A';
  };

  // Aggregate all sold and bought transfers
  const soldTransfers = attributes.transfers.filter(t => t.direction === 'out');
  const boughtTransfers = attributes.transfers.filter(t => t.direction === 'in');

  // Calculate total sold values
  const totalSoldValue = soldTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  const totalSoldUSD = soldTransfers.reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);
  const soldSymbol = soldTransfers[0]?.fungible_info?.symbol?.toUpperCase() || 'N/A';
  const soldImplementation = getSupportedImplementation(soldTransfers[0]?.fungible_info);
  const currentSoldPrice = soldImplementation
    ? getCurrentPrice(soldImplementation.chain_id, soldImplementation.address, soldSymbol)
    : 'N/A';

  const totalSoldQuantity = soldTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  const totalBoughtQuantity = boughtTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);


  // Calculate total bought values
  const totalBoughtValue = boughtTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  const totalBoughtUSD = boughtTransfers.reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);
  const boughtSymbol = boughtTransfers[0]?.fungible_info?.symbol?.toUpperCase() || 'N/A';
  const boughtImplementation = getSupportedImplementation(boughtTransfers[0]?.fungible_info);
  const currentBoughtPrice = boughtImplementation
    ? getCurrentPrice(boughtImplementation.chain_id, boughtImplementation.address, boughtSymbol)
    : 'N/A';

  // Relative Performance Index (RPI)
  const calculateRelativePerformanceIndex = (currentPriceBought, boughtPriceAtTrade, currentPriceSold, soldPriceAtTrade) => {
    if (boughtPriceAtTrade === 0 || soldPriceAtTrade === 0 || currentPriceBought === 'N/A' || currentPriceSold === 'N/A') {
      return 'N/A';
    }
    const relativePerformance = (currentPriceBought / boughtPriceAtTrade) / (currentPriceSold / soldPriceAtTrade) - 1;
    return (relativePerformance * 100).toFixed(2); // Return as a percentage with 2 decimal places
  };

  const soldPerformance = totalSoldValue !== 0 && currentSoldPrice !== 'N/A'
  ? ((currentSoldPrice * totalSoldQuantity - totalSoldValue) / totalSoldValue) * 100
  : 'N/A';

const boughtPerformance = totalBoughtValue !== 0 && currentBoughtPrice !== 'N/A'
  ? ((currentBoughtPrice * totalBoughtQuantity - totalBoughtValue) / totalBoughtValue) * 100
  : 'N/A';

  const rpi = calculateRelativePerformanceIndex(currentBoughtPrice, totalBoughtValue, currentSoldPrice, totalSoldValue);

  // Handle Undo Checkbox
  const handleUndoChange = (e) => {
    onUndoChange(transaction, e.target.checked);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4 w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">
          RPI: {rpi !== 'N/A' ? `${rpi}%` : 'N/A'}
          <span className="relative group ml-2">
            <span className="text-blue-500 cursor-pointer">ℹ️</span>
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-1 w-64 p-2 bg-gray-800 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              The Relative Performance Index (RPI) compares the performance of the assets bought and sold in the trade.
              A positive RPI indicates that the trade outperformed simply holding the sold asset,
              while a negative RPI suggests underperformance.
            </div>
          </span>
        </h3>
        <div>
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-[#4A0E4E]"
            onChange={handleUndoChange}
          />
          <label className="ml-2 text-sm text-gray-700">Undo</label>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">{attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</h3>
      <p><strong>Timestamp:</strong> {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</p>

      {/* Sold Token Details */}
      <p><strong>Sold:</strong> {totalSoldValue ? `${totalSoldValue} ${soldSymbol}` : 'N/A'}</p>
      <p><strong>Sold (USD at time of trade):</strong> {totalSoldUSD ? `$${totalSoldUSD.toFixed(2)}` : 'N/A'}</p>
      <p><strong>Bought:</strong> {totalBoughtValue ? `${totalBoughtValue} ${boughtSymbol}` : 'N/A'}</p>
      <p><strong>Bought (USD at time of trade):</strong> {totalBoughtUSD ? `$${totalBoughtUSD.toFixed(2)}` : 'N/A'}</p>

      {/* Performance */}
      <p><strong>Current Sold Value (USD):</strong> {currentSoldPrice !== 'N/A' ? `$${(totalSoldValue * currentSoldPrice).toFixed(2)}` : 'N/A'}</p>
      <p><strong>Sold Performance:</strong> {soldPerformance !== 'N/A' ? `${soldPerformance.toFixed(2)}%` : 'N/A'}</p>
      <p><strong>Current Bought Value (USD):</strong> {currentBoughtPrice !== 'N/A' ? `$${(totalBoughtValue * currentBoughtPrice).toFixed(2)}` : 'N/A'}</p>
      <p><strong>Bought Performance:</strong> {boughtPerformance !== 'N/A' ? `${boughtPerformance.toFixed(2)}%` : 'N/A'}</p>

      <p><strong>Timestamp:</strong> {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}</p>

      <button
        className="mt-4 bg-[#4A0E4E] text-white px-4 py-2 rounded hover:bg-[#6A2C6A]"
        onClick={() => navigate(`/transaction-details/${transactionNumber}`, { state: { transaction } })}
      >
        View Details
      </button>
    </div>
  );
};

export default TransactionCard;
