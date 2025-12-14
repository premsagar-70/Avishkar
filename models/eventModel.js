const { db } = require('../config/firebase');

// Firestore doesn't have a strict schema like Mongoose, 
// but we can create a helper class to handle data operations.

class Event {
    constructor(data) {
        this.title = data.title;
        this.description = data.description;
        this.date = data.date;
        this.venue = data.venue;
        this.category = data.category; // technical, non-technical, cultural, workshop
        this.imageUrl = data.imageUrl;
        this.price = data.price;
        this.createdAt = new Date();
    }

    static async create(data) {
        const eventData = { ...data, createdAt: new Date() };
        const docRef = await db.collection('events').add(eventData);
        return { id: docRef.id, ...eventData };
    }

    static async findAll() {
        const snapshot = await db.collection('events').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    static async findById(id) {
        const doc = await db.collection('events').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    static async update(id, data) {
        await db.collection('events').doc(id).update(data);
        return { id, ...data };
    }

    static async delete(id) {
        await db.collection('events').doc(id).delete();
        return true;
    }
}

module.exports = Event;
