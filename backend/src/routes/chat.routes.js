const express = require('express');
const { authUser } = require('../middlewares/auth.middlewares');
const { createChat } = require('../controllers/chat.controller');

const router = express.Router();

router.post('/', authUser, createChat)

module.exports = router;