const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Helper wrapper for async error handling if needed, or direct
router.get('/export/events', dataController.exportEvents);
router.post('/import/events', dataController.importEvents);
router.post('/cleanup/events', dataController.cleanupData);

module.exports = router;
