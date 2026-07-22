import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'bot'],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        default: Date.now
    }
});

const chatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One chat document per user containing their history
    },
    messages: [messageSchema]
}, {
    timestamps: true
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
