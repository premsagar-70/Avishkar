const { db } = require('../config/firebase');

async function testFilter() {
    console.log("Starting filter verification...");
    try {
        // 1. Get the latest event
        const eventsSnap = await db.collection('events').orderBy('createdAt', 'desc').limit(1).get();
        if (eventsSnap.empty) return;
        const eventDoc = eventsSnap.docs[0];
        const eventData = eventDoc.data();
        console.log("Event:", eventData.title);

        if (!eventData.enableMultiDepartment) {
            console.log("Not multi-dept.");
            return;
        }

        console.log("Dept Organizers:", eventData.departmentOrganizers);

        // Pick an organizer ID from the map to simulate "CurrentUser"
        const departments = Object.keys(eventData.departmentOrganizers);
        if (departments.length === 0) return;

        const targetDept = departments[0];
        const targetOrganizerId = eventData.departmentOrganizers[targetDept];
        console.log(`Simulating Organizer: ${targetOrganizerId} for Dept: ${targetDept}`);

        // Logic from EventParticipants.jsx
        const myDept = Object.keys(eventData.departmentOrganizers).find(
            key => eventData.departmentOrganizers[key] === targetOrganizerId
        );
        console.log("Found Dept for Organizer:", myDept);

        if (myDept !== targetDept) {
            console.error("MISMATCH! Logic is flawed.");
        } else {
            console.log("Logic appears correct.");
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testFilter();
