// Firebase configuration file
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy, getDocs, updateDoc } from "firebase/firestore";

// Ensure the Firebase API key is loaded from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyC6G6sInNBjuNdyoGGcOlDDIrq3_2SGi8Y",
  authDomain: "flumers-ai.firebaseapp.com",
  projectId: "flumers-ai",
  storageBucket: "flumers-ai.appspot.com",
  messagingSenderId: "475488141433",
  appId: "1:475488141433:web:fe2755138e886ca75414a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Function to set user role during registration
export const setUserRole = async (uid, role) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { role }, { merge: true });
};

// Function to get user role from Firestore
export const getUserRole = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data().role;
    } else {
      throw new Error("User role not found");
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
    throw error;
  }
};

// Function to send a message
export const sendMessage = async (senderId, receiverId, content) => {
  const messagesRef = collection(db, "messages");
  await addDoc(messagesRef, {
    senderId,
    receiverId,
    content,
    timestamp: new Date(),
  });
};

// Function to listen for messages between two users
export const listenForMessages = (senderId, receiverId, callback) => {
  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("senderId", "in", [senderId, receiverId]),
    where("receiverId", "in", [senderId, receiverId]),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};

// Function to create a campaign
export const createCampaign = async (title, description, budget, createdBy) => {
  const campaignsRef = collection(db, "campaigns");
  await addDoc(campaignsRef, {
    title,
    description,
    budget,
    createdBy,
    timestamp: new Date(),
  });
};

// Function to fetch all campaigns
export const fetchCampaigns = async () => {
  const campaignsRef = collection(db, "campaigns");
  const snapshot = await getDocs(campaignsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Function to update user profile
export const updateUserProfile = async (uid, profileData) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, profileData);
};

// Function to fetch user profile
export const fetchUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userDoc = await getDoc(userRef);
  return userDoc.exists() ? userDoc.data() : null;
};

// Function to listen for notifications (with optional unread filter)
export const listenForNotifications = (uid, callback, onlyUnread = false) => {
  const notificationsRef = collection(db, "notifications");
  let q = query(notificationsRef, where("userId", "==", uid), orderBy("timestamp", "desc"));

  if (onlyUnread) {
    q = query(notificationsRef, where("userId", "==", uid), where("read", "==", false), orderBy("timestamp", "desc"));
  }

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(notifications);
  });
};

// Function to create a notification
export const createNotification = async (userId, message) => {
  const notificationsRef = collection(db, "notifications");
  await addDoc(notificationsRef, {
    userId,
    message,
    read: false, // Default to unread
    timestamp: new Date(),
  });
};

// Function to mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { read: true });
};