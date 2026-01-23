const { db, admin } = require('../config/firebase');

const exportEvents = async (req, res) => {
    try {
        const eventsSnapshot = await db.collection('events').get();
        const events = [];
        eventsSnapshot.forEach(doc => {
            events.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Convert to JSON and send as file
        const jsonContent = JSON.stringify(events, null, 2);
        const fileName = `events_export_${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(jsonContent);

    } catch (error) {
        console.error('Error exporting events:', error);
        res.status(500).json({ error: 'Failed to export events' });
    }
};

const importEvents = async (req, res) => {
    try {
        const events = req.body;

        if (!Array.isArray(events)) {
            return res.status(400).json({ error: 'Invalid format. Expected a JSON array of events.' });
        }

        const batchSize = 500;
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;

        for (const event of events) {
            if (!event.id) {
                // If no ID is provided, create a ref with auto-ID
                const newDocRef = db.collection('events').doc();
                batch.set(newDocRef, event);
            } else {
                // Use existing ID
                const docRef = db.collection('events').doc(event.id);
                // Remove id from data to avoid duplication inside the document if desired,
                // but usually it's fine. We'll strip it just in case to be clean.
                const { id, ...eventData } = event;
                batch.set(docRef, eventData);
            }

            count++;
            if (count >= batchSize) {
                await batch.commit();
                batch = db.batch();
                count = 0;
                batchCount++;
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        res.status(200).json({ message: `Successfully imported ${events.length} events.` });

    } catch (error) {
        console.error('Error importing events:', error);
        res.status(500).json({ error: 'Failed to import events' });
    }
};

const { deleteOldEvents } = require('../services/cleanupService');

const cleanupData = async (req, res) => {
    try {
        await deleteOldEvents();
        res.status(200).json({ message: 'Cleanup process completed successfully.' });
    } catch (error) {
        console.error('Error running cleanup:', error);
        res.status(500).json({ error: 'Failed to run cleanup process.' });
    }
};

module.exports = {
    exportEvents,
    importEvents,
    cleanupData
};
