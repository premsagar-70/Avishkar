const { admin, db } = require('../config/firebase');

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

        if (fcmTokens.length === 0) {
            console.log(`[NotificationService] No tokens found for user ${userId}`);
            return;
        }

        // 2. Prepare message
        // Firebase Admin v13+ "sendEachForMulticast" expects { tokens: [], notification: {}, data: {} }
        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: data,
            tokens: fcmTokens,
        };

        // 3. Send Multicast Message
        console.log(`[NotificationService] Sending push to ${fcmTokens.length} tokens...`);
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[NotificationService] Send response: Success=${response.successCount}, Failure=${response.failureCount}`);

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

module.exports = { sendPushNotification };
