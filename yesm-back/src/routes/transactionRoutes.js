// src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET transaction details by hash
router.get('/:txHash', transactionController.getTransactionDetails);

// GET all transactions for a wallet by wallet address
router.get('/wallet/:walletAddress', transactionController.getWalletTransactions);

module.exports = router;
