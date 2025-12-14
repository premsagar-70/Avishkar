const express = require('express');
const router = express.Router();
const { registerForEvent, getEventParticipants, getUserRegistrations } = require('../controllers/registrationController');

router.post('/', registerForEvent);
router.get('/event/:eventId', getEventParticipants);
router.get('/user/:userId', getUserRegistrations);
router.get('/:id', require('../controllers/registrationController').getRegistrationById);
router.put('/:id/status', require('../controllers/registrationController').updateRegistrationStatus);

module.exports = router;
