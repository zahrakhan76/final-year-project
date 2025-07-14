import React, { useState, useEffect } from "react";
import { Container, Typography, TextField, Button, MenuItem, Box, Card, Avatar, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { db } from "../../api/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

const formatNumber = (num) => {
  if (!num || isNaN(num)) return num;
  const number = parseInt(num, 10);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toString();
};

const formatImageUrl = (url) => {
  return decodeURIComponent(url || "/dp.png"); // Decode URL and use placeholder if invalid
};

const SearchInfluencers = () => {
  const [influencers, setInfluencers] = useState([]);
  const [filters, setFilters] = useState({
    followers: "",
    platform: "",
    niche: "",
    search: "",
  });
  const [openPopup, setOpenPopup] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [aiRequestPopup, setAiRequestPopup] = useState(false);
  const [aiRequestForm, setAiRequestForm] = useState({
    modelType: "",
    description: "",
    contactInfo: "",
  });
  const [brandImage, setBrandImage] = useState(null);

  const handleOpenPopup = () => setOpenPopup(true);
  const handleClosePopup = () => setOpenPopup(false);

  const handleAiRequestOpen = () => setAiRequestPopup(true);
  const handleAiRequestClose = () => setAiRequestPopup(false);

  const handleAiRequestChange = (e) => {
    const { name, value } = e.target;
    setAiRequestForm({ ...aiRequestForm, [name]: value });
  };

  const handleAiRequestSubmit = () => {
    if (!aiRequestForm.modelType || !aiRequestForm.description || !aiRequestForm.contactInfo) {
      alert("Please fill out all fields before submitting.");
      return;
    }

    console.log("AI Request Submitted:", aiRequestForm);
    handleAiRequestClose();
  };

  const handleProceedSearching = async () => {
    if (!brandImage) {
      alert("Please upload an image before proceeding.");
      return;
    }

    const formData = new FormData();
    formData.append("image", brandImage);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/classify/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to classify the image. Please try again.");
      }

      const data = await response.json();
      const { category } = data;

      setFilters({ ...filters, niche: category });
      handleClosePopup();
    } catch (error) {
      console.error("Error during image classification:", error);
      alert("An error occurred while processing the image. Please try again.");
    }
  };

  useEffect(() => {
    const fetchInfluencers = async () => {
      const influencersRef = collection(db, "users");
      const q = query(influencersRef, where("role", "==", "influencer"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const influencer = { id: doc.id, ...doc.data() };

        if (influencer.platforms) {
          const highestPlatform = Object.entries(influencer.platforms).reduce(
            (max, [platform, details]) => {
              const followers = parseInt(details.followers || 0, 10);
              return followers > max.followers ? { platform, followers } : max;
            },
            { platform: "Not available", followers: 0 }
          );

          influencer.platform = highestPlatform.platform;
          influencer.followers = formatNumber(highestPlatform.followers);
        } else {
          influencer.platform = "Not available";
          influencer.followers = "Not available";
        }

        return influencer;
      });
      setInfluencers(data);
    };

    fetchInfluencers();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const filteredInfluencers = influencers.filter((influencer) => {
    return (
      (!filters.followers || influencer.followers >= filters.followers) &&
      (!filters.platform || influencer.platform === filters.platform) &&
      (!filters.niche || influencer.niche === filters.niche) &&
      (!filters.search || (influencer.name && influencer.name.toLowerCase().includes(filters.search.toLowerCase())))
    );
  });

  return (
    <Box
      sx={{
        backgroundImage: "url('/hero image.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#F0F2F5",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1200px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "12px",
          marginBottom: "20px",
        }}
      >
        <TextField
          label="Search by Name"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          sx={{ marginRight: "10px", flex: 1 }}
        />
        <TextField
          label="Followers"
          name="followers"
          type="number"
          value={filters.followers}
          onChange={handleFilterChange}
          sx={{ marginRight: "10px", flex: 1 }}
        />
        <TextField
          label="Platform"
          name="platform"
          select
          value={filters.platform}
          onChange={handleFilterChange}
          sx={{ marginRight: "10px", flex: 1 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="YouTube">YouTube</MenuItem>
          <MenuItem value="Instagram">Instagram</MenuItem>
          <MenuItem value="TikTok">TikTok</MenuItem>
        </TextField>
        <TextField
          label="Niche"
          name="niche"
          select
          value={filters.niche}
          onChange={handleFilterChange}
          sx={{ flex: 1 }}
        >
          <MenuItem value="">all</MenuItem>
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
      </Box>

      <Button
        variant="contained"
        color="secondary"
        sx={{ margin: "20px auto", display: "block" }}
        onClick={handleOpenPopup}
      >
        Find the Best Influencer With Our AI
      </Button>

      <Dialog open={openPopup} onClose={handleClosePopup} maxWidth="sm" fullWidth>
        <DialogTitle>Find the Best Influencer With Our AI</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Follow these steps to find the best influencer:
          </Typography>
          <Typography variant="body2" gutterBottom>
            1. Upload an image from your brand.
          </Typography>
          <TextField
            type="file"
            fullWidth
            onChange={(e) => setBrandImage(e.target.files[0])}
            sx={{ marginBottom: "10px" }}
          />
          <Typography variant="body2" gutterBottom>
            2. Select a platform for your brand.
          </Typography>
          <TextField
            select
            fullWidth
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            sx={{ marginBottom: "10px" }}
          >
            <MenuItem value="YouTube">YouTube</MenuItem>
            <MenuItem value="Instagram">Instagram</MenuItem>
            <MenuItem value="TikTok">TikTok</MenuItem>
          </TextField>
          <Typography variant="body2" gutterBottom>
            3. Click proceed to search for influencers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePopup} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleProceedSearching} color="primary" variant="contained">
            Proceed Searching
          </Button>
        </DialogActions>
      </Dialog>

      <Button
        variant="contained"
        color="primary"
        sx={{ margin: "20px auto", display: "block" }}
        onClick={handleAiRequestOpen}
      >
        Do you want an AI influencer?
      </Button>

      <Dialog open={aiRequestPopup} onClose={handleAiRequestClose} maxWidth="sm" fullWidth>
        <DialogTitle>Request an AI Influencer</DialogTitle>
        <DialogContent>
          <TextField
            label="AI Model Type"
            name="modelType"
            value={aiRequestForm.modelType}
            onChange={handleAiRequestChange}
            fullWidth
            required
            sx={{ marginBottom: "10px" }}
          />
          <TextField
            label="Description of Requirements"
            name="description"
            value={aiRequestForm.description}
            onChange={handleAiRequestChange}
            fullWidth
            multiline
            rows={4}
            required
            sx={{ marginBottom: "10px" }}
          />
          <TextField
            label="Contact Information"
            name="contactInfo"
            value={aiRequestForm.contactInfo}
            onChange={handleAiRequestChange}
            fullWidth
            required
            sx={{ marginBottom: "10px" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAiRequestClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAiRequestSubmit} color="primary" variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      <Container
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {filteredInfluencers.map((influencer) => (
          <Card
            key={influencer.id}
            elevation={4}
            sx={{
              width: "calc(33% - 10px)",
              height: "300px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              borderRadius: "12px",
              padding: "10px",
              position: "relative",
            }}
          >
            <Avatar
              alt={influencer.name}
              src={formatImageUrl(influencer.image)}
              sx={{ width: 80, height: 80, marginBottom: "10px" }}
            />
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333", textAlign: "center" }}>
              {influencer.name}
            </Typography>
            <Typography sx={{ color: "#555", textAlign: "center" }}>Followers: {influencer.followers || "Not available"}</Typography>
            <Typography sx={{ color: "#555", textAlign: "center" }}>Platform: {influencer.platform || "Not available"}</Typography>
            <Typography sx={{ color: "#555", textAlign: "center" }}>Niche: {influencer.niche}</Typography>
            <Link to={`/show-profile/${influencer.id}`}>
              <Button
                variant="contained"
                color="primary"
                sx={{ marginTop: "10px", alignSelf: "center" }}
              >
                Show Profile
              </Button>
            </Link>
          </Card>
        ))}
      </Container>
    </Box>
  );
};

export default SearchInfluencers;