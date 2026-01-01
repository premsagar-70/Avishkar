const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, getUserById, deleteUser } = require('../controllers/userController');

// TODO: Add admin auth middleware
router.get('/', getAllUsers);
router.get('/:uid', getUserById);
router.put('/:uid/role', updateUserRole);
router.delete('/:uid', deleteUser);

module.exports = router;
