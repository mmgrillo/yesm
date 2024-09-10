const transactionExplanations = {
  swap: "This transaction is a token swap, where you exchanged one token for another. Swaps are typically done on decentralized exchanges like Uniswap.",
  transfer: "This is a token transfer, where one token is sent from one wallet to another.",
  liquidityProvision: "This transaction involves adding tokens to a liquidity pool to provide liquidity and earn fees.",
  staking: "This is a staking transaction, where tokens are locked in a contract to earn staking rewards.",
  aggregatedSwap: "This transaction is an aggregated swap, where multiple tokens were exchanged in a series of steps across different platforms.",
  default: "This transaction is a general transaction on the Ethereum network."
};

function getTransactionExplanation(txType) {
  return transactionExplanations[txType?.toLowerCase()] || transactionExplanations.default;
}

module.exports = getTransactionExplanation;
