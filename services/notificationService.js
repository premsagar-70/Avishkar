const { admin, db } = require('../config/firebase');

const sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        if (!userId) return;

        // console.log(`[NotificationService] Fetching tokens for user: ${userId}`);
        // 1. Fetch user's FCM tokens
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`[NotificationService] User ${userId} not found.`);
            return;
        }

        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens || [];

        if (fcmTokens.length === 0) {
            console.log(`[NotificationService] No tokens found for user ${userId}`);
            return;
        }

        // 2. Prepare message (Data-only to prevent duplicate notifications)
        const message = {
            data: {
                title: String(title),
                body: String(body),
                url: data.url ? String(data.url) : '/',
                eventId: data.eventId ? String(data.eventId) : '',
                ...data // spread other data if any
            },
            tokens: fcmTokens,
        };

        // 3. Send Multicast Message
        // console.log(`[NotificationService] Sending push to ${fcmTokens.length} tokens...`);
        const response = await admin.messaging().sendEachForMulticast(message);
        // console.log(`[NotificationService] Send response: Success=${response.successCount}, Failure=${response.failureCount}`);

        // 4. Cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    // Check for invalid-registration-token error code
                    const code = resp.error?.code;
                    console.error(`[NotificationService] Token failed: ${fcmTokens[idx]}`, code, resp.error);
                    if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
                        failedTokens.push(fcmTokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                await db.collection('users').doc(userId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
                console.log(`Cleaned up ${failedTokens.length} invalid FCM tokens for user ${userId}`);
            }
        }
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
};

const cleanupReadNotifications = async (userId) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Firestore query: Read = true AND CreatedAt < 24h ago
        // Note: Field equality check + Range check usually requires composite index.
        // If index is missing, Firestore might complain. 
        // Safer approach if no index: Query userId + read==true, then filter in memory for old dates.
        // Given typically low notification count per user, in-memory filter is fine.

        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('read', '==', true)
            .get();

        if (snapshot.empty) return;

        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            // Check formatted date or timestamp
            let createdAt = data.createdAt;
            if (createdAt && createdAt.toDate) {
                createdAt = createdAt.toDate();
            } else {
                createdAt = new Date(createdAt); // Fallback
            }

            if (createdAt < oneDayAgo) {
                batch.delete(doc.ref);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`[NotificationService] Cleaned up ${count} old read notifications for user ${userId}`);
        }
    } catch (error) {
        console.error("Error cleaning up notifications:", error);
    }
};

module.exports = { sendPushNotification, cleanupReadNotifications };
