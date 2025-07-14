import { createSlice } from '@reduxjs/toolkit';

const profileSlice = createSlice({
    name: 'profile',
    initialState: {
        userProfile: {
            name: 'John Doe',
            email: 'john.doe@example.com'
        }
    },
    reducers: {
        selectUserProfile: (state) => state.userProfile
    }
});

export const { selectUserProfile } = profileSlice.actions;
export default profileSlice.reducer;