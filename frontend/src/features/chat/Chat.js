import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchMessages } from "./chatSlice";
import { Container, Typography, Box, TextField, Button, List, ListItem, ListItemText, Grid, Card, CardContent } from "@mui/material";
import { auth, db } from "../../api/firebaseConfig";
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy } from "firebase/firestore";

const InfluencerChat = () => {
  const dispatch = useDispatch();
  const [newMessage, setNewMessage] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    const fetchBrands = async () => {
      const user = auth.currentUser;
      if (user) {
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", user.displayName));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map((doc) => doc.data())
          .filter((chat) => chat.participants.some((participant) => participant !== user.displayName));

        const uniqueBrands = Array.from(new Set(data.map((chat) => chat.participants.find((p) => p !== user.displayName))));
        setBrands(uniqueBrands);
      }
    };

    fetchBrands();
    dispatch(fetchMessages());
  }, [dispatch]);

  useEffect(() => {
    if (selectedBrand) {
      const chatRef = collection(db, "chats");
      const q = query(chatRef, where("participants", "array-contains", selectedBrand), orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        setChatHistory(data);
      });

      return () => unsubscribe();
    }
  }, [selectedBrand]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedBrand) {
      const chatRef = collection(db, "chats");
      await addDoc(chatRef, {
        participants: [auth.currentUser.displayName, selectedBrand],
        message: newMessage,
        timestamp: new Date(),
      });
      setNewMessage("");
    }
  };

  return (
    <Container sx={{ marginTop: "30px", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "12px" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ color: "#333", textAlign: "center", fontWeight: "bold", marginBottom: "20px" }}
      >
        Chat
      </Typography>
      <Grid container spacing={4}>
        <Grid xs={12}>
          <Card elevation={4} sx={{ borderRadius: "12px", overflow: "hidden", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: "#555", fontWeight: "bold" }}>
                Chat Messages
              </Typography>
              <Box sx={{ display: "flex", gap: "20px" }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Brands</Typography>
                  <List>
                    {brands.map((brand, index) => (
                      <ListItem
                        key={index}
                        button
                        selected={selectedBrand === brand}
                        onClick={() => setSelectedBrand(brand)}
                      >
                        <ListItemText primary={brand} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
                <Box sx={{ flex: 2 }}>
                  <Typography variant="h6">Chat</Typography>
                  <Box sx={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }}>
                    {chatHistory.map((chat, index) => (
                      <Typography key={index} sx={{ marginBottom: "10px" }}>
                        {chat.message}
                      </Typography>
                    ))}
                  </Box>
                  <Box sx={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <TextField
                      fullWidth
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!selectedBrand}
                    >
                      Send
                    </Button>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default InfluencerChat;