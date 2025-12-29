const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, getUserById } = require('../controllers/userController');

// TODO: Add admin auth middleware
router.get('/', getAllUsers);
router.get('/:uid', getUserById);
router.put('/:uid/role', updateUserRole);

module.exports = router;
