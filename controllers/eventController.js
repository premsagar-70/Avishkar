const { db } = require('../config/firebase');
const { deleteFromGitHub } = require('../services/githubService');

const createEvent = async (req, res) => {
    try {
        const { title, date, description, venue, imageUrl, createdBy } = req.body;
        const newEvent = {
            title,
            date,
            description,
            venue,
            imageUrl,
            createdBy: createdBy || 'admin',
            status: 'pending', // Default status
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

        // If not admin, maybe filter? For now, return all or filter by status
        // if (role !== 'admin') {
        //    query = query.where('status', '==', 'approved');
        // }

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
            if (eventData.imageUrl) {
                await deleteFromGitHub(eventData.imageUrl);
            }
            await docRef.delete();
            res.status(200).json({ message: 'Event deleted successfully' });
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
