import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        messages: [],
        notifications: [],
        users: []
    },
    reducers: {
        fetchMessages: (state, action) => {
            state.messages = action.payload;
        },
        sendMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        fetchNotifications: (state, action) => {
            state.notifications = action.payload;
        },
        fetchUsers: (state, action) => {
            state.users = action.payload;
        }
    }
});

export const { fetchMessages, sendMessage, fetchNotifications, fetchUsers } = chatSlice.actions;
export default chatSlice.reducer;