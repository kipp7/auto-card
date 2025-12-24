const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/products', require('./products'));
router.use('/orders', require('./orders'));
router.use('/announcements', require('./announcements'));
router.use('/dashboard', require('./dashboard'));
router.use('/finance', require('./finance'));
router.use('/qiniu', require('./qiniu'));

module.exports = router;

