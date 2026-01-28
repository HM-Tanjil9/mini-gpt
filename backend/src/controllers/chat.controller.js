const chatModel = require('../models/chat.model');

async function createChat(req, res) {
    const { title } = req.body;
    const user = req.user;
    const chat = await chatModel.create({ title, user: user._id });
    res.status(201).json({
        message: 'Chat created successfully',
        chat: {
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user
        }
    });
}

module.exports = { createChat };