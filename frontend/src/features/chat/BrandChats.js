import React, { useState, useEffect } from "react";
import { Typography, Box, List, ListItem, ListItemText, TextField, Button } from "@mui/material";
import { db, auth } from "../../api/firebaseConfig";
import { collection, query, where, getDocs, addDoc, deleteDoc, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import logo from "../../logo.png"; // Import the logo image

const BrandChats = () => {
  const [influencers, setInfluencers] = useState([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchLikedInfluencers = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("No current user found.");
        return;
      }

      const brandUid = currentUser.uid;
      console.log("Current brandUid:", brandUid); // Debugging log

      try {
        const likedInfluencersRef = collection(db, "liked_influencers");
        const q = query(
          likedInfluencersRef,
          where("brandUid", "==", brandUid),
          where("liked", "==", "liked")
        );
        const snapshot = await getDocs(q);

        console.log("Liked influencers snapshot:", snapshot.docs); // Debugging log

        const influencerIds = snapshot.docs.map((doc) => doc.data().influencerUid);
        console.log("Extracted influencer UIDs:", influencerIds); // Debugging log

        if (influencerIds.length > 0) {
          console.log("Querying users collection with UIDs:", influencerIds); // Debugging log
          const usersRef = collection(db, "users");
          const influencersData = [];

          for (const uid of influencerIds) {
            const userDoc = doc(usersRef, uid);
            const userSnapshot = await getDoc(userDoc);

            if (userSnapshot.exists()) {
              influencersData.push({
                id: userSnapshot.id,
                uid: userSnapshot.id,
                ...userSnapshot.data(),
              });
            } else {
              console.warn(`User with UID ${uid} not found in users collection.`);
            }
          }

          console.log("Fetched influencers data:", influencersData); // Debugging log
          setInfluencers(influencersData);
        } else {
          console.warn("No liked influencers found.");
          setInfluencers([]); // No liked influencers
        }
      } catch (error) {
        console.error("Error fetching liked influencers:", error);
      }
    };

    fetchLikedInfluencers();
  }, []);

  useEffect(() => {
    const influencerId = new URLSearchParams(location.search).get("influencerId");
    if (influencerId) {
      const preselectInfluencer = async () => {
        const influencer = influencers.find((inf) => inf.id === influencerId);
        if (influencer) {
          await handleSelectInfluencer(influencer);
        }
      };
      preselectInfluencer();
    }
  }, [location.search, influencers]);

  // Ensure receiverUID is properly set and handle undefined cases
  const handleSelectInfluencer = async (influencer) => {
    if (influencer.id === "flumers-bot") {
      setSelectedInfluencer({
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

    if (!influencer.uid) {
      console.error("Selected influencer does not have a UID.");
      return;
    }

    setSelectedInfluencer(influencer);

    // Fetch chat history for the selected influencer
    const senderUID = auth.currentUser.uid;
    const receiverUID = influencer.uid;
    const chatIdentifier = senderUID < receiverUID ? `${senderUID}_${receiverUID}` : `${receiverUID}_${senderUID}`;

    const chatCollectionRef = collection(db, "Messages", chatIdentifier, "messages");
    const chatQuery = query(chatCollectionRef, orderBy("timestamp", "asc"));

    const snapshot = await getDocs(chatQuery);
    const messages = snapshot.docs.map((doc) => doc.data());
    setChatHistory(messages);
  };

  useEffect(() => {
    if (selectedInfluencer) {
      const senderUID = auth.currentUser.uid;
      const receiverUID = selectedInfluencer.uid;
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
  }, [selectedInfluencer]);

  // Added functionality to send a message on pressing Enter
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteChat = async () => {
    if (selectedInfluencer) {
      try {
        const senderUID = auth.currentUser.uid;
        const receiverUID = selectedInfluencer.uid;

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
      console.warn("No influencer selected for chat deletion.");
    }
  };

  const handleToggleBlock = async () => {
    if (selectedInfluencer) {
      try {
        const senderUID = auth.currentUser.uid;
        const receiverUID = selectedInfluencer.uid;

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
      console.warn("No influencer selected to toggle block status.");
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedInfluencer) {
      const senderUID = auth.currentUser.uid;
      const receiverUID = selectedInfluencer?.uid; // Ensure receiverUID is properly set

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

  useEffect(() => {
    if (selectedInfluencer) {
      const fetchBlockStatus = async () => {
        try {
          const senderUID = auth.currentUser.uid;
          const receiverUID = selectedInfluencer.uid;

          if (!receiverUID) {
            console.warn("Receiver UID is undefined. Cannot fetch block status.");
            return;
          }

          console.log("Fetching block status for:", { senderUID, receiverUID }); // Debugging log

          const blockRef = doc(db, "Blocks", `${senderUID}_${receiverUID}`);
          const blockDoc = await getDoc(blockRef);

          console.log("Block document fetched:", blockDoc.exists() ? blockDoc.data() : "No document found"); // Debugging log

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
  }, [selectedInfluencer]);

  // Updated layout to match BrandDashboard design
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
          height: "calc(100vh - 40px)", // Ensure it fits within the viewport
        }}
      >
        {/* Left Section: Influencers List */}
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
            Influencers
          </Typography>
          <List
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            {influencers.map((influencer) => (
              <ListItem
                key={influencer.id}
                button
                selected={selectedInfluencer?.id === influencer.id}
                onClick={() => handleSelectInfluencer(influencer)}
                sx={{
                  border: "1px solid #ccc",
                  borderRadius: "12px",
                  padding: "15px",
                  backgroundColor: selectedInfluencer?.id === influencer.id ? "#e0f7fa" : "#fff", // Highlight selected chat
                  borderColor: selectedInfluencer?.id === influencer.id ? "#00796b" : "#ccc", // Change border color for selected chat
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
                  src={
                    influencer.id === "flumers-bot"
                      ? logo
                      : decodeURIComponent(influencer.image || "/dp.png")
                  }
                  alt="Influencer Avatar"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    border: "2px solid #ddd",
                    objectFit: "cover",
                  }}
                />
                <ListItemText
                  primary={influencer.name}
                  secondary={influencer.username}
                  primaryTypographyProps={{
                    fontWeight: "bold",
                    color: "#333",
                  }}
                  secondaryTypographyProps={{
                    color: "#777",
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
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {selectedInfluencer && (
                <img
                  src={
                    selectedInfluencer?.id === "flumers-bot"
                      ? logo
                      : selectedInfluencer?.image
                  }
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
                {selectedInfluencer?.name || "Select an Influencer"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: "10px" }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteChat}
                disabled={selectedInfluencer?.id === "flumers-bot"}
                sx={{ fontSize: "0.8rem", padding: "6px 12px" }}
              >
                Delete Chat
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleToggleBlock}
                disabled={selectedInfluencer?.id === "flumers-bot"}
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
                    flexDirection:
                      chat.senderId === auth.currentUser.uid ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: "10px",
                  }}
                >
                  {chat.senderId !== auth.currentUser.uid && (
                    <img
                      src={selectedInfluencer?.image || logo}
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
                        chat.senderId === auth.currentUser.uid
                          ? "#dcf8c6"
                          : "#ffffff",
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
          {!isBlocked && (
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
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
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
                disabled={!selectedInfluencer}
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
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default BrandChats;