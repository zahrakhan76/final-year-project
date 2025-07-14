import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, Avatar, Button, TextField } from '@mui/material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../api/firebaseConfig';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', bio: '' });

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          setFormData({
            name: userDoc.data().name || '',
            bio: userDoc.data().bio || '',
          });
        }
      }
    };

    fetchUserData();
  }, []);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), formData);
      setUserData((prev) => ({ ...prev, ...formData }));
      setIsEditing(false);
    }
  };

  if (!userData) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Container style={{ marginTop: '30px' }}>
      <Paper style={{ padding: '20px', borderRadius: '15px' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid>
            <Avatar style={{ width: '80px', height: '80px' }}>{userData.name?.[0]}</Avatar>
          </Grid>
          <Grid>
            {isEditing ? (
              <>
                <TextField
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  style={{ marginBottom: '10px' }}
                />
                <TextField
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                />
              </>
            ) : (
              <>
                <Typography variant="h5">{userData.name}</Typography>
                <Typography variant="body1" color="textSecondary">
                  {userData.bio}
                </Typography>
              </>
            )}
          </Grid>
        </Grid>
        <Grid container spacing={2} style={{ marginTop: '20px' }}>
          <Grid>
            {isEditing ? (
              <Button variant="contained" color="primary" onClick={handleSave}>
                Save
              </Button>
            ) : (
              <Button variant="contained" color="primary" onClick={handleEditToggle}>
                Edit Profile
              </Button>
            )}
          </Grid>
          {isEditing && (
            <Grid>
              <Button variant="outlined" color="secondary" onClick={handleEditToggle}>
                Cancel
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
};

export default UserProfile;