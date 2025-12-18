const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    approveEvent,
    archiveEvents
} = require('../controllers/eventController');

// TODO: Add auth middleware to protect write operations
router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.put('/:id/approve', approveEvent);
router.post('/archive', archiveEvents);
router.delete('/:id', deleteEvent);

module.exports = router;
