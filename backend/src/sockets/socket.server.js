const {Server} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../service/ai.service");
const messageModel = require("../models/messages.model");

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {});
    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || '');
        const token = cookies.token;
        if (!token) {
            return next(new Error("Unauthorized: No token provided"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id).select('-password');
            socket.user = user;
            next();
        } catch (error) {
            return next(new Error("Unauthorized: Invalid token"));
        }
    });
    io.on("connection", (socket) => {
        console.log("A user connected:", socket.user);
        console.log("New socket connection:", socket.id);
        socket.on('ai-message',async (messagePayload) => {
            console.log("message payload:", messagePayload);
            await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: messagePayload.content,
                role: 'user'
            });

            const chatHistory = await messageModel.find({
                chat: messagePayload.chat
            });
            console.log("chat history", chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{text: item.content
                        
                    }]
                }
            }));
            
            const response =await aiService.generateResponse(messagePayload.content);
            
            await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: 'model'
            });

            socket.emit('ai-response', { 
                content: response,
                chat: messagePayload.chat
            });
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
}

module.exports = { initSocketServer };