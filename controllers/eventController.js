const { db } = require('../config/firebase');
const { deleteFromGitHub } = require('../services/githubService');

const createEvent = async (req, res) => {
    try {
        const { title, date, description, venue, imageUrl, createdBy, role, price, category, assignedTo } = req.body;

        let conductorName = '';
        let conductorEmail = '';

        if (assignedTo) {
            const userDoc = await db.collection('users').doc(assignedTo).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                conductorName = userData.name || '';
                conductorEmail = userData.email || '';
            }
        } else if (createdBy && createdBy !== 'admin') {
            const userDoc = await db.collection('users').doc(createdBy).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                conductorName = userData.name || '';
                conductorEmail = userData.email || '';
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
            conductorName,
            conductorEmail,
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
        const { role, conductorId } = req.query;
        let query = db.collection('events');

        if (role !== 'admin') {
            if (conductorId) {
                const snapshot = await query.get();
                let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                events = events.filter(event =>
                    event.assignedTo === conductorId || event.createdBy === conductorId
                );
                return res.status(200).json(events);
            } else {
                query = query.where('status', '==', 'approved');
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
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateEvent = async (req, res) => {
    try {
        console.log("Update Event Request Body:", req.body);
        const updates = { ...req.body };

        if (updates.assignedTo !== undefined) {
            console.log("Updating assignedTo:", updates.assignedTo);
            if (updates.assignedTo) {
                const userDoc = await db.collection('users').doc(updates.assignedTo).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    updates.conductorName = userData.name || '';
                    updates.conductorEmail = userData.email || '';
                    console.log("Resolved Conductor:", updates.conductorName, updates.conductorEmail);
                } else {
                    console.log("User document not found for ID:", updates.assignedTo);
                    updates.conductorName = '';
                    updates.conductorEmail = '';
                }
            } else {
                console.log("Clearing assignment");
                updates.conductorName = '';
                updates.conductorEmail = '';
                updates.assignedTo = null;
            }
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

module.exports = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    approveEvent
};
