const { db } = require('../config/firebase');

const getSettings = async (req, res) => {
    try {
        const doc = await db.collection('settings').doc('global').get();
        if (!doc.exists) {
            // Return defaults if not set
            return res.status(200).json({
                registrationDeadline: new Date('2025-12-25').toISOString()
            });
        }
        res.status(200).json(doc.data());
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { registrationDeadline } = req.body;
        await db.collection('settings').doc('global').set({
            registrationDeadline
        }, { merge: true });
        res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getSettings, updateSettings };
