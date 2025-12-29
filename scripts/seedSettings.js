const { db } = require('../config/firebase');

async function seedSettings() {
    try {
        const defaults = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'MBA', 'MCA', 'Others'];
        await db.collection('settings').doc('global').set({
            departments: defaults
        }, { merge: true });
        console.log("Seeded departments successfully.");
    } catch (error) {
        console.error("Error seeding settings:", error);
    }
}

seedSettings();
