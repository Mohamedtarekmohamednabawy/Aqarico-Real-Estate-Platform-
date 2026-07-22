import { Navigate } from "react-router-dom";
import authService from "../services/authService";

const AuthRoutes = {
    // Route for logged-in users only
    ProtectedRoute: ({ children }) => {
        const currentUser = authService.getCurrentUser();

        if (!currentUser) {
            return <Navigate to="/login" replace />;
        }

        return children;
    },

    // Route for NOT logged-in users only
    PublicRoute: ({ children }) => {
        const currentUser = authService.getCurrentUser();

        if (currentUser) {
            return <Navigate to="/" replace />;
        }

        return children;
    },

    // Route for admin users only
    AdminRoute: ({ children }) => {
        const currentUser = authService.getCurrentUser();

        if (!currentUser) {
            return <Navigate to="/login" replace />;
        }

        if (currentUser.role !== "admin") {
            return <Navigate to="/" replace />;
        }

        return children;
    }
};

export default AuthRoutes;
