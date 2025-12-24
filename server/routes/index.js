const express = require('express');

const router = express.Router();

router.use('/b', require('./b'));
router.use('/c', require('./c'));

module.exports = router;

