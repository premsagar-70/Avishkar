const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole } = require('../controllers/userController');

// TODO: Add admin auth middleware
router.get('/', getAllUsers);
router.put('/:uid/role', updateUserRole);

module.exports = router;
