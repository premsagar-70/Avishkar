const { db } = require('../config/firebase');

async function checkSettings() {
    try {
        const doc = await db.collection('settings').doc('global').get();
        if (!doc.exists) {
            console.log("Document 'settings/global' does NOT exist.");
        } else {
            console.log("Document 'settings/global' data:", JSON.stringify(doc.data(), null, 2));
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
}

checkSettings();
