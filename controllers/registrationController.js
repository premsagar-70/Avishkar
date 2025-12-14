const { db } = require('../config/firebase');
const mailSender = require('../services/mailSender');
const { uploadToGitHub } = require('../services/githubService');

const registerForEvent = async (req, res) => {
    try {
        const { userId, eventId, mobile, email, name, paymentScreenshotUrl, status } = req.body;

        if (!userId || !eventId || !mobile) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if already registered
        const registrationsRef = db.collection('registrations');
        const snapshot = await registrationsRef
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .get();

        if (!snapshot.empty) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }

        // Upload payment screenshot if provided and is base64
        let finalPaymentScreenshotUrl = paymentScreenshotUrl || '';
        if (paymentScreenshotUrl && paymentScreenshotUrl.startsWith('data:image')) {
            try {
                finalPaymentScreenshotUrl = await uploadToGitHub(paymentScreenshotUrl, 'payments');
            } catch (uploadError) {
                console.error("Failed to upload payment screenshot:", uploadError);
                // Continue with base64 or empty? Let's continue but log it.
                // Or maybe fail? For now, let's keep the base64 if upload fails so we don't lose data, 
                // but ideally we should handle this better.
            }
        }

        // Create registration
        await registrationsRef.add({
            userId,
            eventId,
            mobile,
            email, // Storing email for easy access by admins
            name,  // Storing name for easy access
            paymentScreenshotUrl: finalPaymentScreenshotUrl,
            status: status || 'pending', // pending, approved, rejected
            timestamp: new Date()
        });

        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const getEventParticipants = async (req, res) => {
    try {
        const { eventId } = req.params;

        const registrationsRef = db.collection('registrations');
        const snapshot = await registrationsRef.where('eventId', '==', eventId).get();

        const participants = [];
        snapshot.forEach(doc => {
            participants.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(participants);
    } catch (error) {
        console.error("Fetch Participants Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const getUserRegistrations = async (req, res) => {
    try {
        const { userId } = req.params;
        const registrationsRef = db.collection('registrations');
        const snapshot = await registrationsRef.where('userId', '==', userId).get();

        const registrations = [];
        // We might want to fetch event details for each registration too
        // For now, let's just return the registration data which contains eventId
        // The frontend can fetch event details or we can do a join here.
        // Let's do a simple join here to make frontend easier.

        for (const doc of snapshot.docs) {
            const regData = doc.data();
            const eventDoc = await db.collection('events').doc(regData.eventId).get();
            if (eventDoc.exists) {
                registrations.push({
                    id: doc.id,
                    ...regData,
                    eventTitle: eventDoc.data().title,
                    eventDate: eventDoc.data().date,
                    eventVenue: eventDoc.data().venue
                });
            } else {
                registrations.push({ id: doc.id, ...regData, eventTitle: 'Unknown Event' });
            }
        }

        res.status(200).json(registrations);
    } catch (error) {
        console.error("Fetch User Registrations Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const getRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('registrations').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const data = doc.data();

        // Fetch event title if possible
        let eventTitle = 'Unknown Event';
        if (data.eventId) {
            const eventDoc = await db.collection('events').doc(data.eventId).get();
            if (eventDoc.exists) {
                eventTitle = eventDoc.data().title;
            }
        }

        res.status(200).json({ id: doc.id, ...data, eventTitle });
    } catch (error) {
        console.error("Get Registration Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const updateRegistrationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const regDoc = await db.collection('registrations').doc(id).get();
        if (!regDoc.exists) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        const registration = regDoc.data();

        await db.collection('registrations').doc(id).update({ status });

        // Send Email Notification
        if (registration.email) {
            let subject = '';
            let body = '';

            if (status === 'approved') {
                subject = 'Registration Approved - Aviskahr';
                body = `<p>Hello ${registration.name || 'Participant'},</p>
                        <p>Your registration for the event has been <strong>APPROVED</strong>.</p>
                        <p>We look forward to seeing you there!</p>`;
            } else if (status === 'rejected') {
                subject = 'Registration Update - Aviskahr';
                body = `<p>Hello ${registration.name || 'Participant'},</p>
                        <p>Your registration for the event has been <strong>REJECTED</strong>.</p>
                        <p>Please contact the organizer for more details.</p>`;
            }

            if (subject && body) {
                console.log(`[Email] Attempting to send email to ${registration.email} with subject: ${subject}`);
                mailSender(registration.email, subject, body)
                    .then(info => console.log(`[Email] Sent successfully:`, info))
                    .catch(err => console.error("[Email] Sending failed:", err));
            }
        }

        res.status(200).json({ message: 'Registration status updated' });
    } catch (error) {
        console.error("Update Registration Status Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registerForEvent,
    getEventParticipants,
    getUserRegistrations,
    getRegistrationById,
    updateRegistrationStatus
};
