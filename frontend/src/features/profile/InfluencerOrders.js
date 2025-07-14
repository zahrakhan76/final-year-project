import React, { useState, useEffect } from "react";
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { db, auth } from "../../api/firebaseConfig";
import { collection, query, where, getDocs, updateDoc, serverTimestamp, doc as firestoreDoc, getDoc, setDoc } from "firebase/firestore";
import { supabase } from "../../api/supabaseConfig";
import { getImageUrl } from "../../api/supabaseConfig";

const InfluencerOrders = () => {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [file, setFile] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [unseenRevisions, setUnseenRevisions] = useState({});

  useEffect(() => {
    const fetchOrders = async () => {
      const user = auth.currentUser;
      if (user) {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("influencerUid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(fetchedOrders);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchUnseenRevisions = async () => {
      const user = auth.currentUser;
      if (user) {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("influencerUid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const unseen = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.revisions && Array.isArray(data.revisions)) {
            const unseenCount = data.revisions.filter((rev) => !rev.seenByInfluencer).length;
            if (unseenCount > 0) {
              unseen[doc.id] = unseenCount;
            }
          }
        });
        setUnseenRevisions(unseen);
      }
    };

    fetchUnseenRevisions();
  }, [orders]);

  const filteredOrders = orders.filter((order) => {
    if (filter === "completed") return order.status === "completed";
    if (filter === "remaining") return order.status === "remaining"; // Show only orders with 'remaining' status
    if (filter === "pending") return order.status === "pending";
    return true;
  });

  const sortedOrders = filteredOrders.sort((a, b) => a.orderNumber - b.orderNumber);

  const handleClose = () => setOpen(false);

  const handleDetailsOpen = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setSelectedOrder(null);
    setDetailsOpen(false);
  };

  const handleFileDialogOpen = (order) => {
    setSelectedOrder(order);
    setFileDialogOpen(true);
  };

  const handleFileDialogClose = () => {
    setSelectedOrder(null);
    setFileDialogOpen(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
    }
  };

  const handleFileSubmit = async () => {
    if (!file || !selectedOrder) return;

    try {
      const orderId = selectedOrder.id;
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
      const uniqueFilePath = `${orderId}/${sanitizedFileName}`; // Save in a folder named after the order ID

      console.log("Uploading file to Supabase with path:", uniqueFilePath);
      console.log("File details:", file);

      // Upload file to Supabase bucket
      const { data, error } = await supabase.storage
        .from("orders-submission")
        .upload(uniqueFilePath, file);

      if (error) {
        console.error("Supabase upload error:", error);
        return;
      }

      console.log("Supabase upload response:", data);

      // Wait for a short delay to ensure Supabase propagates the file
      await new Promise(res => setTimeout(res, 400));
      // Correctly generate the public URL using the helper
      const fileUrl = getImageUrl("orders-submission", uniqueFilePath);
      console.log("Generated public fileUrl:", fileUrl);

      // Save file URL to Firestore as an array (append)
      const orderRef = firestoreDoc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      let files = [];
      let brandUid = null;
      let influencerUid = null;
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.submission && Array.isArray(orderData.submission.files)) {
          files = orderData.submission.files;
        }
        brandUid = orderData.brandUid;
        influencerUid = orderData.influencerUid;
      }
      // Remove any undefined/null entries
      files = files.filter(f => f && f.fileUrl);
      files.push({
        fileUrl: fileUrl || "",
        fileType: file.type || "",
        submittedAt: new Date().toISOString(),
      });
      await updateDoc(orderRef, {
        submission: { files: files }
        // SubmitFile field removed as per user request
      });

      // Save submission info to a new Firestore collection for easy fetch
      if (fileUrl && brandUid && influencerUid) {
        const submissionRef = firestoreDoc(db, "order_submissions", `${orderId}_${Date.now()}`);
        await setDoc(submissionRef, {
          orderId,
          fileUrl,
          brandUid,
          influencerUid,
          fileType: file.type || "",
          submittedAt: new Date().toISOString(),
        });
      }

      console.log("File submitted successfully:", fileUrl);

      // Close the dialog and reset the file state immediately after successful upload
      setFileDialogOpen(false);
      setFile(null);
    } catch (error) {
      console.error("Error submitting file:", error);
    }
  };

  const startOrderTimer = async (orderId) => {
    try {
      console.log("Attempting to fetch order with ID:", orderId);
      const ordersRef = collection(db, "orders");
      const querySnapshot = await getDocs(query(ordersRef, where("id", "==", orderId)));
      if (querySnapshot.empty) {
        console.error(`Order with ID ${orderId} does not exist in Firestore.`);
        return;
      } else {
        console.log("Order fetched successfully:", querySnapshot.docs[0].data());
      }

      const docId = querySnapshot.docs[0].id; // Use the Firestore document ID
      const orderRef = firestoreDoc(db, "orders", docId); // Correct document reference
      const orderSnapshot = await getDoc(orderRef);
      if (!orderSnapshot.exists()) {
        console.error(`Order with ID ${orderId} does not exist.`);
        return;
      }
      await updateDoc(orderRef, {
        startTime: serverTimestamp(), // Store the start time in Firestore
        status: "remaining", // Update the status to remaining
      });
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "remaining", startTime: new Date().toISOString() } : order
        )
      );
    } catch (error) {
      console.error("Error starting order timer:", error);
    }
  };

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

  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.status === "remaining" && order.startTime) {
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

  const handleRevisionsOpen = async (order) => {
    try {
      const orderRef = firestoreDoc(db, "orders", order.id);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        setRevisions(orderData.revisions || []);
      }
      setRevisionsOpen(true);
    } catch (error) {
      console.error("Error fetching revisions:", error);
    }
  };

  const handleRevisionsClose = () => {
    setRevisionsOpen(false);
    setRevisions([]);
  };

  const markRevisionsAsSeen = async (orderId) => {
    try {
      const orderRef = firestoreDoc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.revisions && Array.isArray(orderData.revisions)) {
          const updatedRevisions = orderData.revisions.map((rev) => ({
            ...rev,
            seenByInfluencer: true,
          }));
          await updateDoc(orderRef, { revisions: updatedRevisions });
          setUnseenRevisions((prev) => {
            const updated = { ...prev };
            delete updated[orderId];
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error marking revisions as seen:", error);
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
          }}
        >
          Orders Summary
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
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
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Orders
            </Button>
          ))}
        </Box>
        <TableContainer
          sx={{
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
            borderRadius: "16px",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                {['Order Number', 'Remaining Time', 'Total Cost', 'Order Details', 'Files', 'Revisions'].map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      fontWeight: "bold",
                      color: "#333",
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>
                    {order.status === "remaining" ? (
                      <Box>
                        <Typography variant="body2" color="primary">
                          {order.remainingTime || "Calculating..."}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {order.remainingTime === "00:00:00:00"
                            ? "Order Delayed"
                            : "Order In Progress"}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        {order.status === "completed" ? "Order Completed" : order.status}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{order.totalCost}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleDetailsOpen(order)}
                    >
                      Details
                    </Button>
                    {order.status === "pending" && (
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => startOrderTimer(order.id)}
                        sx={{ marginLeft: "10px" }}
                      >
                        Start
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.status === "completed" ? (
                      <Typography variant="body2" color="green">
                        Completed
                      </Typography>
                    ) : (
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleFileDialogOpen(order)}
                      >
                        Submit Files
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        handleRevisionsOpen(order);
                        markRevisionsAsSeen(order.id);
                      }}
                      sx={{ position: "relative" }}
                    >
                      View Revisions
                      {unseenRevisions[order.id] && (
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
                          {unseenRevisions[order.id]}
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
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <Typography variant="h5" sx={{ textAlign: "center", fontWeight: "bold", color: "#333" }}>
            Create New Order
          </Typography>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <TextField fullWidth margin="normal" label="Order Details" name="orderDetails" required />
            <TextField fullWidth margin="normal" label="Total Cost" name="totalCost" type="number" required />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">Cancel</Button>
          <Button color="primary" variant="contained">Submit</Button>
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
                <Box sx={{ textAlign: "center", marginTop: "20px" }}>
                  <Typography variant="subtitle1" color="textSecondary">
                    Order Image:
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <img
                      src={selectedOrder.imageUrl}
                      alt={selectedOrder.imageUrl ? "Order" : ""}
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        height: "auto",
                        borderRadius: "8px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      href={selectedOrder.imageUrl}
                      download
                      sx={{
                        marginTop: "10px",
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
                      Download Image
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsClose} color="secondary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* File Submission Dialog */}
      <Dialog
        open={fileDialogOpen}
        onClose={handleFileDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit Files</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Upload video or image files for the order.
          </Typography>
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <TextField
              fullWidth
              margin="normal"
              type="file"
              inputProps={{ accept: "image/*,video/*" }}
              onChange={handleFileChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFileDialogClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleFileSubmit} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      {/* Revisions Dialog */}
      <Dialog
        open={revisionsOpen}
        onClose={handleRevisionsClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Revisions</DialogTitle>
        <DialogContent>
          {revisions.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {revisions.map((revision, index) => (
                <Box
                  key={index}
                  sx={{
                    padding: "10px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    {revision.revisedAt}
                  </Typography>
                  <Typography variant="body1">{revision.text}</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No revisions available.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRevisionsClose} color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InfluencerOrders;