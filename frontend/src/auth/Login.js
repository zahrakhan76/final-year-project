import React, { useState } from "react";
import { loginWithEmail, loginWithGoogle } from "../api/auth";
import { TextField, Button, Typography, Snackbar, Alert, Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getUserRole } from "../api/firebaseConfig";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await loginWithEmail(email, password);
      if (!user || !user.uid) {
        throw new Error("Invalid user object returned from login.");
      }
      localStorage.setItem("uid", user.uid);
      const role = await getUserRole(user.uid);
      if (!role) {
        throw new Error("User role not found. Please contact support.");
      }
      localStorage.setItem("role", role);
      if (role === "brand") {
        navigate("/brand-dashboard");
      } else if (role === "influencer") {
        navigate("/influencer-dashboard");
      } else {
        throw new Error("Unknown role. Please contact support.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message || "Login failed. Please try again.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (!user || !user.uid) {
        throw new Error("Invalid user object returned from Google login.");
      }
      localStorage.setItem("uid", user.uid);
      const role = await getUserRole(user.uid);
      if (!role) {
        throw new Error("User role not found. Please contact support.");
      }
      localStorage.setItem("role", role);
      if (role === "brand") {
        navigate("/brand-dashboard");
      } else if (role === "influencer") {
        navigate("/influencer-dashboard");
      } else {
        throw new Error("Unknown role. Please contact support.");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Google login failed. Please try again.");
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
          Login
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ marginBottom: "20px" }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ marginBottom: "20px" }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Login
          </Button>
        </form>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          sx={{ marginTop: "20px" }}
          onClick={handleGoogleLogin}
        >
          Login with Google
        </Button>
        <Typography variant="body2" sx={{ marginTop: "20px" }}>
          Don't have an account? <Button color="primary" onClick={() => navigate('/signup')}>Sign up</Button>
        </Typography>
      </Paper>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;