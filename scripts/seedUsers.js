const { auth, db } = require('../config/firebase');

const users = [
    {
        email: 'admin@aviskhar.com',
        password: 'password123',
        displayName: 'Admin User',
        role: 'admin'
    },
    {
        email: 'conductor@aviskhar.com',
        password: 'password123',
        displayName: 'Event Conductor',
        role: 'conductor'
    },
    {
        email: 'student@aviskhar.com',
        password: 'password123',
        displayName: 'Student Participant',
        role: 'participant'
    }
];

const seedUsers = async () => {
    console.log('Seeding users...');

    for (const user of users) {
        try {
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(user.email);
                console.log(`User ${user.email} already exists.`);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await auth.createUser({
                        email: user.email,
                        password: user.password,
                        displayName: user.displayName,
                    });
                    console.log(`Created user: ${user.email}`);
                } else {
                    throw error;
                }
            }

            // Set custom claims for role (optional but good for security rules)
            await auth.setCustomUserClaims(userRecord.uid, { role: user.role });

            // Create/Update Firestore document
            await db.collection('users').doc(userRecord.uid).set({
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                createdAt: new Date(),
                uid: userRecord.uid
            }, { merge: true });

            console.log(`Updated Firestore for ${user.email} with role ${user.role}`);

        } catch (error) {
            console.error(`Failed to process ${user.email}:`, error);
        }
    }

    console.log('Seeding complete.');
    process.exit(0);
};

seedUsers();
