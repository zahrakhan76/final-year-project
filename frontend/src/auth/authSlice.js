import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  token: null, // Added token to state
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('token', token); // Store token in localStorage
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token'); // Remove token from localStorage
    },
    setUserFromToken(state, action) {
      const { user } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
    },
  },
});

export const { login, logout, setUserFromToken } = authSlice.actions;
export default authSlice.reducer;