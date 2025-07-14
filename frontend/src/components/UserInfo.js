import React, { useState } from "react";
import { Box, TextField, Button, Typography, MenuItem, Checkbox, FormControlLabel } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../api/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

// Utility function to format numbers into K/M format
const formatNumber = (num) => {
  if (!num || isNaN(num)) return num;
  const number = parseInt(num, 10);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toString();
};

const checkUsernameUnique = async (username) => {
  const userDoc = doc(db, "usernames", username);
  const userSnapshot = await getDoc(userDoc);
  return !userSnapshot.exists();
};

const UserInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = location.state || {};
  const [formData, setFormData] = useState({});
  const [user] = useAuthState(auth);
  const [platforms, setPlatforms] = useState({
    youtube: false,
    instagram: false,
    tiktok: false,
    twitter: false,
    facebook: false,
  });
  const [platformData, setPlatformData] = useState({
    youtube: { followers: "", watchTime: "", link: "" },
    instagram: { followers: "", watchTime: "", link: "" },
    tiktok: { followers: "", watchTime: "", link: "" },
    twitter: { followers: "", watchTime: "", link: "" },
    facebook: { followers: "", watchTime: "", link: "" },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePlatformToggle = (platform) => {
    setPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  // Update the handlePlatformDataChange function to format followers
  const handlePlatformDataChange = (platform, field, value) => {
    setPlatformData((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: field === "followers" ? formatNumber(value) : value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === "influencer" || role === "brand") {
      const isUnique = await checkUsernameUnique(formData.username);
      if (!isUnique) {
        alert("Username already exists. Please choose a different username.");
        return;
      }
    }

    try {
      if (!user) {
        throw new Error("User is not authenticated");
      }
      const userDoc = doc(db, "users", user.uid);
      const usernameDoc = doc(db, "usernames", formData.username);
      await setDoc(userDoc, { ...formData, platforms: platformData }, { merge: true });
      await setDoc(usernameDoc, { uid: user.uid });
      alert("Your information has been saved.");
      navigate("/login");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save your information. Please try again.");
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
        maxWidth: "600px",
        margin: "50px auto",
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: "#050505" }}>
        {role === "influencer" ? "Influencer Information" : "Brand Information"}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Name"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Username"
          name="username"
          value={formData.username || ""}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Age"
          name="age"
          type="number"
          value={formData.age || ""}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        {role === "influencer" && (
          <>
            <TextField
              select
              label="Niche"
              name="niche"
              value={formData.niche || ""}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            >
              <MenuItem value="baby_products">Baby Products</MenuItem>
              <MenuItem value="beauty_health">Beauty & Health</MenuItem>
              <MenuItem value="clothing_accessories_jewellery">Clothing, Accessories & Jewellery</MenuItem>
              <MenuItem value="electronics">Electronics</MenuItem>
              <MenuItem value="grocery">Grocery</MenuItem>
              <MenuItem value="hobby_arts_stationery">Hobby, Arts & Stationery</MenuItem>
              <MenuItem value="home_kitchen_tools">Home, Kitchen & Tools</MenuItem>
              <MenuItem value="pet_supplies">Pet Supplies</MenuItem>
              <MenuItem value="sports_outdoor">Sports & Outdoor</MenuItem>
            </TextField>
            <Typography variant="h5" gutterBottom sx={{ color: "#050505", marginTop: "20px" }}>
              Select Platforms
            </Typography>
            {Object.keys(platforms).map((platform) => (
              <FormControlLabel
                key={platform}
                control={
                  <Checkbox
                    checked={platforms[platform]}
                    onChange={() => handlePlatformToggle(platform)}
                  />
                }
                label={platform.charAt(0).toUpperCase() + platform.slice(1)}
              />
            ))}

            {Object.keys(platforms).map(
              (platform) =>
                platforms[platform] && (
                  <Box key={platform} sx={{ marginTop: "20px" }}>
                    <Typography variant="h6" gutterBottom>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)} Data
                    </Typography>
                    <TextField
                      label="Followers"
                      value={platformData[platform].followers}
                      onChange={(e) =>
                        handlePlatformDataChange(platform, "followers", e.target.value)
                      }
                      fullWidth
                      margin="normal"
                    />
                    <TextField
                      label="Watch Time"
                      value={platformData[platform].watchTime}
                      onChange={(e) =>
                        handlePlatformDataChange(platform, "watchTime", e.target.value)
                      }
                      fullWidth
                      margin="normal"
                    />
                    <TextField
                      label="Social Media Link"
                      value={platformData[platform].link}
                      onChange={(e) =>
                        handlePlatformDataChange(platform, "link", e.target.value)
                      }
                      fullWidth
                      margin="normal"
                      required
                    />
                  </Box>
                )
            )}
            <TextField
              label="Social Media Links"
              name="socialMediaLinks"
              value={formData.socialMediaLinks || ""}
              onChange={handleChange}
              fullWidth
              margin="normal"
              placeholder="e.g., Instagram: https://..."
              required
            />
          </>
        )}
        {role === "brand" && (
          <>
            <TextField
              label="Website"
              name="website"
              type="url"
              value={formData.website || ""}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Product"
              name="product"
              value={formData.product || ""}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              select
              label="Niche"
              name="niche"
              value={formData.niche || ""}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            >
              <MenuItem value="baby_products">Baby Products</MenuItem>
              <MenuItem value="beauty_health">Beauty & Health</MenuItem>
              <MenuItem value="clothing_accessories_jewellery">Clothing, Accessories & Jewellery</MenuItem>
              <MenuItem value="electronics">Electronics</MenuItem>
              <MenuItem value="grocery">Grocery</MenuItem>
              <MenuItem value="hobby_arts_stationery">Hobby, Arts & Stationery</MenuItem>
              <MenuItem value="home_kitchen_tools">Home, Kitchen & Tools</MenuItem>
              <MenuItem value="pet_supplies">Pet Supplies</MenuItem>
              <MenuItem value="sports_outdoor">Sports & Outdoor</MenuItem>
            </TextField>
          </>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          sx={{ marginTop: 2, padding: "10px 20px" }}
        >
          Submit
        </Button>
      </form>
    </Box>
  );
};

export default UserInfo;