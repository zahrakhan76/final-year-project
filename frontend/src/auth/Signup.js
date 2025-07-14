import React, { useState } from "react";
import { signupWithEmail, loginWithGoogle } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, TextField, Button } from "@mui/material";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const user = await signupWithEmail(email, password);
      navigate("/select-role", { state: { uid: user.uid } });
    } catch (error) {
      console.error("Signup error:", error);
      alert("Signup failed. Please try again.");
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const user = await loginWithGoogle();
      navigate("/select-role", { state: { uid: user.uid } });
    } catch (error) {
      console.error("Google signup error:", error);
      alert("Google signup failed. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        backgroundImage: "url('/hero image.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#F0F2F5",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          padding: "30px",
          borderRadius: "12px",
          maxWidth: "400px",
          textAlign: "center",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: "#333",
            fontWeight: "bold",
            marginBottom: "20px",
          }}
        >
          Signup
        </Typography>
        <form onSubmit={handleSignup}>
          <TextField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            sx={{ marginBottom: "20px" }}
          />
          <TextField
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            sx={{ marginBottom: "20px" }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Sign Up
          </Button>
        </form>
        <Button
          onClick={handleGoogleSignup}
          variant="outlined"
          color="secondary"
          fullWidth
          sx={{ marginTop: "20px" }}
        >
          Sign Up with Google
        </Button>
      </Paper>
    </Box>
  );
};

export default Signup;