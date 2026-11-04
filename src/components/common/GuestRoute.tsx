import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { tokenStorage } from "../../services/api";

type Props = {
  children: React.ReactElement;
};

const GuestRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const hasToken = !!tokenStorage.getAccessToken();

  // If already logged in, do not allow opening the login page; redirect to home
  if (isAuthenticated || hasToken) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default GuestRoute;
