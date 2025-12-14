const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    approveEvent
} = require('../controllers/eventController');

// TODO: Add auth middleware to protect write operations
router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.put('/:id/approve', approveEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
