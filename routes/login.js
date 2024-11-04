const express = require('express');
const router = express.Router();
const path = require('path');
const logger = require('../utils/logger');

router.get('/', (req, res, next) => {
    res.sendFile(path.join(path.join(__dirname,'../')+'/views/login.html'));
});

module.exports = router;