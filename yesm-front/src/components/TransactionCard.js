import React from 'react';
import { getSupportedImplementation } from '../utils/tokenUtils';

const TransactionCard = ({ transaction, tokenPrices, navigate }) => {
  const { transactionNumber, operation_type: action, attributes } = transaction;

  if (!attributes) return null; // Handle missing attributes

  // Helper function to get current price from tokenPrices
  const getCurrentPrice = (chain, address, symbol) => {
    const priceKey = symbol.toLowerCase() === 'eth' ? 'ethereum:eth' : `${chain}:${address || symbol.toLowerCase()}`;
    return tokenPrices[priceKey]?.usd || 'N/A';
  };

  // Extract sold and bought token details
  const soldTransfer = attributes.transfers.find((t) => t.direction === 'out') || {};
  const boughtTransfer = attributes.transfers.find((t) => t.direction === 'in') || {};

  const soldValue = soldTransfer.quantity?.float || 0;
  const soldSymbol = soldTransfer.fungible_info?.symbol?.toUpperCase() || 'N/A';
  const soldImplementation = getSupportedImplementation(soldTransfer.fungible_info);
  const currentSoldPrice = soldImplementation
    ? getCurrentPrice(soldImplementation.chain_id, soldImplementation.address, soldSymbol)
    : 'N/A';

  const boughtValue = boughtTransfer.quantity?.float || 0;
  const boughtSymbol = boughtTransfer.fungible_info?.symbol?.toUpperCase() || 'N/A';
  const boughtImplementation = getSupportedImplementation(boughtTransfer.fungible_info);
  const currentBoughtPrice = boughtImplementation
    ? getCurrentPrice(boughtImplementation.chain_id, boughtImplementation.address, boughtSymbol)
    : 'N/A';

  // Calculate performance
  const soldPriceThen = soldTransfer.price || 0;
  const soldPerformance =
    soldPriceThen !== 0 && currentSoldPrice !== 'N/A'
      ? ((currentSoldPrice - soldPriceThen) / soldPriceThen) * 100
      : 'N/A';

  const boughtPriceThen = boughtTransfer.price || 0;
  const boughtPerformance =
    boughtPriceThen !== 0 && currentBoughtPrice !== 'N/A'
      ? ((currentBoughtPrice - boughtPriceThen) / boughtPriceThen) * 100
      : 'N/A';

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4 w-full">
      <h3 className="text-lg font-semibold mb-2">Transaction # {transactionNumber}</h3>
      <p><strong>Transaction Action:</strong> {action || 'N/A'}</p>

      {/* Sold Token Details */}
      <p><strong>Sold:</strong> {soldValue ? `${soldValue} ${soldSymbol}` : 'N/A'}</p>
      <p><strong>Sold (USD at time of trade):</strong> {soldPriceThen ? `$${(soldValue * soldPriceThen).toFixed(2)}` : 'N/A'}</p>
      <p><strong>Current Sold Value (USD):</strong> {currentSoldPrice !== 'N/A' ? `$${(soldValue * currentSoldPrice).toFixed(2)}` : 'N/A'}</p>
      <p><strong>Sold Performance:</strong> {soldPerformance !== 'N/A' ? `${soldPerformance.toFixed(2)}%` : 'N/A'}</p>

      {/* Bought Token Details */}
      <p><strong>Bought:</strong> {boughtValue ? `${boughtValue} ${boughtSymbol}` : 'N/A'}</p>
      <p><strong>Bought (USD at time of trade):</strong> {boughtPriceThen ? `$${(boughtValue * boughtPriceThen).toFixed(2)}` : 'N/A'}</p>
      <p><strong>Current Bought Value (USD):</strong> {currentBoughtPrice !== 'N/A' ? `$${(boughtValue * currentBoughtPrice).toFixed(2)}` : 'N/A'}</p>
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
