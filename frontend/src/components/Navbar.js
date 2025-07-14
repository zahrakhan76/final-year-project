import React, { useState } from "react";
import { AppBar, Toolbar, Button, Box, useMediaQuery, Drawer, IconButton, List, ListItem, ListItemText, Divider, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../api/firebaseConfig";
import logo from '../logo.png';
import { Close as CloseIcon, Person as PersonIcon, ShoppingCart as ShoppingCartIcon, Chat as ChatIcon, Search as SearchIcon, ExitToApp as ExitToAppIcon, Login as LoginIcon, AppRegistration as AppRegistrationIcon } from "@mui/icons-material";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useAuthState(auth);
  const isMobile = useMediaQuery("(max-width:600px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isBrand = location.pathname.includes("brand");
  const isInfluencer = location.pathname.includes("influencer");

  const handleLogout = () => {
    auth.signOut();
    navigate("/");
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <AppBar
      position="static"
      sx={{
        background: "linear-gradient(135deg, #FF6EC7, #4A90E2)",
        boxShadow: "none",
        height: isMobile ? 60 : 80,
      }}
    >
      <Toolbar
        sx={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Flumers.AI Logo"
          sx={{
            height: isMobile ? 40 : 60,
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        />
        {isMobile ? (
          <>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={toggleDrawer(false)}
              sx={{
                "& .MuiDrawer-paper": {
                  backgroundColor: "#ffffff",
                  color: "#333",
                  padding: "16px",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <Box
                sx={{
                  width: 300,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
                role="presentation"
                onKeyDown={toggleDrawer(false)}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    marginBottom: "16px",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#4A90E2",
                    }}
                  >
                    Menu
                  </Typography>
                  <IconButton onClick={toggleDrawer(false)}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Divider sx={{ width: "100%", marginBottom: "16px" }} />
                <List sx={{ width: "100%" }}>
                  {user && isInfluencer && (
                    <>
                      <ListItem button="true" onClick={() => navigate("/influencer-profile")}>
                        <PersonIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Profile" />
                      </ListItem>
                      <ListItem button="true" onClick={() => navigate("/influencer-orders")}>
                        <ShoppingCartIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Orders" />
                      </ListItem>
                      <ListItem button="true" onClick={() => navigate("/influencer-chats")}>
                        <ChatIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Chats" />
                      </ListItem>
                    </>
                  )}
                  {user && isBrand && (
                    <>
                      <ListItem button="true" onClick={() => navigate("/brand-profile")}>
                        <PersonIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Profile" />
                      </ListItem>
                      <ListItem button="true" onClick={() => navigate("/search-influencers")}>
                        <SearchIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Search Influencers" />
                      </ListItem>
                      <ListItem button="true" onClick={() => navigate("/brand-chats")}>
                        <ChatIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Chats" />
                      </ListItem>
                      <ListItem button="true" onClick={() => navigate("/brand-orders")}>
                        <ShoppingCartIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Orders" />
                      </ListItem>
                    </>
                  )}
                  {user && (
                    <ListItem button="true" onClick={handleLogout}>
                      <ExitToAppIcon sx={{ marginRight: "8px" }} />
                      <ListItemText primary="Logout" />
                    </ListItem>
                  )}
                  {!user && !isAuthPage && (
                    <>
                      <ListItem button="true" onClick={() => navigate("/login")}>
                        <LoginIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Login" />
                      </ListItem>
                      <ListItem button="true" onClick={() => navigate("/signup")}>
                        <AppRegistrationIcon sx={{ marginRight: "8px" }} />
                        <ListItemText primary="Signup" />
                      </ListItem>
                    </>
                  )}
                </List>
                <Divider sx={{ width: "100%", marginTop: "16px" }} />
                <Typography
                  variant="body2"
                  sx={{
                    marginTop: "16px",
                    color: "#777",
                    textAlign: "center",
                  }}
                >
                  © 2025 Flumers.AI
                </Typography>
              </Box>
            </Drawer>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 2,
            }}
          >
            {user && isInfluencer && (
              <>
                <Button color="inherit" onClick={() => navigate("/influencer-profile")}>Profile</Button>
                <Button color="inherit" onClick={() => navigate("/influencer-orders")}>Orders</Button>
                <Button color="inherit" onClick={() => navigate("/influencer-chats")}>Chats</Button>
              </>
            )}
            {user && isBrand && (
              <>
                <Button color="inherit" onClick={() => navigate("/brand-profile")}>Profile</Button>
                <Button color="inherit" onClick={() => navigate("/search-influencers")}>Search Influencers</Button>
                <Button color="inherit" onClick={() => navigate("/brand-chats")}>Chats</Button>
                <Button color="inherit" onClick={() => navigate("/brand-orders")}>Orders</Button>
              </>
            )}
            {user && (
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            )}
            {!user && !isAuthPage && (
              <>
                <Button color="inherit" onClick={() => navigate("/login")}>Login</Button>
                <Button color="inherit" onClick={() => navigate("/signup")}>Signup</Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;