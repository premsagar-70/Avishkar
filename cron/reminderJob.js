const cron = require('node-cron');
const { db } = require('../config/firebase');
const mailSender = require('../services/mailSender');

const scheduleReminders = () => {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log("Running Event Reminder Job...");
        try {
            const now = new Date();
            const twoDaysFromNow = new Date(now);
            twoDaysFromNow.setDate(now.getDate() + 2);

            // Format date to YYYY-MM-DD for comparison
            const targetDate = twoDaysFromNow.toISOString().split('T')[0];

            console.log(`Checking for events on ${targetDate}`);

            const eventsSnapshot = await db.collection('events').where('date', '==', targetDate).get();

            if (eventsSnapshot.empty) {
                console.log("No events found for reminder.");
                return;
            }

            for (const doc of eventsSnapshot.docs) {
                const event = doc.data();
                const eventId = doc.id;

                // Get participants
                const registrationsSnapshot = await db.collection('registrations')
                    .where('eventId', '==', eventId)
                    .where('status', '==', 'approved') // Only approved participants
                    .get();

                if (registrationsSnapshot.empty) continue;

                console.log(`Sending reminders for event: ${event.title} (${registrationsSnapshot.size} participants)`);

                for (const regDoc of registrationsSnapshot.docs) {
                    const registration = regDoc.data();
                    const email = registration.email;

                    if (email) {
                        await mailSender(
                            email,
                            `Reminder: ${event.title} is coming up!`,
                            `<p>Hello ${registration.name || 'Participant'},</p>
                             <p>This is a friendly reminder that <strong>${event.title}</strong> is scheduled for <strong>${event.date}</strong> at <strong>${event.venue}</strong>.</p>
                             <p>We look forward to seeing you there!</p>
                             <p>Best regards,<br>Aviskahr Team</p>`
                        );
                    }
                }
            }
        } catch (error) {
            console.error("Error in reminder job:", error);
        }
    });
};

module.exports = scheduleReminders;
