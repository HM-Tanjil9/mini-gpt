const {Server} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

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


        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
}

module.exports = { initSocketServer };