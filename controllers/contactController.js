const { db, admin } = require('../config/firebase');

// Submit a new contact message
const submitContactForm = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newMessage = {
            name,
            email,
            message,
            createdAt: new Date().toISOString(),
            read: false
        };

        const docRef = await db.collection('contact_messages').add(newMessage);

        res.status(201).json({ message: 'Message sent successfully', id: docRef.id });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// Get all contact messages (Admin only)
const getContactMessages = async (req, res) => {
    try {
        const snapshot = await db.collection('contact_messages').orderBy('createdAt', 'desc').get();
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// Mark a message as read (Admin only)
const markMessageRead = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('contact_messages').doc(id).update({ read: true });
        res.status(200).json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
};

module.exports = {
    submitContactForm,
    getContactMessages,
    markMessageRead
};
