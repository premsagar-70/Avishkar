const { db, admin } = require('../config/firebase');
const { deleteFromGitHub } = require('./githubService');

const deleteOldEvents = async () => {
    try {
        const today = new Date();
        const cutoffDate = new Date(today.setFullYear(today.getFullYear() - 3));

        console.log(`[Cleanup] Running cleanup for events older than: ${cutoffDate.toISOString().split('T')[0]}`);

        // Since 'date' is stored as a string or ISO string, filtering might be tricky if formats vary.
        // But assuming standard ISO or YYYY-MM-DD, strict string comparison works for ISO.
        // Ideally, we fetch all and filter, or store timestamp. 
        // Let's fetch all events first for safety in this prototype, or perform a query if possible.
        // Firestore string comparison works if format is consistent (ISO).

        // Let's try to query by filtering in memory to be safe against date format variations.
        // Or better: 'year' field is string. 'date' is string.

        const snapshot = await db.collection('events').get();
        const eventsToDelete = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const eventDate = new Date(data.date); // Works for most formats
            if (eventDate < cutoffDate) {
                eventsToDelete.push({ id: doc.id, ...data });
            }
        });

        if (eventsToDelete.length === 0) {
            console.log('[Cleanup] No old events found.');
            return;
        }

        console.log(`[Cleanup] Found ${eventsToDelete.length} old events. Deleting...`);

        const batch = db.batch();

        for (const event of eventsToDelete) {
            const eventRef = db.collection('events').doc(event.id);

            // 1. Delete image from GitHub
            if (event.imageUrl) {
                await deleteFromGitHub(event.imageUrl).catch(err => console.error(`[Cleanup] Failed to delete image for ${event.id}`, err));
            }

            // 2. Delete registrations
            const registrations = await db.collection('registrations').where('eventId', '==', event.id).get();
            registrations.forEach(regDoc => {
                batch.delete(regDoc.ref);
            });

            // 3. Delete event
            batch.delete(eventRef);
        }

        await batch.commit();
        console.log(`[Cleanup] Successfully deleted ${eventsToDelete.length} events and their registrations.`);

    } catch (error) {
        console.error('[Cleanup] Error running cleanup:', error);
    }
};

module.exports = { deleteOldEvents };
