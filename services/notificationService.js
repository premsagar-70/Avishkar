const admin = require('firebase-admin');
const { db } = require('../config/firebase');

const sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        if (!userId) return;

        console.log(`[NotificationService] Fetching tokens for user: ${userId}`);
        // 1. Fetch user's FCM tokens
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`[NotificationService] User ${userId} not found.`);
            return;
        }

        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens || [];
        console.log(`[NotificationService] Found ${fcmTokens.length} tokens for user ${userId}`);

        if (fcmTokens.length === 0) return;

        // 2. Prepare message
        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: data, // Add data payload
            tokens: fcmTokens,
        };

        // 3. Send Multicast Message
        const response = await admin.messaging().sendMulticast(message);
        console.log(`[NotificationService] Send response: Success=${response.successCount}, Failure=${response.failureCount}`);

        // 4. Cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[NotificationService] Token failed: ${fcmTokens[idx]}`, resp.error);
                    failedTokens.push(fcmTokens[idx]);
                }
            });

            if (failedTokens.length > 0) {
                await db.collection('users').doc(userId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
                console.log(`Cleaned up ${failedTokens.length} invalid FCM tokens for user ${userId}`);
            }
        }

        console.log(`Sent push notification to user ${userId}: ${title}`);
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
};

module.exports = { sendPushNotification };
