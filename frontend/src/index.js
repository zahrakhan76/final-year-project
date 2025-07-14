import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from "@mui/material/styles";
import theme from "./styles/theme";
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import authReducer from './auth/authSlice';
import chatReducer from './features/chat/chatSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals.console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
