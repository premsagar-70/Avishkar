const { db } = require('../config/firebase');
const { deleteFromGitHub } = require('../services/githubService');

const createEvent = async (req, res) => {
    try {
        const { title, date, description, venue, imageUrl, createdBy, role, price, category, assignedTo, paymentQrCodeUrl, upiId, slots } = req.body;

        let organizerName = req.body.organizerName || '';
        let organizerEmail = req.body.organizerEmail || '';
        let organizerMobile = req.body.organizerMobile || '';

        if (assignedTo) {
            const userDoc = await db.collection('users').doc(assignedTo).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.name) organizerName = userData.name;
                if (userData.email) organizerEmail = userData.email;
                if (userData.mobileNumber) organizerMobile = userData.mobileNumber;
            }
        } else if (createdBy && createdBy !== 'admin' && role !== 'admin') {
            const userDoc = await db.collection('users').doc(createdBy).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.name) organizerName = userData.name;
                if (userData.email) organizerEmail = userData.email;
                if (userData.mobileNumber) organizerMobile = userData.mobileNumber;
            }
        }

        const newEvent = {
            title,
            date,
            description,
            venue,
            imageUrl,
            price,
            category,
            createdBy: createdBy || 'admin',
            assignedTo: assignedTo || null,
            organizerName,
            organizerEmail,
            paymentQrCodeUrl: paymentQrCodeUrl || '',
            upiId: upiId || '',
            slots: slots ? parseInt(slots) : null,
            organizerMobile: organizerMobile,
            year: req.body.year || '2026',
            status: role === 'admin' ? 'approved' : 'pending',
            createdAt: new Date().toISOString()
        };
        const docRef = await db.collection('events').add(newEvent);
        res.status(201).json({ id: docRef.id, ...newEvent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getEvents = async (req, res) => {
    try {
        const { role, organizerId } = req.query;
        let query = db.collection('events');

        if (role !== 'admin') {
            if (organizerId) {
                const snapshot = await query.get();
                let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                events = events.filter(event =>
                    event.assignedTo === organizerId || event.createdBy === organizerId
                );
                return res.status(200).json(events);
                return res.status(200).json(events);
            } else {
                // Return both approved and completed events so Archives/PreviousYear pages work
                query = query.where('status', 'in', ['approved', 'completed']);
            }
        }

        const snapshot = await query.get();
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getEventById = async (req, res) => {
    try {
        const doc = await db.collection('events').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const registrationsSnapshot = await db.collection('registrations')
            .where('eventId', '==', req.params.id)
            .get();

        // Count registrations that are not rejected
        const registeredCount = registrationsSnapshot.docs.filter(doc => doc.data().status !== 'rejected').length;

        res.status(200).json({ id: doc.id, ...doc.data(), registeredCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateEvent = async (req, res) => {
    try {
        const updates = { ...req.body };

        if (updates.assignedTo !== undefined) {
            if (updates.assignedTo) {
                const userDoc = await db.collection('users').doc(updates.assignedTo).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    updates.organizerName = userData.name || updates.organizerName || '';
                    updates.organizerEmail = userData.email || updates.organizerEmail || '';
                    updates.organizerMobile = userData.mobileNumber || updates.organizerMobile || '';
                } else {
                    updates.organizerName = '';
                    updates.organizerEmail = '';
                    updates.organizerMobile = '';
                }
            } else {
                updates.organizerName = '';
                updates.organizerEmail = '';
                updates.organizerMobile = '';
                updates.assignedTo = null;
            }
        }

        if (updates.slots) {
            updates.slots = parseInt(updates.slots);
        }

        await db.collection('events').doc(req.params.id).update(updates);
        res.status(200).json({ id: req.params.id, ...updates });
    } catch (error) {
        console.error("Update Event Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const docRef = db.collection('events').doc(req.params.id);
        const doc = await docRef.get();

        if (doc.exists) {
            const eventData = doc.data();

            // 1. Delete Image from GitHub
            if (eventData.imageUrl) {
                await deleteFromGitHub(eventData.imageUrl);
            }

            // 2. Delete all registrations for this event
            const registrationsSnapshot = await db.collection('registrations').where('eventId', '==', req.params.id).get();
            const batch = db.batch();
            registrationsSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // 3. Delete the event itself
            await docRef.delete();
            res.status(200).json({ message: 'Event and associated registrations deleted successfully' });
        } else {
            res.status(404).json({ error: 'Event not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const approveEvent = async (req, res) => {
    try {
        await db.collection('events').doc(req.params.id).update({ status: 'approved' });
        res.status(200).json({ message: 'Event approved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const archiveEvents = async (req, res) => {
    try {
        const { year } = req.body;
        const snapshot = await db.collection('events').where('status', '==', 'approved').get();

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'completed',
                year: year || new Date().getFullYear().toString()
            });
        });

        await batch.commit();
        res.status(200).json({ message: `Archived ${snapshot.size} events to year ${year}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    approveEvent,
    archiveEvents
};
