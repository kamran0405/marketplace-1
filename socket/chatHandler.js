// socket/chatHandler.js
const Chat = require('../models/Chat');

const chatHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join chat room + mark messages as delivered
    socket.on('join-chat', async ({ chatId, userId }) => {
      socket.join(chatId);
      socket.data.userId = userId;
      socket.data.chatId = chatId;

      try {
        const chat = await Chat.findOne({ chatId });
        if (chat) {
          // Mark all messages as delivered to this user
          let updated = false;
          chat.messages.forEach((msg) => {
            if (msg.senderId !== userId && !msg.deliveredTo.includes(userId)) {
              msg.deliveredTo.push(userId);
              updated = true;
            }
          });
          if (updated) await chat.save();
          socket.emit('chat-history', chat.messages);
          // Notify sender their messages were delivered
          socket.to(chatId).emit('messages-delivered', { userId });
        } else {
          socket.emit('chat-history', []);
        }
      } catch (err) {
        socket.emit('chat-history', []);
      }
    });

    // Send message (text or attachment)
    socket.on('send-message', async (data) => {
      const { chatId, message, buyerId, sellerId, productId, buyerName, sellerName } = data;
      try {
        const newMessage = {
          senderId: message.senderId,
          senderName: message.senderName,
          text: message.text || '',
          attachment: message.attachment || undefined,
          seenBy: [message.senderId],
          deliveredTo: [message.senderId],
        };

        const chat = await Chat.findOneAndUpdate(
          { chatId },
          {
            $push: { messages: newMessage },
            $set: {
              buyerId, sellerId, productId,
              buyerName: buyerName || '',
              sellerName: sellerName || '',
              lastMessage: new Date(),
            },
            $setOnInsert: { chatId },
          },
          { upsert: true, new: true }
        );

        const savedMsg = chat.messages[chat.messages.length - 1];

        // Broadcast to room
        io.to(chatId).emit('receive-message', savedMsg);

        // Mark as delivered to anyone else already in the room
        const socketsInRoom = await io.in(chatId).fetchSockets();
        socketsInRoom.forEach(async (s) => {
          if (s.data.userId && s.data.userId !== message.senderId) {
            if (!savedMsg.deliveredTo.includes(s.data.userId)) {
              savedMsg.deliveredTo.push(s.data.userId);
            }
          }
        });
        await chat.save();

      } catch (err) {
        console.error('[Socket] Error saving message:', err.message);
        socket.emit('chat-error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as seen
    socket.on('mark-seen', async ({ chatId, userId }) => {
      try {
        const chat = await Chat.findOne({ chatId });
        if (!chat) return;
        let updated = false;
        chat.messages.forEach((msg) => {
          if (msg.senderId !== userId && !msg.seenBy.includes(userId)) {
            msg.seenBy.push(userId);
            updated = true;
          }
        });
        if (updated) {
          await chat.save();
          socket.to(chatId).emit('messages-seen', { userId });
        }
      } catch (err) {
        console.error('[Socket] mark-seen error:', err.message);
      }
    });

    // Typing indicators
    socket.on('typing', ({ chatId, senderName }) => {
      socket.to(chatId).emit('user-typing', { senderName });
    });
    socket.on('stop-typing', ({ chatId }) => {
      socket.to(chatId).emit('user-stop-typing');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = chatHandler;