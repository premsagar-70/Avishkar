const { db } = require('../config/firebase');

async function testFetch() {
    console.log("Starting verification...");
    try {
        // 1. Get the latest event (mocking the event prop)
        const eventsSnap = await db.collection('events').orderBy('createdAt', 'desc').limit(1).get();
        if (eventsSnap.empty) {
            console.log("No events found.");
            return;
        }
        const eventDoc = eventsSnap.docs[0];
        const eventData = eventDoc.data();
        console.log("Event:", eventData.title);
        console.log("Multi-Dept Enabled:", eventData.enableMultiDepartment);
        console.log("Dept Organizers:", eventData.departmentOrganizers);

        if (!eventData.enableMultiDepartment) {
            console.log("Not multi-dept. AssignedTo:", eventData.assignedTo);
            return;
        }

        // 2. Simulate selecting a department (pick first key)
        const depts = Object.keys(eventData.departmentOrganizers || {});
        if (depts.length === 0) {
            console.log("No departments configured!");
            return;
        }
        const selectedDept = depts[0];
        const organizerId = eventData.departmentOrganizers[selectedDept];
        console.log(`Selected Dept: ${selectedDept} -> OrganizerId: ${organizerId}`);

        if (!organizerId) {
            console.log("Organizer ID is empty/null.");
            return;
        }

        // 3. Fetch User (Simulating api.get(/users/:id))
        const userDoc = await db.collection('users').doc(organizerId).get();
        if (!userDoc.exists) {
            console.log("User doc not found!");
        } else {
            console.log("User Data Found:", userDoc.data());
            const userData = userDoc.data();
            console.log("Display Info -> Name:", userData.name, "Mobile:", userData.mobileNumber, "UPI:", userData.upiId);
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testFetch();
