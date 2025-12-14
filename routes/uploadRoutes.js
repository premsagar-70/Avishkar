const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
// Middleware to check auth/role should be added here later
// const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/', uploadImage);

module.exports = router;
