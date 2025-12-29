const { db } = require('../config/firebase');

async function testRemove() {
    console.log("Starting testRemove...");
    try {
        // 1. Get current
        const doc = await db.collection('settings').doc('global').get();
        let currentDepts = doc.data().departments || [];
        console.log("Current departments:", currentDepts);

        if (currentDepts.length === 0) {
            console.log("No departments to remove.");
            return;
        }

        // 2. Remove one (e.g. the last one)
        const removed = currentDepts.pop();
        console.log("Removing:", removed);
        console.log("New List to save:", currentDepts);

        // 3. Update (Simulation of what controller does)
        const updateData = { departments: currentDepts };
        await db.collection('settings').doc('global').set(updateData, { merge: true });
        console.log("Update executed.");

        // 4. Verify
        const doc2 = await db.collection('settings').doc('global').get();
        console.log("Updated departments after fetch:", doc2.data().departments);

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testRemove();
