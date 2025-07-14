import React, { useState, useRef } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import axios from "axios";
import "./Chat.css";
import logo from "../../logo.png";

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatbotRef = useRef(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);

  const toggleChatbox = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    const userMessage = { sender: "user", content: newMessage };
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");

    try {
      const response = await axios.post("http://localhost:8000/api/chatbot/chat/", { message: newMessage }); // Updated URL
      const botMessage = { sender: "bot", content: response.data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { sender: "bot", content: "Sorry, I couldn't process your request." };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    chatbotRef.current.startX = e.clientX - position.x;
    chatbotRef.current.startY = e.clientY - position.y;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - chatbotRef.current.startX,
      y: e.clientY - chatbotRef.current.startY,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <Box
      ref={chatbotRef}
      onMouseDown={handleMouseDown}
      sx={{
        position: "fixed",
        left: "20px", // Default position to bottom-left corner
        bottom: "20px",
        zIndex: 1000,
        cursor: dragging ? "grabbing" : "grab",
        width: "100px", // Increased size
        height: "100px",
      }}
    >
      {/* Floating Button */}
      {!isOpen && (
        <Button
          variant="contained"
          color="primary"
          onClick={toggleChatbox}
          sx={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
            padding: 0,
            backgroundImage: "url('/hero image.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <img
            src={logo}
            alt="Chatbot Icon"
            style={{ width: "100%", height: "100%", borderRadius: "50%" }}
          />
        </Button>
      )}

      {/* Chatbox */}
      {isOpen && (
        <Box
          sx={{
            position: "absolute", // Ensure it opens relative to the button
            bottom: "110px", // Adjust to open above the button
            left: "0px", // Align with the button
            width: "300px",
            height: "400px",
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              backgroundColor: "#1976d2",
              color: "#fff",
              padding: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Chatbot</Typography>
            <Button
              onClick={toggleChatbox}
              sx={{ color: "#fff", minWidth: "auto" }}
            >
              ✖
            </Button>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              padding: "10px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.sender === "user" ? "#dcf8c6" : "#f0f0f0",
                  padding: "10px",
                  borderRadius: "10px",
                  maxWidth: "80%",
                }}
              >
                <Typography>{msg.content}</Typography>
              </Box>
            ))}
          </Box>

          {/* Input */}
          <Box
            sx={{
              display: "flex",
              padding: "10px",
              borderTop: "1px solid #ddd",
            }}
          >
            <TextField
              fullWidth
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              sx={{ marginLeft: "10px" }}
            >
              Send
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FloatingChatbot;
