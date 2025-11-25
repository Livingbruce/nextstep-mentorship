import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./utils/AuthContext.jsx";
import { ThemeProvider } from "./ThemeContext.jsx";
import { SecurityProvider } from "./SecurityContext.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import "./styles/theme.css";

// Page imports
import AuthPortal from "./pages/AuthPortal.jsx";
import Signup from "./pages/Signup.jsx";
import EmailVerification from "./pages/EmailVerification.jsx"; // New import
import CheckEmail from "./pages/CheckEmail.jsx"; // New import
import VerificationPending from "./pages/VerificationPending.jsx"; // New import
import Dashboard from "./pages/Dashboard.jsx";
import Appointments from "./pages/Appointments.jsx";
import Announcements from "./pages/Announcements.jsx";
import Activities from "./pages/Activities.jsx";
import Books from "./pages/Books.jsx";
import Mentorships from "./pages/Mentorships.jsx";
import Absence from "./pages/Absence.jsx";
import Contacts from "./pages/Contacts.jsx";
import SupportTickets from "./pages/SupportTickets.jsx";
import Department from "./pages/Department.jsx";
import Notifications from "./pages/Notifications.jsx";
import Profile from "./pages/Profile.jsx";
import BookingForm from "./pages/BookingForm.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
// Storefront pages
import BooksHome from "./pages/store/BooksHome.jsx";
import BookDetail from "./pages/store/BookDetail.jsx";
import Checkout from "./pages/store/Checkout.jsx";
import MyOrders from "./pages/store/MyOrders.jsx";
import MyLibrary from "./pages/store/MyLibrary.jsx";
import Wishlist from "./pages/store/Wishlist.jsx";
import EmailLogin from "./pages/store/EmailLogin.jsx";
import StoreProfile from "./pages/store/Profile.jsx";
import StoreAuth from "./components/StoreAuth.jsx";
import OrderThanks from "./pages/store/OrderThanks.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SecurityProvider>
          <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthPortal />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<EmailVerification />} /> {/* Email verification route */}
          <Route path="/check-email" element={<CheckEmail />} /> {/* Email check page */}
          <Route path="/verification-pending" element={<VerificationPending />} /> {/* Verification pending page */}
          <Route path="/booking" element={<BookingForm />} />
          <Route path="/booking/confirmation" element={<BookingConfirmation />} />

          {/* Public bookstore routes with email login */}
          <Route path="/store/login" element={<EmailLogin />} />
          <Route path="/store" element={<StoreAuth><BooksHome /></StoreAuth>} />
          <Route path="/store/books/:id" element={<StoreAuth><BookDetail /></StoreAuth>} />
          <Route path="/store/books/:id/checkout" element={<StoreAuth><Checkout /></StoreAuth>} />
          <Route path="/store/thanks" element={<StoreAuth><OrderThanks /></StoreAuth>} />
          <Route path="/account/orders" element={<StoreAuth><MyOrders /></StoreAuth>} />
          <Route path="/account/library" element={<StoreAuth><MyLibrary /></StoreAuth>} />
          <Route path="/account/wishlist" element={<StoreAuth><Wishlist /></StoreAuth>} />
          <Route path="/account/profile" element={<StoreAuth><StoreProfile /></StoreAuth>} />
          
          {/* Protected routes without NavBar */}
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/appointments" element={
            <PrivateRoute>
              <Appointments />
            </PrivateRoute>
          } />
          <Route path="/announcements" element={
            <PrivateRoute>
              <Announcements />
            </PrivateRoute>
          } />
          <Route path="/activities" element={
            <PrivateRoute>
              <Activities />
            </PrivateRoute>
          } />
          <Route path="/books" element={
            <PrivateRoute>
              <Books />
            </PrivateRoute>
          } />
          <Route path="/mentorships" element={
            <PrivateRoute>
              <Mentorships />
            </PrivateRoute>
          } />
          <Route path="/absence" element={
            <PrivateRoute>
              <Absence />
            </PrivateRoute>
          } />
          <Route path="/contacts" element={
            <PrivateRoute>
              <Contacts />
            </PrivateRoute>
          } />
          <Route path="/support-tickets" element={
            <PrivateRoute>
              <SupportTickets />
            </PrivateRoute>
          } />
          <Route path="/department" element={
            <PrivateRoute>
              <Department />
            </PrivateRoute>
          } />
          <Route path="/notifications" element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } />
        </Routes>
          </Router>
        </SecurityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
