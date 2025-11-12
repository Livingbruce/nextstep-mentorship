import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function StoreAuth({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const email = localStorage.getItem("store_user_email");
    
    // Allow access to login page
    if (location.pathname === "/store/login") {
      return;
    }

    // Require login for store pages
    if (location.pathname.startsWith("/store") || location.pathname.startsWith("/account")) {
      if (!email) {
        navigate("/store/login", { 
          state: { from: location },
          replace: true 
        });
      }
    }
  }, [navigate, location]);

  return children;
}

