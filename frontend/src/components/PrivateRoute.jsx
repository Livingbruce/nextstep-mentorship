import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../utils/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const PrivateRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Only redirect if we're sure the user is not authenticated
  // Give AuthContext time to restore from localStorage
  if (!loading && !isAuthenticated && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
