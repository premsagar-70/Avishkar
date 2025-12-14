const { db } = require('../config/firebase');
const { deleteFromGitHub } = require('../services/githubService');

const createEvent = async (req, res) => {
    try {
        const { title, date, description, venue, imageUrl, createdBy, role, price, category } = req.body;
        const newEvent = {
            title,
            date,
            description,
            venue,
            imageUrl,
            price,
            category,
            createdBy: createdBy || 'admin',
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
        const { role } = req.query;
        let query = db.collection('events');

        if (role !== 'admin') {
            query = query.where('status', '==', 'approved');
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
        await db.collection('events').doc(req.params.id).update(req.body);
        res.status(200).json({ id: req.params.id, ...req.body });
    } catch (error) {
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
