import React from "react";
import { Button, Typography, Box } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { setUserRole } from "../api/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../api/firebaseConfig";

const SelectRole = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uid } = location.state || {};

  const handleRoleSelection = async (role) => {
    try {
      await setUserRole(uid, role);
      navigate("/user-info", { state: { role } });
    } catch (error) {
      console.error("Error setting role:", error);
      alert("Failed to set role. Please try again.");
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        await setDoc(userDoc, { role }, { merge: true });
        console.log(`Role ${role} has been saved to Firestore.`);
      } else {
        console.error("No user is currently logged in.");
      }
    } catch (error) {
      console.error("Error saving role to Firestore:", error);
    }
  };

  return (
    <Box
      sx={{
        textAlign: "center",
        marginTop: "50px",
        padding: "20px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        maxWidth: "500px",
        margin: "50px auto",
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: "#050505" }}>
        Select Your Role
      </Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        sx={{ margin: 2, padding: "10px 20px" }}
        onClick={() => handleRoleSelection("influencer")}
      >
        Influencer
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        size="large"
        sx={{ margin: 2, padding: "10px 20px" }}
        onClick={() => handleRoleSelection("brand")}
      >
        Brand
      </Button>
    </Box>
  );
};

export default SelectRole;