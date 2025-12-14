const { db } = require('../config/firebase');

const markAttendance = async (req, res) => {
    try {
        const { qrCode, eventId } = req.body;

        // Assuming QR code contains userId or registrationId
        // For this MVP, let's assume it's the userId
        const userId = qrCode;

        if (!userId || !eventId) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        // Check if user is registered for the event
        // This requires a 'registrations' collection which we haven't explicitly created yet
        // For now, let's just log it in an 'attendance' collection

        const attendanceRef = db.collection('attendance');
        const snapshot = await attendanceRef
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .get();

        if (!snapshot.empty) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        await attendanceRef.add({
            userId,
            eventId,
            timestamp: new Date(),
            status: 'present'
        });

        res.status(200).json({ message: 'Attendance marked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { markAttendance };
