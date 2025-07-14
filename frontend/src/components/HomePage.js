import React, { useEffect, useState } from "react";
import { Button, Typography, Box, Paper, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../api/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import "../App.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDoc);
          if (userSnapshot.exists()) {
            const data = userSnapshot.data();
            setUserData(data);
            if (data.role === "brand") {
              navigate("/brand-dashboard");
            } else if (data.role === "influencer") {
              navigate("/influencer-dashboard");
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user, navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#F0F2F5",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    if (userData) {
      if (!userData.role) {
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
              backgroundColor: "#F0F2F5",
            }}
          >
            <Typography variant="h6" sx={{ color: "#65676B" }}>
              Unable to determine your role. Please contact support.
            </Typography>
          </Box>
        );
      }
      return (
        <Box
          sx={{
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
            elevation={3}
            sx={{
              padding: "30px",
              borderRadius: "12px",
              maxWidth: "500px",
              textAlign: "center",
            }}
          >
            <Typography variant="h4" gutterBottom sx={{ color: "#050505" }}>
              Welcome Back, {userData.name}!
            </Typography>
            <Typography variant="body1" sx={{ color: "#65676B", marginBottom: "10px" }}>
              <strong>Role:</strong> {userData.role}
            </Typography>
            <Typography variant="body1" sx={{ color: "#65676B", marginBottom: "20px" }}>
              <strong>Email:</strong> {user.email}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ padding: "10px 20px" }}
              onClick={() => {
                if (userData.role === "brand") {
                  navigate("/brand-dashboard");
                } else if (userData.role === "influencer") {
                  navigate("/influencer-dashboard");
                }
              }}
            >
              Go to Dashboard
            </Button>
          </Paper>
        </Box>
      );
    }
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#F0F2F5",
        }}
      >
        <Typography variant="h6" sx={{ color: "#65676B" }}>
          Loading your data...
        </Typography>
      </Box>
    );
  }

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
          maxWidth: "600px",
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
          Welcome to Flumers.AI
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "#555",
            marginBottom: "20px",
          }}
        >
          The next-generation AI-powered influencer marketing platform.
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            sx={{
              margin: "0 10px",
              padding: "10px 20px",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            sx={{
              margin: "0 10px",
              padding: "10px 20px",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/signup")}
          >
            Signup
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default HomePage;