const {Server} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { generateResponse, generateVector} = require("../service/ai.service");
const messageModel = require("../models/messages.model");
const { createMemory, queryMemory, getIndexStats } = require("../service/vector.service");

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
        console.log("User connected :", socket.user.email);
        socket.on('ai-message', async (messagePayload) => {
            const message = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: messagePayload.content,
                role: 'user'
            });

            const messageVectors = await generateVector(messagePayload.content);

            const memory = await queryMemory({
                queryVector: messageVectors,
                limit: 3,
                metadata: {
                    user: socket.user._id
                }
            });

            console.log("memory query results:", memory);

            await createMemory({
                vectors: messageVectors,
                messageId: message._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: messagePayload.content
                }
            });
            
            const chatHistory = (await messageModel.find({
                chat: messagePayload.chat
            }).sort({ createdAt: -1 }).limit(20).lean()).reverse();

            const stm = chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [{text: item.content}]
                }
            })
            // console.log("stm:", stm);

            const ltm = [
                {
                    role: 'system',
                    parts: [{ text: `The following pieces of context are relevant to the conversation:\n${memory.map(m => m.metadata.text).join('\n')}`}]
                }
            ]
            console.log("stm:");
            console.dir({ stm }, { depth: null });
            console.log("ltm:");
            console.dir({ ltm }, { depth: null });
            

            const response = await generateResponse([...ltm, ...stm]);
            
            const responseMessage = await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: 'model'
            });

            const responseVectors = await generateVector(response);
            
            await createMemory({
                vectors: responseVectors,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: response
                }
            })

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