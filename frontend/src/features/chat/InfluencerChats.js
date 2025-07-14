import React, { useState, useEffect } from "react";
import { Typography, Box, List, ListItem, ListItemText, TextField, Button } from "@mui/material";
import { db, auth } from "../../api/firebaseConfig";
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot, documentId, deleteDoc, updateDoc, doc, setDoc, getDoc } from "firebase/firestore";
import logo from "../../logo.png";

const InfluencerChats = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const flumersBot = {
      id: "flumers-bot",
      name: "Flumers Bot",
      image: logo,
    };

    const fetchBrands = async () => {
      const user = auth.currentUser;
      if (user) {
        const brandsRef = collection(db, "users");
        const q = query(brandsRef, where("role", "==", "brand"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, uid: doc.id, ...doc.data() }));

        // Filter brands that have initiated chats with the influencer
        const chatRef = collection(db, "Messages");
        const chatSnapshot = await getDocs(chatRef);
        const activeChats = chatSnapshot.docs
          .map((doc) => doc.id.split("_").find((id) => id !== user.uid))
          .filter((id) => id);

        const decodedBrands = data.map((brand) => ({
          ...brand,
          image: decodeURIComponent(brand.image || logo),
        }));

        const filteredBrands = decodedBrands.filter((brand) => activeChats.includes(brand.uid));

        setBrands([flumersBot, ...filteredBrands]);
      }
    };

    fetchBrands();
  }, []);

  const handleSelectBrand = async (brand) => {
    if (brand.id === "flumers-bot") {
      setSelectedBrand({
        id: "flumers-bot",
        name: "Flumers Bot",
        uid: "flumers-bot-uid",
        image: logo,
      });
      setChatHistory([
        { message: "Hello! I am Flumers Bot. How can I assist you today?", sender: "Flumers Bot" },
      ]);
      return;
    }

    setSelectedBrand(brand);
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedBrand) {
      const senderUID = auth.currentUser.uid;
      const receiverUID = selectedBrand?.uid;

      if (!receiverUID) {
        console.error("Receiver UID is undefined. Cannot send message.");
        return;
      }

      const chatId = senderUID < receiverUID ? `${senderUID}_${receiverUID}` : `${receiverUID}_${senderUID}`;

      const chatRef = collection(db, "Messages", chatId, "messages");
      await addDoc(chatRef, {
        senderId: senderUID,
        receiverId: receiverUID,
        message: newMessage,
        timestamp: new Date(),
        read: false, // Explicitly set read to false
      });

      setNewMessage("");
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteChat = async () => {
    if (selectedBrand) {
      try {
        const senderUID = auth.currentUser.uid;
        const receiverUID = selectedBrand.uid;

        if (!receiverUID) {
          console.warn("Receiver UID is undefined. Cannot delete chat.");
          return;
        }

        const chatId = senderUID < receiverUID ? `${senderUID}_${receiverUID}` : `${receiverUID}_${senderUID}`;
        const chatRef = collection(db, "Messages", chatId, "messages");

        const snapshot = await getDocs(chatRef);

        if (snapshot.empty) {
          console.warn("No messages found for the selected chat.");
          return;
        }

        console.log("Deleting messages for chat ID:", chatId);
        snapshot.forEach(async (doc) => {
          try {
            await deleteDoc(doc.ref);
            console.log("Deleted message document with ID:", doc.id);
          } catch (error) {
            console.error("Error deleting message document:", error);
          }
        });

        setChatHistory([]);
      } catch (error) {
        console.error("Error fetching or deleting messages:", error);
      }
    } else {
      console.warn("No brand selected for chat deletion.");
    }
  };

  const handleToggleBlock = async () => {
    if (selectedBrand) {
      try {
        const senderUID = auth.currentUser.uid;
        const receiverUID = selectedBrand.uid;

        if (!receiverUID) {
          console.warn("Receiver UID is undefined. Cannot toggle block status.");
          return;
        }

        const blockRef = doc(db, "Blocks", `${senderUID}_${receiverUID}`);
        const reverseBlockRef = doc(db, "Blocks", `${receiverUID}_${senderUID}`);

        const blockDoc = await getDoc(blockRef);
        if (isBlocked) {
          if (blockDoc.exists() && blockDoc.data().blockerId !== senderUID) {
            console.warn("Only the blocker can unblock this user.");
            return;
          }
          // Unblock the user
          await deleteDoc(blockRef);
          await deleteDoc(reverseBlockRef); // Remove reverse block as well
          console.log("User unblocked:", receiverUID);
        } else {
          // Block the user
          const blockData = {
            blockerId: senderUID,
            blockedId: receiverUID,
            timestamp: new Date(),
          };
          await setDoc(blockRef, blockData);
          await setDoc(reverseBlockRef, blockData); // Add reverse block
          console.log("User blocked:", receiverUID);
        }

        setIsBlocked((prev) => !prev);
      } catch (error) {
        console.error("Error toggling block status:", error);
      }
    } else {
      console.warn("No brand selected to toggle block status.");
    }
  };

  useEffect(() => {
    if (selectedBrand) {
      const senderUID = auth.currentUser.uid;
      const receiverUID = selectedBrand.uid;
      const chatId = senderUID < receiverUID ? `${senderUID}_${receiverUID}` : `${receiverUID}_${senderUID}`;

      const chatRef = collection(db, "Messages", chatId, "messages");
      const q = query(chatRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          // Mark messages as read if they are sent to the current user
          if (data.receiverId === senderUID && !data.read) {
            const messageDocRef = doc(chatRef, docSnapshot.id); // Correctly create a document reference
            updateDoc(messageDocRef, { read: true }); // Use updateDoc to update the document
          }
          return data;
        });
        setChatHistory(messages);
      });

      return () => unsubscribe();
    }
  }, [selectedBrand]);

  useEffect(() => {
    const fetchLikedBrands = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("No current user found.");
        return;
      }

      const influencerUid = currentUser.uid;
      console.log("Current influencerUid:", influencerUid); // Debugging log

      try {
        const likedInfluencersRef = collection(db, "liked_influencers");
        const q = query(
          likedInfluencersRef,
          where("influencerUid", "==", influencerUid),
          where("liked", "==", "liked")
        );
        const snapshot = await getDocs(q);

        console.log("Liked influencers snapshot:", snapshot.docs); // Debugging log

        const brandIds = snapshot.docs.map((doc) => doc.data().brandUid);
        console.log("Extracted brand UIDs:", brandIds); // Debugging log

        if (brandIds.length > 0) {
          console.log("Querying users collection with UIDs:", brandIds); // Debugging log
          const usersRef = collection(db, "users");
          
          const usersQuery = query(usersRef, where(documentId(), "in", brandIds));
          const usersSnapshot = await getDocs(usersQuery);
          const brandsData = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            uid: doc.id,
            ...doc.data(),
          }));

          console.log("Fetched brands data:", brandsData); // Debugging log
          setBrands(brandsData);
        } else {
          console.warn("No liked brands found.");
          setBrands([]); // No liked brands
        }
      } catch (error) {
        console.error("Error fetching liked brands:", error);
      }
    };

    fetchLikedBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      const fetchBlockStatus = async () => {
        try {
          const senderUID = auth.currentUser.uid;
          const receiverUID = selectedBrand.uid;

          if (!receiverUID) {
            console.warn("Receiver UID is undefined. Cannot fetch block status.");
            return;
          }

          const blockRef = doc(db, "Blocks", `${senderUID}_${receiverUID}`);
          const blockDoc = await getDoc(blockRef);

          if (blockDoc.exists()) {
            setIsBlocked(true);
          } else {
            setIsBlocked(false);
          }
        } catch (error) {
          console.error("Error fetching block status:", error);
        }
      };

      fetchBlockStatus();
    }
  }, [selectedBrand]);

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
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box", // Ensure padding is included in the box size
        overflow: "hidden", // Prevent scrolling on the main page
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: "0",
          border: "1px solid #ccc",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.1)",
          backgroundColor: "#ffffff",
          width: "100%",
          maxWidth: "1250px", // Limit the maximum width
          height: "90%", // Adjust height to fit within the viewport
        }}
      >
        {/* Left Section: Brands List */}
        <Box
          sx={{
            flex: 1.5,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
            borderRadius: "16px",
            height: "calc(100vh - 40px)",
            overflowY: "auto",
            border: "1px solid #ddd",
            boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.1)",
            '@media (max-width: 600px)': {
              height: "auto",
              padding: "16px",
            },
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: "bold",
              color: "#333",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            Brands
          </Typography>
          <List
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            {brands.map((brand) => (
              <ListItem
                key={brand.id}
                button
                selected={selectedBrand?.id === brand.id}
                onClick={() => handleSelectBrand(brand)}
                sx={{
                  border: "1px solid #ccc",
                  borderRadius: "12px",
                  padding: "15px",
                  backgroundColor: selectedBrand?.id === brand.id ? "#e0f7fa" : "#fff", // Highlight selected chat
                  borderColor: selectedBrand?.id === brand.id ? "#00796b" : "#ccc", // Change border color for selected chat
                  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  '&:hover': {
                    transform: "scale(1.02)",
                    boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.15)",
                  },
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                <img
                  src={brand.id === "flumers-bot" ? logo : decodeURIComponent(brand.image || logo)}
                  alt="Brand Avatar"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    border: "2px solid #ddd",
                    objectFit: "cover",
                  }}
                />
                <ListItemText
                  primary={brand.name}
                  primaryTypographyProps={{
                    fontWeight: "bold",
                    color: "#333",
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Right Section: Chat Panel */}
        <Box
          sx={{
            flex: 3,
            display: "flex",
            flexDirection: "column",
            background: "#f0f2f5",
            borderRadius: "16px",
            height: "calc(100vh - 40px)",
            overflow: "hidden",
            boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.1)",
            '@media (max-width: 600px)': {
              height: "auto",
            },
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 20px",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #ddd",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {selectedBrand && (
                <img
                  src={decodeURIComponent(selectedBrand?.image || logo)}
                  alt="User Avatar"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    marginRight: "10px",
                  }}
                />
              )}
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedBrand?.name || "Select a Brand"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: "10px" }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteChat}
                disabled={selectedBrand?.id === "flumers-bot"}
                sx={{ fontSize: "0.8rem", padding: "6px 12px" }}
              >
                Delete Chat
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleToggleBlock}
                disabled={selectedBrand?.id === "flumers-bot"}
                sx={{ fontSize: "0.8rem", padding: "6px 12px" }}
              >
                {isBlocked ? "Unblock" : "Block"}
              </Button>
            </Box>
          </Box>

          {/* Chat Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              backgroundColor: isBlocked ? "#f8d7da" : "#e5ddd5",
            }}
          >
            {isBlocked ? (
              <Typography variant="h6" sx={{ color: "red", textAlign: "center" }}>
                You are blocked
              </Typography>
            ) : (
              chatHistory.map((chat, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    flexDirection: chat.senderId === auth.currentUser.uid ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: "10px",
                  }}
                >
                  {chat.senderId !== auth.currentUser.uid && (
                    <img
                      src={selectedBrand?.image || logo}
                      alt="User Avatar"
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      backgroundColor:
                        chat.senderId === auth.currentUser.uid ? "#dcf8c6" : "#ffffff",
                      padding: "10px 15px",
                      borderRadius: "10px",
                      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                      maxWidth: "70%",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.9rem",
                        wordBreak: "break-word",
                      }}
                    >
                      {chat.message}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "#777",
                        textAlign: "right",
                        marginTop: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      {chat.senderId === auth.currentUser.uid && (
                        <>
                          {chat.read ? (
                            <>
                              <span style={{ color: "#4caf50" }}>✔✔</span> {/* Double blue ticks for read */}
                            </>
                          ) : (
                            <>
                              <span style={{ color: "#777" }}>✔</span> {/* Single gray tick for unread */}
                            </>
                          )}
                        </>
                      )}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Input Section */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #ddd",
            }}
          >
            <TextField
              fullWidth
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={handleKeyPress}
              sx={{
                borderRadius: "20px",
                backgroundColor: "#f0f0f0",
                '& .MuiOutlinedInput-root': {
                  borderRadius: "20px",
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendMessage}
              disabled={!selectedBrand}
              sx={{
                minWidth: "50px",
                height: "50px",
                borderRadius: "50%",
                marginLeft: "10px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "20px", transform: "rotate(0deg)", color: "white" }}>
                ➤
              </span>
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default InfluencerChats;