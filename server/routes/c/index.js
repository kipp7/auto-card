const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/products', require('./products'));
router.use('/announcements', require('./announcements'));
router.use('/orders', require('./orders'));

module.exports = router;

