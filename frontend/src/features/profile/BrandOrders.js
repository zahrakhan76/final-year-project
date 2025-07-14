import React, { useState, useEffect } from "react";
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from "@mui/material";
import { db, auth } from "../../api/firebaseConfig";
import { doc as firestoreDoc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from "firebase/firestore"; // Renamed `doc` to `firestoreDoc` to avoid shadowing
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { v4 as uuidv4 } from 'uuid'; // Import UUID library
import { supabase, getImageUrl } from "../../api/supabaseConfig"; // Import Supabase configuration

const BrandOrders = () => {
  const [orders, setOrders] = useState([]);
  const [likedInfluencers, setLikedInfluencers] = useState([]);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false); // State for review dialog
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    influencer: "",
    orderDetails: "",
    totalCost: "",
    deadline: "",
    imageFile: null, // Added imageFile to formData
  });
  const [filter, setFilter] = useState("all"); // State to manage filter type
  const [revisionText, setRevisionText] = useState(""); // State for revision text
  // Add a state to track unseen submissions
  const [unseenSubmissions, setUnseenSubmissions] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchOrders(user);
      }
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  const fetchOrders = async (user) => {
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("brandUid", "==", user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const fetchedOrders = snapshot.docs.map((doc) => {
          const data = doc.data();
          return data;
        });
        setOrders(fetchedOrders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchLikedInfluencers(user);
      }
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  const fetchLikedInfluencers = async (currentUser) => {
    try {
      const likedRef = collection(db, "liked_influencers");
      const q = query(likedRef, where("brandUid", "==", currentUser.uid), where("liked", "==", "liked"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return;
      }

      const influencers = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();

          if (data.influencerUid) {
            try {
              const userDoc = firestoreDoc(db, "users", data.influencerUid);
              const userSnapshot = await getDoc(userDoc);

              if (userSnapshot.exists()) {
                const userData = userSnapshot.data();

                // Decode the image URL to handle double encoding issues
                const decodedImage = decodeURIComponent(userData.image || "/dp.png");

                return {
                  username: userData.username || "Unknown",
                  image: decodedImage,
                  uid: data.influencerUid, // Include influencer UID
                };
              } else {
                return null;
              }
            } catch (error) {
              console.error("Error fetching user for influencerUid:", data.influencerUid, error);
              return null;
            }
          } else {
            return null;
          }
        })
      );

      setLikedInfluencers(influencers.filter(Boolean)); // Remove null entries
    } catch (error) {
      console.error("Error fetching liked influencers:", error);
    }
  };

  const calculateRemainingTime = (startTime, deadline) => {
    const now = new Date();
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime); // Convert Firestore timestamp to Date if needed
    const deadlineTime = new Date(start.getTime() + deadline * 24 * 60 * 60 * 1000);
    const diff = deadlineTime - now;

    if (diff <= 0) return "00:00:00:00"; // Timer expired

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.status === "running" && order.startTime) {
            const remainingTime = calculateRemainingTime(order.startTime, order.deadline);
            return {
              ...order,
              remainingTime,
            };
          }
          return order;
        })
      );
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleDetailsOpen = (order) => {
    const updatedOrder = {
      ...order,
      remainingTime: order.startTime ? calculateRemainingTime(order.startTime, order.deadline) : "Not Started",
    };
    setSelectedOrder(updatedOrder);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setSelectedOrder(null);
    setDetailsOpen(false);
  };

  const handleReviewDialogOpen = (order) => {
    if (order.status === "pending") return; // Do not open review dialog for pending orders
    setSelectedOrder(order);
    setReviewDialogOpen(true);
  };

  const handleReviewDialogClose = () => {
    setSelectedOrder(null);
    setReviewDialogOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value, // Handle file input
    }));
  };

  const handleSubmit = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      // Fetch all existing orders to determine the next order number
      const ordersRef = collection(db, "orders");
      const ordersSnapshot = await getDocs(ordersRef);

      let maxOrderNumber = 999; // Start from 1000
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        if (orderData.orderNumber && orderData.orderNumber > maxOrderNumber) {
          maxOrderNumber = orderData.orderNumber;
        }
      });

      const newOrderNumber = maxOrderNumber + 1;
      const orderId = uuidv4(); // Generate a unique ID for the order

      // Upload image to Supabase
      let imageUrl = "";
      if (formData.imageFile) {
        // Sanitize file name
        const sanitizedFileName = formData.imageFile.name
          .replace(/[^a-zA-Z0-9.]/g, "_") // Replace special characters with underscores
          .toLowerCase();

        const uniqueFilePath = `orders/${orderId}/${sanitizedFileName}`; // Save in a folder named after the order ID

        const { data, error } = await supabase.storage
          .from("order-images")
          .upload(uniqueFilePath, formData.imageFile);

        if (error) {
          console.error("Error uploading image to Supabase", error);
          imageUrl = null; // Explicitly set to null if upload fails
        } else {
          imageUrl = getImageUrl("order-images", uniqueFilePath); // Use getImageUrl to retrieve the public URL
        }
      }

      const { imageFile, ...orderData } = formData; // Exclude imageFile from the data to be saved

      const newOrder = {
        id: orderId, // Use the generated unique ID for the order
        orderNumber: newOrderNumber, // Assign the next order number
        ...orderData,
        ...(imageUrl ? { imageUrl } : {}), // Only include imageUrl if it is valid
        brandUid: user.uid, // Add brand UID
        influencerUid: likedInfluencers.find(
          (influencer) => influencer.username === formData.influencer
        )?.uid, // Add influencer UID
        status: "pending", // Default status for new orders
        createdAt: new Date().toISOString(),
      };

      // Use the `id` field as the Firestore document ID
      const orderDocRef = firestoreDoc(db, "orders", newOrder.id);
      await setDoc(orderDocRef, newOrder); // Save the order with the specified ID

      setOrders((prevOrders) => [...prevOrders, newOrder]); // Update orders state immediately
      handleClose();
    } catch (error) {
      console.error("Error saving order to Firestore", error);
    }
  };

  const handleOrderStatusUpdate = async (orderId, status) => {
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("id", "==", orderId)); // Query by the 'id' field
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error(`Order with ID ${orderId} does not exist in Firestore.`);
        console.log("Available orders in state:", orders);
        return;
      }

      const orderDocRef = querySnapshot.docs[0].ref; // Get the document reference

      await updateDoc(orderDocRef, {
        status,
      });

      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === orderId ? { ...order, status } : order))
      );
      handleReviewDialogClose(); // Close the dialog after updating
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleReviseSubmit = async (text) => {
    if (!selectedOrder) return;

    try {
      const orderRef = firestoreDoc(db, "orders", selectedOrder.id);
      const orderSnap = await getDoc(orderRef);
      let revisions = [];

      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.revisions && Array.isArray(orderData.revisions)) {
          revisions = orderData.revisions;
        }
      }

      revisions.push({
        text,
        revisedAt: new Date().toISOString(),
      });

      await updateDoc(orderRef, { revisions });
      console.log("Revision added successfully");

      // Close the review dialog after successful submission
      setReviewDialogOpen(false);
    } catch (error) {
      console.error("Error adding revision:", error);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "completed") return order.status === "completed";
    if (filter === "remaining") return order.status === "remaining"; // Show only orders with 'running' status
    if (filter === "pending") return order.status === "pending";
    return true; // Default to all orders
  });

  const sortedOrders = filteredOrders.sort((a, b) => a.orderNumber - b.orderNumber);

  const renderReviewDialogActions = () => {
    if (selectedOrder?.status === "completed") {
      return null; // No buttons for completed orders
    }

    return (
      <>
        <Button onClick={() => handleOrderStatusUpdate(selectedOrder.id, "revise")} color="warning" variant="contained">
          Revise
        </Button>
        <Button onClick={() => handleOrderStatusUpdate(selectedOrder.id, "completed")} color="primary" variant="contained">
          Completed
        </Button>
      </>
    );
  };

  useEffect(() => {
    const fetchUnseenSubmissions = async () => {
      const user = auth.currentUser;
      if (user) {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("brandUid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const unseen = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.submission && Array.isArray(data.submission.files)) {
            const unseenCount = data.submission.files.filter((file) => !file.seenByBrand).length;
            if (unseenCount > 0) {
              unseen[doc.id] = unseenCount;
            }
          }
        });
        setUnseenSubmissions(unseen);
      }
    };

    fetchUnseenSubmissions();
  }, [orders]);

  const markSubmissionsAsSeen = async (orderId) => {
    try {
      const orderRef = firestoreDoc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.submission && Array.isArray(orderData.submission.files)) {
          const updatedFiles = orderData.submission.files.map((file) => ({
            ...file,
            seenByBrand: true,
          }));
          await updateDoc(orderRef, { submission: { files: updatedFiles } });
          setUnseenSubmissions((prev) => {
            const updated = { ...prev };
            delete updated[orderId];
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error marking submissions as seen:", error);
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
        minHeight: "calc(100vh - 64px)",
        width: "100vw",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        top: 0,
        '@media (max-width: 600px)': {
          padding: "16px",
        },
      }}
    >
      <Box
        sx={{
          border: "1px solid #ccc",
          borderRadius: "16px",
          padding: "24px",
          backgroundColor: "#fff",
          width: "80%",
          maxWidth: "100%",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          '&:hover': {
            transform: "scale(1.03)",
            boxShadow: "0 12px 24px rgba(0, 0, 0, 0.3)",
          },
          '@media (max-width: 600px)': {
            padding: "16px",
            width: "100%",
          },
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "24px",
            animation: "fadeIn 1s ease-in-out",
            '@media (max-width: 600px)': {
              fontSize: "1.5rem",
            },
          }}
        >
          Orders Summary
        </Typography>
        <Button
          onClick={handleOpen}
          variant="contained"
          color="primary"
          sx={{
            marginBottom: "24px",
            padding: "12px 24px",
            fontWeight: "bold",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #FF6EC7 0%, #4A90E2 100%)",
            transition: "all 0.3s ease",
            '&:hover': {
              background: "linear-gradient(135deg, #4A90E2 0%, #FF6EC7 100%)",
              transform: "scale(1.05)",
            },
            '@media (max-width: 600px)': {
              padding: "10px 20px",
              fontSize: "0.9rem",
            },
          }}
        >
          New Order
        </Button>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "24px",
            animation: "fadeIn 1s ease-in-out",
            flexWrap: "wrap",
            '@media (max-width: 600px)': {
              gap: "8px",
            },
          }}
        >
          {['all', 'completed', 'remaining', 'pending'].map((type) => (
            <Button
              key={type}
              variant={filter === type ? "contained" : "outlined"}
              onClick={() => setFilter(type)}
              sx={{
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: "bold",
                backgroundColor: filter === type ? "#4A90E2" : "transparent",
                color: filter === type ? "#fff" : "#000",
                transition: "all 0.3s ease",
                '&:hover': {
                  backgroundColor: "#4A90E2",
                  color: "#fff",
                },
                '@media (max-width: 600px)': {
                  padding: "8px 16px",
                  fontSize: "0.8rem",
                },
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Orders
            </Button>
          ))}
        </Box>
        <TableContainer
          sx={{
            maxHeight: "360px", // Further reduced the height of the table container
            overflowY: "auto", // Enable vertical scrolling for table body
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
            borderRadius: "16px",
            backgroundColor: "#fff", // Add a solid white background
          }}
        >
          <Table stickyHeader sx={{ backgroundColor: "#fff" }}>
            <TableHead>
              <TableRow>
                {['Order ID', 'Influencer', 'Status', 'Total Cost', 'Actions'].map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      fontWeight: "bold",
                      color: "#333",
                      '@media (max-width: 600px)': {
                        fontSize: "0.8rem",
                      },
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: "bold", color: "#333" }}>
                  Complete
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map((order, index) => (
                <TableRow
                  key={index}
                  sx={{
                    transition: "background-color 0.3s ease",
                    '&:hover': {
                      backgroundColor: "rgba(0, 123, 255, 0.1)",
                    },
                  }}
                >
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.influencer}</TableCell>
                  <TableCell>
                    {order.status === "completed" && (
                      <Typography variant="body2" color="green">
                        Completed
                      </Typography>
                    )}
                    {order.status === "pending" && (
                      <Typography variant="body2" color="orange">
                        Pending
                      </Typography>
                    )}
                    {order.status === "remaining" && (
                      <Typography variant="body2" color="blue">
                        In Progress
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>Rs {order.totalCost}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleDetailsOpen(order)}
                      sx={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        transition: "all 0.3s ease",
                        '&:hover': {
                          backgroundColor: "#4A90E2",
                          transform: "scale(1.05)",
                        },
                        '@media (max-width: 600px)': {
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                        },
                      }}
                    >
                      Details
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        handleReviewDialogOpen(order);
                        markSubmissionsAsSeen(order.id);
                      }}
                      sx={{ position: "relative" }}
                    >
                      Review
                      {unseenSubmissions[order.id] && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: "16px",
                            height: "16px",
                            backgroundColor: "red",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}
                        >
                          {unseenSubmissions[order.id]}
                        </Box>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <Dialog
        open={open} // Ensure the dialog is controlled by the `open` state
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="new-order-dialog-title"
        aria-describedby="new-order-dialog-description"
        disableEnforceFocus
      >
        <DialogTitle id="new-order-dialog-title"></DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: "#f9f9f9",
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              textAlign: "center",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "20px",
            }}
          >
            Create New Order
          </Typography>
          <Box
            component="form"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <TextField
              select
              fullWidth
              margin="normal"
              label="Select Influencer"
              name="influencer"
              value={formData.influencer}
              onChange={handleChange}
              required
              sx={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {likedInfluencers.map((influencer, index) => (
                <MenuItem key={index} value={influencer.username}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={influencer.image || "/dp.png"}
                      alt={influencer.username}
                      style={{ width: "30px", height: "30px", borderRadius: "50%" }}
                    />
                    {influencer.username}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              label="Order Details"
              name="orderDetails"
              value={formData.orderDetails}
              onChange={handleChange}
              required
              multiline
              rows={4}
              sx={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Total Cost (Rs)"
              name="totalCost"
              type="number"
              value={formData.totalCost}
              onChange={handleChange}
              required
              sx={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            />
            <TextField
              select
              fullWidth
              margin="normal"
              label="Days to Complete Order"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              required
              sx={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {[...Array(30).keys()].map((day) => (
                <MenuItem key={day + 1} value={day + 1}>
                  {day + 1} {day + 1 === 1 ? "day" : "days"}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              label="Upload Image"
              name="imageFile"
              type="file"
              InputLabelProps={{ shrink: true }}
              onChange={handleChange}
              sx={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px",
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={handleClose}
            color="secondary"
            variant="outlined"
            sx={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: "bold",
              transition: "all 0.3s ease",
              '&:hover': {
                backgroundColor: "#f0f0f0",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            sx={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #FF6EC7 0%, #4A90E2 100%)",
              transition: "all 0.3s ease",
              '&:hover': {
                background: "linear-gradient(135deg, #4A90E2 0%, #FF6EC7 100%)",
                transform: "scale(1.05)",
              },
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={detailsOpen}
        onClose={handleDetailsClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          {selectedOrder && (
            <Box
              sx={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
              }}
            >
              <Typography
                variant="h4"
                sx={{ textAlign: "center", fontWeight: "bold", color: "#333" }}
              >
                Order Details
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" color="textSecondary">
                    Order Number:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    #{selectedOrder.orderNumber}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="textSecondary">
                    Influencer:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {selectedOrder.influencer}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="textSecondary">
                    Total Cost:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    Rs {selectedOrder.totalCost}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="textSecondary">
                    Deadline:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {selectedOrder.deadline} {selectedOrder.deadline === 1 ? "day" : "days"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="textSecondary">
                    Status:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        selectedOrder.status === "completed"
                          ? "green"
                          : "orange",
                    }}
                  >
                    {selectedOrder.status}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" color="textSecondary">
                    Time Remaining:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: selectedOrder.status === "completed" ? "green" : selectedOrder.remainingTime === "00:00:00:00" ? "red" : "green",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedOrder.status === "completed"
                      ? "Order delivered in time"
                      : selectedOrder.remainingTime || "Not Started"}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Order Details:
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    backgroundColor: "#fff",
                    padding: "10px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {selectedOrder.orderDetails}
                </Typography>
              </Box>
              {selectedOrder.imageUrl && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '20px',
                  }}
                >
                  <Typography variant="subtitle1" color="textSecondary">
                    Order Image:
                  </Typography>
                  <img
                    src={selectedOrder.imageUrl}
                    alt="Order"
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      height: 'auto',
                      borderRadius: '8px',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                      marginBottom: '10px',
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    href={selectedOrder.imageUrl}
                    download
                    sx={{
                      textTransform: 'none',
                    }}
                  >
                    Download Image
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsClose} color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* Review Submission Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={handleReviewDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review Submission</DialogTitle>
        <DialogContent>
          {selectedOrder?.submission?.files && selectedOrder.submission.files.length > 0 ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                Submitted Files:
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {selectedOrder.submission.files.map((file, idx) => {
                  const isImage = file.fileType && file.fileType.startsWith("image");
                  const isVideo = file.fileType && file.fileType.startsWith("video");
                  return (
                    <Box key={idx} sx={{ mb: 2, textAlign: "center" }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        File {idx + 1}:
                      </Typography>
                      {isImage ? (
                        <img
                          src={file.fileUrl}
                          alt={`Submitted File ${idx + 1}`}
                          style={{
                            width: "100%",
                            maxWidth: "180px", // Smaller image size
                            height: "auto",
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                            marginBottom: "8px",
                            objectFit: "cover"
                          }}
                        />
                      ) : isVideo ? (
                        <video
                          src={file.fileUrl}
                          controls
                          style={{
                            width: "100%",
                            maxWidth: "180px", // Smaller video size
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                            marginBottom: "8px",
                            objectFit: "cover"
                          }}
                        />
                      ) : null}
                      <a href={file.fileUrl + `?download`} download={
                        isImage ? `image${idx + 1}.${file.fileType.split('/')[1]}` :
                        isVideo ? `video${idx + 1}.${file.fileType.split('/')[1]}` :
                        `file${idx + 1}`
                      } target="_blank" rel="noopener noreferrer">
                        <Button variant="outlined" color="primary" sx={{ mt: 1, minWidth: 0, padding: 1, borderRadius: "50%" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 16.5a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v10.5a1 1 0 0 1-1 1Z"/>
                            <path fill="currentColor" d="M7.21 13.79a1 1 0 0 1 1.42-1.42L11 14.66V5a1 1 0 1 1 2 0v9.66l2.37-2.29a1 1 0 1 1 1.42 1.42l-4.08 4a1 1 0 0 1-1.42 0l-4.08-4Z"/>
                            <path fill="currentColor" d="M5 20a1 1 0 0 1 0-2h14a1 1 0 1 1 0 2H5Z"/>
                          </svg>
                        </Button>
                      </a>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No files submitted yet.
            </Typography>
          )}
          <Box sx={{ marginTop: "20px" }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Enter your revision text here..."
              variant="outlined"
              onChange={(e) => setRevisionText(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              sx={{ marginTop: "10px" }}
              onClick={() => handleReviseSubmit(revisionText)}
            >
              Submit Revision
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReviewDialogClose} color="secondary">
            Cancel
          </Button>
          {renderReviewDialogActions()}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BrandOrders;