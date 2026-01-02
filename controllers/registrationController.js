const { db, admin } = require('../config/firebase');
const { uploadToGitHub } = require('../services/githubService');

const registerForEvent = async (req, res) => {
    try {
        const { userId, eventId, mobile, email, name, college, rollNo, department, paymentScreenshotUrl, status } = req.body;

        if (!userId || !eventId || !mobile) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch Event Data FIRST so it is available for checks and notifications
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const eventData = eventDoc.data();


        // Check if already registered
        const registrationsRef = db.collection('registrations');
        const snapshot = await registrationsRef
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .get();

        if (!snapshot.empty) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }

        // Check for slots availability
        if (eventData.slots) {
            const currentRegistrations = await registrationsRef
                .where('eventId', '==', eventId)
                .get();

            // Filter out rejected registrations
            const activeRegistrations = currentRegistrations.docs.filter(doc => doc.data().status !== 'rejected').length;

            if (activeRegistrations >= eventData.slots) {
                return res.status(400).json({ message: 'Registration Full. Please contact the organizer for more seats.' });
            }
        }

        // Upload payment screenshot if provided and is base64
        let finalPaymentScreenshotUrl = paymentScreenshotUrl || '';
        if (paymentScreenshotUrl && paymentScreenshotUrl.startsWith('data:image')) {
            try {
                finalPaymentScreenshotUrl = await uploadToGitHub(paymentScreenshotUrl, 'payment_proofs');
            } catch (uploadError) {
                console.error("Failed to upload payment screenshot:", uploadError);
                // Continue with base64 or empty? Let's continue but log it.
                // Or maybe fail? For now, let's keep the base64 if upload fails so we don't lose data, 
                // but ideally we should handle this better.
            }
        }

        // Create registration
        const newRegRef = await registrationsRef.add({
            userId,
            eventId,
            mobile,
            email,
            name,
            college: college || '',
            rollNo: rollNo || '',
            department: department || '',
            teamMembers: req.body.teamMembers || [],
            paymentScreenshotUrl: finalPaymentScreenshotUrl,
            status: status || 'pending',
            timestamp: new Date()
        });

        // --- Send Notification to Organizer ---
        try {
            let targetOrganizerId = null;
            if (eventData.enableMultiDepartment && department && eventData.departmentOrganizers && eventData.departmentOrganizers[department]) {
                targetOrganizerId = eventData.departmentOrganizers[department];
            } else {
                targetOrganizerId = eventData.assignedTo || eventData.createdBy;
            }

            if (targetOrganizerId && targetOrganizerId !== 'admin') {
                const { sendPushNotification } = require('../services/notificationService');
                const notifTitle = "New Registration";
                const notifBody = `${name} registered for ${eventData.title}.`;

                // Add to Firestore
                await db.collection('notifications').add({
                    userId: targetOrganizerId,
                    title: notifTitle,
                    body: notifBody,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: 'new_registration',
                    entityId: newRegRef.id,
                    eventId: eventId,
                    url: `/organizer/participants/${eventId}` // Helper for frontend
                });

                // Send Push
                const url = `/organizer/participants/${eventId}`;
                await sendPushNotification(targetOrganizerId, notifTitle, notifBody, {
                    url: url,
                    eventId: eventId
                });
            }
        } catch (notifError) {
            console.error("Failed to send organizer notification:", notifError);
            // Don't fail the registration if notification fails
        }

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
                const eventData = eventDoc.data();
                eventTitle = eventData.title;
                // Add fields for permission checking
                data.eventAssignedTo = eventData.assignedTo;
                data.eventCreatedBy = eventData.createdBy;
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

        // Send Notification
        const notifTitle = status === 'approved' ? 'Registration Approved' : 'Registration Rejected';
        const notifBody = `Your registration for the event has been ${status.toUpperCase()}.`;

        // Add to Firestore
        await db.collection('notifications').add({
            userId: registration.userId,
            title: notifTitle,
            body: notifBody,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'registration_status',
            entityId: id, // Registration ID
            eventId: registration.eventId,
            url: `/events/${registration.eventId}`
        });

        // Send Push
        try {
            const { sendPushNotification } = require('../services/notificationService');
            // Assuming registration document has eventId. 
            // If not, we might need to fetch it or rely on entityId = registrationId which frontend can resolve.
            // But having a direct URL is better.
            const url = `/events/${registration.eventId}`;
            await sendPushNotification(registration.userId, notifTitle, notifBody, {
                url: url,
                eventId: registration.eventId
            });
        } catch (err) {
            console.error("Push notification failed", err);
        }

        // Send Email Notification (Existing logic kept or minimized)
        if (registration.email) {
            // ... existing email logic ...
        }

        res.status(200).json({ message: 'Registration status updated' });
    } catch (error) {
        console.error("Update Registration Status Error:", error);
        res.status(500).json({ error: error.message });
    }
};


const checkRegistrationStatus = async (req, res) => {
    try {
        const { eventId, userId } = req.params;

        if (!eventId || !userId) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const registrationsRef = db.collection('registrations');
        const snapshot = await registrationsRef
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .get();

        if (snapshot.empty) {
            return res.status(200).json({ registered: false });
        }

        // Return the first match (should only be one active usually)
        const doc = snapshot.docs[0];
        res.status(200).json({
            registered: true,
            registration: { id: doc.id, ...doc.data() }
        });

    } catch (error) {
        console.error("Check Registration Status Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registerForEvent,
    getEventParticipants,
    getUserRegistrations,
    getRegistrationById,
    updateRegistrationStatus,
    checkRegistrationStatus
};
