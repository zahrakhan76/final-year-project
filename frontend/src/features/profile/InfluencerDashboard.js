import React, { useState, useEffect } from "react";
import { Container, Grid, Card, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button } from "@mui/material";
import { db, auth } from "../../api/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const InfluencerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [userInfo, setUserInfo] = useState({
    username: "",
    name: "",
    niche: "",
    email: "",
    bio: "",
    image: "",
    platforms: {},
  });
  const [unseenMessages, setUnseenMessages] = useState({}); // Added state for unseen messages
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDoc);
        console.log("User snapshot data:", userSnapshot.data()); // Debugging log

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          const ordersFromDB = userData.orders || [];

          // Fallback: If orders array is empty, fetch orders directly from the orders collection
          if (ordersFromDB.length === 0) {
            console.log("Orders array is empty in user data. Fetching from orders collection...");
            const ordersQuery = query(
              collection(db, "orders"),
              where("influencerUid", "==", user.uid)
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            const fetchedOrders = ordersSnapshot.docs.map((doc) => doc.data());
            setOrders(fetchedOrders);
          } else {
            setOrders(ordersFromDB);
          }

          // Decode the image URL before setting it in the userInfo state
          const decodedImageUrl = decodeURIComponent(userData.image || "");
          setUserInfo({
            username: userData.username || "",
            name: userData.name || "",
            niche: userData.niche || "",
            email: userData.email || "",
            bio: userData.bio || "",
            image: decodedImageUrl,
            platforms: userData.platforms || {},
          });

          // Add debugging log to confirm the decoded image URL
          console.log("Decoded and set user image URL:", decodedImageUrl);
        } else {
          console.log("No user data found for user ID:", user.uid); // Debugging log
        }
      }
    };

    fetchUserData();
  }, []);

  // Adding detailed debugging and fetching logic from BrandDashboard
  useEffect(() => {
    const fetchUnseenMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const messages = {};
        console.log("Orders array:", orders); // Debugging log

        for (const order of orders || []) {
          const chatId = `${order.brandUid}_${user.uid}`;
          console.log("Fetching messages for chatId:", chatId); // Debugging log

          try {
            const chatRef = collection(db, "Messages", chatId, "messages");
            const unseenMessagesQuery = query(chatRef, where("read", "==", false));
            const unseenMessagesSnapshot = await getDocs(unseenMessagesQuery);

            if (!unseenMessagesSnapshot.empty) {
              messages[order.brandUid] = unseenMessagesSnapshot.size;
            } else {
              console.log(`No unseen messages for chatId: ${chatId}`); // Debugging log
            }
          } catch (error) {
            console.error(`Error fetching unseen messages for chatId: ${chatId}`, error);
          }
        }
        console.log("Unseen messages before setting state:", messages); // Debugging log
        setUnseenMessages(messages);
      }
    };

    fetchUnseenMessages();
  }, [orders]);

  useEffect(() => {
    const fetchLikedInfluencersAndMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const influencerUid = user.uid;
        console.log("Fetching liked brands for influencerUid:", influencerUid); // Debugging log

        try {
          const likedBrandsRef = collection(db, "liked_influencers"); // Corrected collection name
          const q = query(likedBrandsRef, where("influencerUid", "==", influencerUid));
          const likedBrandsSnapshot = await getDocs(q);

          console.log("Liked brands query snapshot:", likedBrandsSnapshot.docs.map(doc => doc.data())); // Debugging log

          if (!likedBrandsSnapshot.empty) {
            console.log("Liked brands snapshot size:", likedBrandsSnapshot.size); // Debugging log
            const messages = {};
            const brandDetails = {};

            for (const doc of likedBrandsSnapshot.docs) {
              const { brandUid } = doc.data();
              const chatIdentifier = `${influencerUid}_${brandUid}`;
              console.log("Constructed chatIdentifier:", chatIdentifier); // Debugging log

              try {
                const chatCollectionRef = collection(db, "Messages", chatIdentifier, "messages");
                const unseenMessagesQuery = query(chatCollectionRef, where("read", "==", false));
                const unseenMessagesSnapshot = await getDocs(unseenMessagesQuery);

                if (!unseenMessagesSnapshot.empty) {
                  messages[brandUid] = unseenMessagesSnapshot.size;

                  // Fetch brand details
                  const brandDocRef = doc(db, "users", brandUid);
                  const brandDoc = await getDoc(brandDocRef);
                  if (brandDoc.exists()) {
                    brandDetails[brandUid] = brandDoc.data();
                  } else {
                    console.log(`No brand details found for brandUid: ${brandUid}`); // Debugging log
                  }
                } else {
                  console.log(`No unseen messages for chatIdentifier: ${chatIdentifier}`); // Debugging log
                }
              } catch (error) {
                console.error(`Error fetching messages for chatIdentifier: ${chatIdentifier}`, error);
              }
            }
            console.log("Liked brands and unseen messages:", { messages, brandDetails });
          } else {
            console.log("No liked brands found for influencerUid:", influencerUid); // Debugging log
          }
        } catch (error) {
          console.error("Error fetching liked brands:", error);
        }
      }
    };

    fetchLikedInfluencersAndMessages();
  }, []);

  // New effect to fetch unseen messages and brand details for liked brands
  useEffect(() => {
    const fetchLikedBrandsWithMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const influencerUid = user.uid;
        console.log("Fetching liked brands for influencerUid:", influencerUid); // Debugging log

        try {
          const likedBrandsRef = collection(db, "liked_influencers");
          const q = query(likedBrandsRef, where("influencerUid", "==", influencerUid), where("liked", "==", "liked"));
          const likedBrandsSnapshot = await getDocs(q);

          console.log("Liked brands snapshot:", likedBrandsSnapshot.docs.map(doc => doc.data())); // Debugging log

          if (!likedBrandsSnapshot.empty) {
            const messages = {};
            const brandDetails = [];

            for (const docSnapshot of likedBrandsSnapshot.docs) {
              const { brandUid } = docSnapshot.data();
              const chatId = influencerUid < brandUid ? `${influencerUid}_${brandUid}` : `${brandUid}_${influencerUid}`;
              console.log("Constructed chatId:", chatId); // Debugging log

              // Fetch unseen messages for the chatId
              const chatRef = collection(db, "Messages", chatId, "messages");
              const unseenMessagesQuery = query(chatRef, where("read", "==", false));
              const unseenMessagesSnapshot = await getDocs(unseenMessagesQuery);

              if (!unseenMessagesSnapshot.empty) {
                messages[brandUid] = unseenMessagesSnapshot.size;
              }

              // Fetch brand details
              const brandDocRef = doc(db, "users", brandUid); // Corrected usage of doc
              const brandDoc = await getDoc(brandDocRef);
              if (brandDoc.exists()) {
                brandDetails.push({ id: brandUid, ...brandDoc.data() });
              } else {
                console.warn(`No brand details found for UID: ${brandUid}`);
              }
            }

            console.log("Unseen messages for liked brands:", messages); // Debugging log
            console.log("Fetched brand details:", brandDetails); // Debugging log

            setUnseenMessages((prev) => ({ ...prev, ...messages }));
          } else {
            console.log("No liked brands found for influencer.");
          }
        } catch (error) {
          console.error("Error fetching liked brands or messages:", error);
        }
      }
    };

    fetchLikedBrandsWithMessages();
  }, []);

  // Real-time updates for unseen messages
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Messages"), (snapshot) => {
      const user = auth.currentUser;
      if (user) {
        const messages = {};
        snapshot.docs.forEach((doc) => {
          const chatId = doc.id;
          const [brandUid, influencerUid] = chatId.split("_");

          if (influencerUid === user.uid) {
            const unseenMessages = doc.data().messages.filter((msg) => !msg.read);
            if (unseenMessages.length > 0) {
              messages[brandUid] = unseenMessages.length;
            }
          }
        });
        console.log("Real-time unseen messages:", messages); // Debugging log
        setUnseenMessages(messages);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update unseenMessages state to include user details
  useEffect(() => {
    const fetchUserDetailsForMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const updatedMessages = { ...unseenMessages };
        const platforms = { ...userInfo.platforms };

        for (const brandUid of Object.keys(unseenMessages)) {
          if (!platforms[brandUid]) {
            try {
              const brandDocRef = doc(db, "users", brandUid);
              const brandDoc = await getDoc(brandDocRef);

              if (brandDoc.exists()) {
                const brandData = brandDoc.data();
                platforms[brandUid] = {
                  name: brandData.name || "Unknown",
                  image: brandData.image || "/dp.png",
                };
              } else {
                console.warn(`No user details found for UID: ${brandUid}`);
              }
            } catch (error) {
              console.error(`Error fetching user details for UID: ${brandUid}`, error);
            }
          }
        }

        setUserInfo((prev) => ({ ...prev, platforms }));
      }
    };

    fetchUserDetailsForMessages();
  }, [unseenMessages]);

  // New effect to fetch sender's name and profile image for each brandUid in unseen messages
  useEffect(() => {
    const fetchUserDetailsForUnseenMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const updatedPlatforms = { ...userInfo.platforms };

        for (const brandUid of Object.keys(unseenMessages)) {
          if (!updatedPlatforms[brandUid]) {
            try {
              const brandDocRef = doc(db, "users", brandUid);
              const brandDoc = await getDoc(brandDocRef);

              if (brandDoc.exists()) {
                const brandData = brandDoc.data();
                // Decode the image URL to handle double encoding issues
                const decodedImage = decodeURIComponent(brandData.image || "/dp.png");
                updatedPlatforms[brandUid] = {
                  name: brandData.name || "Unknown",
                  image: decodedImage,
                };
              } else {
                console.warn(`No user details found for brandUid: ${brandUid}`);
              }
            } catch (error) {
              console.error(`Error fetching user details for brandUid: ${brandUid}`, error);
            }
          }
        }

        setUserInfo((prev) => ({ ...prev, platforms: updatedPlatforms }));
      }
    };

    fetchUserDetailsForUnseenMessages();
  }, [unseenMessages]);

  // Add the calculateRemainingTime function
  const calculateRemainingTime = (startTime, deadline) => {
    const now = new Date();
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime); // Convert Firestore timestamp to Date if needed
    const deadlineTime = new Date(start.getTime() + deadline * 24 * 60 * 60 * 1000);
    const diff = deadlineTime - now;

    if (diff <= 0) return "00:00:00:00"; // Timer expired

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Add an effect to update the remaining time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.status === "remaining" && order.startTime) {
            const remainingTime = calculateRemainingTime(order.startTime, order.deadline);
            return {
              ...order,
              timeLeft: remainingTime,
            };
          }
          return order;
        })
      );
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  const pendingOrders = orders.filter((order) => order.status === "pending");

  return (
    <Box
      sx={{
        backgroundImage: "url('/hero image.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        padding: "30px",
      }}
    >
      <Container
        sx={{
          flex: 3,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "40px",
          marginTop: "20px",
        }}
      >
        {/* Order Notifications */}
        <Card
          elevation={8}
          sx={{
            width: "calc(50% - 20px)",
            height: "250px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "20px",
            backgroundColor: "#ffffff",
            boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            '&:hover': {
              transform: "scale(1.05)",
              boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.25)",
            },
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", color: "#333", marginBottom: "15px" }}
          >
            Message Notifications
          </Typography>
          <Box
            sx={{ width: "100%", height: "3px", backgroundColor: "#ccc", margin: "15px 0" }}
          />
          {Object.keys(unseenMessages).length > 0 ? (
            <TableContainer>
              <Table>
                <TableBody>
                  {Object.entries(unseenMessages).map(([brandUid, count]) => {
                    const brand = userInfo.platforms[brandUid] || {}; // Assuming platforms hold brand details
                    return (
                      <TableRow
                        key={brandUid}
                        hover
                        onClick={() => navigate(`/influencer-chats`)}
                        sx={{
                          border: "1px solid #e0e0e0",
                          borderRadius: "16px",
                          padding: "12px 20px",
                          backgroundColor: "#f9f9f9",
                          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                          transition: "transform 0.3s, box-shadow 0.3s",
                          '&:hover': {
                            transform: "scale(1.03)",
                            boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.15)",
                          },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "20px",
                        }}
                      >
                        <TableCell sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img
                            src={brand.image || "/dp.png"}
                            alt={brand.name || "Brand"}
                            style={{ width: "40px", height: "40px", borderRadius: "50%" }}
                          />
                          <Typography sx={{ fontWeight: "bold", color: "#333" }}>
                            {brand.name || "Unknown"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold", color: "#555" }}>
                          {count} Unread Messages
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ color: "#555" }}>No new messages</Typography>
          )}
        </Card>

        {/* Orders Summary */}
        <Card
          elevation={8}
          sx={{
            width: "calc(50% - 20px)",
            height: "250px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "20px",
            backgroundColor: "#ffffff",
            boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            '&:hover': {
              transform: "scale(1.05)",
              boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.25)",
            },
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", color: "#333", marginBottom: "15px" }}
          >
            Orders Summary
          </Typography>
          <Box
            sx={{ width: "100%", height: "3px", backgroundColor: "#ccc", margin: "15px 0" }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
            <Typography sx={{ fontWeight: "bold", color: "#333" }}>
              Completed: {orders.filter(order => order.status === "completed").length}
            </Typography>
            <Typography sx={{ fontWeight: "bold", color: "#333" }}>
              Remaining: {orders.filter(order => order.status === "remaining").length}
            </Typography>
            <Typography sx={{ fontWeight: "bold", color: "#333" }}>
              Pending: {orders.filter(order => order.status === "pending").length}
            </Typography>
          </Box>
        </Card>

        {/* Orders Table */}
        <Card
          elevation={8}
          sx={{
            width: "100%",
            height: "350px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "20px",
            backgroundColor: "#ffffff",
            boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            '&:hover': {
              transform: "scale(1.05)",
              boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.25)",
            },
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", color: "#333", marginBottom: "15px" }}
          >
            Orders
          </Typography>
          <Box
            sx={{ width: "100%", height: "3px", backgroundColor: "#ccc", margin: "15px 0" }}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "#333" }}>Order Number</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#333" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#333" }}>Time Left</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{ backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff" }}
                  >
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell>
                      {order.status === "pending" && order.timeLeft ? (
                        <Typography sx={{ color: "red", fontWeight: "bold" }}>
                          {order.timeLeft} left
                        </Typography>
                      ) : (
                        <Typography>{order.timeLeft}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Container>

      {/* Sidebar */}
      <Box
        sx={{
          flex: 1.2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "20px",
          marginTop: "20px",
          height: "calc(100vh - 50px)",
          overflow: "auto",
        }}
      >
        <img
          src={userInfo.image || "/dp.png"}
          alt="Influencer Logo"
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            marginBottom: "20px",
            border: "3px solid #555",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.1)";
            e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
          }}
        />
        <Box
          sx={{
            width: "100%",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#333", fontSize: "1.2rem" }}
          >
            Username:
          </Typography>
          <Typography variant="body1" sx={{ color: "#555", fontSize: "1rem", lineHeight: "1.5" }}>
            {userInfo.username}
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#333", fontSize: "1.2rem" }}
          >
            Name:
          </Typography>
          <Typography variant="body1" sx={{ color: "#555", fontSize: "1rem", lineHeight: "1.5" }}>
            {userInfo.name}
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#333", fontSize: "1.2rem" }}
          >
            Niche:
          </Typography>
          <Typography variant="body1" sx={{ color: "#555", fontSize: "1rem", lineHeight: "1.5" }}>
            {userInfo.niche}
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#333", fontSize: "1.2rem" }}
          >
            Email:
          </Typography>
          <Typography variant="body1" sx={{ color: "#555", fontSize: "1rem", lineHeight: "1.5" }}>
            {userInfo.email}
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", color: "#333", fontSize: "1.2rem" }}
          >
            Bio:
          </Typography>
          <Typography variant="body1" sx={{ color: "#555", fontSize: "1rem", lineHeight: "1.5" }}>
            {userInfo.bio}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const InfluencerRecords = () => {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const fetchRecords = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          setRecords(userSnapshot.data().records || []);
        }
      }
    };

    fetchRecords();
  }, []);

  return (
    <Container sx={{ marginTop: "30px" }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#050505", textAlign: "center" }}>
        Order Records
      </Typography>
      <Grid container spacing={3}>
        <Grid xs={12}>
          <Paper
            elevation={3}
            sx={{ padding: "20px", borderRadius: "12px", textAlign: "center" }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Record ID</TableCell>
                    <TableCell>Brand</TableCell>
                    <TableCell>Order Date</TableCell>
                    <TableCell>Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>{record.brand}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>${record.revenue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default InfluencerDashboard;
export { InfluencerRecords };