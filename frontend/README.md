# Flumers.AI

## Project Overview
Flumers.AI is a next-generation AI-powered influencer marketing platform that bridges the gap between brands and influencers. It facilitates influencer discovery, real-time communication, campaign proposal handling, and collaboration analytics.

## Folder Structure
```
public/
  favicon.ico
  index.html
  logo192.png
  logo512.png
  manifest.json
  robots.txt
src/
  api/
    api.js
    auth.js
    firebaseConfig.js
    supabaseConfig.js
  auth/
    authSlice.js
    Login.js
    Signup.js
  components/
    AnalyticsDashboard.js
    Chart.js
    FileUpload.js
    HomePage.js
    Navbar.js
    SelectRole.js
    Table.js
    UserInfo.js
  features/
    campaigns/
      CampaignCreation.js
      CampaignEdit.js
      CampaignList.js
    chat/
      BrandChats.js
      Chat.css
      Chat.js
      chatSlice.js
    notifications/
      Notifications.js
      notificationsSlice.js
    profile/
      BrandDashboard.js
      BrandOrders.js
      BrandProfile.js
      InfluencerDashboard.js
      InfluencerProfile.js
      profileSlice.js
      SearchInfluencers.js
      UserProfile.js
  routes/
    ProtectedRoute.js
  store/
    index.js
    slices/
      campaignSlice.js
      notificationSlice.js
  styles/
    theme.js
```

## Setup Instructions
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Start the development server with `npm start`.

## Contribution Guidelines
- Follow the folder structure and naming conventions.
- Write tests for new features.
- Ensure code is linted and formatted before committing.

## Testing
- Run `npm test` to execute tests.

## License
This project is licensed under the MIT License.
