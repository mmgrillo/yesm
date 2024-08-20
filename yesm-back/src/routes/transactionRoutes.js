const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET transaction details
router.get('/:txHash', transactionController.getTransactionDetails);

module.exports = router;