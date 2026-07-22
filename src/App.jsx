import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "./theme/ThemeProvider";
import authService from "./services/authService";
import { loadFavorites } from "./utils/favoritesManager";
import { ComparisonProvider } from "./context/ComparisonContext";

// Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Buy = lazy(() => import("./pages/Buy"));
const Rent = lazy(() => import("./pages/Rent"));
const Sell = lazy(() => import("./pages/Sell"));
const AddListing = lazy(() => import("./pages/AddListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const ManageListings = lazy(() => import("./pages/ManageListings"));
const Favourites = lazy(() => import("./pages/Favourites"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const AgentsPage = lazy(() => import("./pages/AgentsPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Settings = lazy(() => import("./pages/Settings"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const PasswordSecurity = lazy(() => import("./pages/PasswordSecurity"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

const TermsPolicy = lazy(() => import("./pages/TermsPolicy"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const MarketDashboard = lazy(() => import("./pages/MarketDashboard"));
const LocationDashboard = lazy(() => import("./pages/LocationDashboard"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const TwoStepVerify = lazy(() => import("./pages/TwoStepVerify"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Auth
import AuthRoutes from "./components/AuthRoutes";
const { ProtectedRoute, PublicRoute, AdminRoute } = AuthRoutes;

// Components
import FloatingChatButton from "./components/FloatingChatButton";
import ComparisonBar from "./components/ComparisonBar";
import PageTransition from "./components/PageTransition";

// Maintenance & Error Pages
import { MAINTENANCE_MODE } from "./config";
import { checkAdminBypass } from "./utils/adminBypass";
import { GlobalBackendUnavailable } from "./components/BackendUnavailable";
const Maintenance = lazy(() => import("./pages/Maintenance"));

function AppRoutes() {
    const location = useLocation();

    // Automatically scroll to the top of the page on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // Maintenance Mode Check
    if (MAINTENANCE_MODE && !checkAdminBypass()) {
        if (location.pathname !== "/") {
            return <Navigate to="/" replace />;
        }

        return (
            <Suspense fallback={null}>
                <AnimatePresence mode="wait">
                    <PageTransition key="maintenance">
                        <Routes>
                            <Route path="*" element={<Maintenance />} />
                        </Routes>
                    </PageTransition>
                </AnimatePresence>
            </Suspense>
        );
    }

    const getPageKey = (path) => {
        if (path.startsWith("/buy")) return "/buy-list";
        if (path.startsWith("/rent")) return "/rent-list";
        return path;
    };

    // Layout for standard pages that includes the Chat Button and Comparison Bar
    const MainLayout = () => (
        <>
            <AppRoutesContent />
            <FloatingChatButton />
            <ComparisonBar />
        </>
    );

    const AppRoutesContent = () => (
        <AnimatePresence mode="wait">
            <PageTransition key={getPageKey(location.pathname)}>
                <Routes location={location}>
                    {/* Public pages */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/buy" element={<Buy />} />
                    <Route path="/buy/:page" element={<Buy />} />
                    <Route path="/rent" element={<Rent />} />
                    <Route path="/rent/:page" element={<Rent />} />
                    <Route path="/market-dashboard" element={<MarketDashboard />} />
                    <Route path="/market/location/:locationName" element={<LocationDashboard />} />
                    <Route path="/agents" element={<AgentsPage />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/property/:id" element={<PropertyDetails />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/compare/:ids" element={<ComparePage />} />

                    {/* Public Auth */}
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/verify-2fa" element={<PublicRoute><TwoStepVerify /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

                    {/* Protected routes */}
                    <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
                    <Route path="/add-listing" element={<ProtectedRoute><AddListing /></ProtectedRoute>} />
                    <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
                    <Route path="/manage-listings" element={<ProtectedRoute><ManageListings /></ProtectedRoute>} />
                    <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/settings/profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                    <Route path="/settings/security" element={<ProtectedRoute><PasswordSecurity /></ProtectedRoute>} />
                    <Route path="/settings/terms" element={<ProtectedRoute><TermsPolicy /></ProtectedRoute>} />
                    <Route path="/settings/delete-account" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />

                    {/* Admin only */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

                    {/* Catch unknown paths inside the layout and send them to the clean 404 page */}
                    <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
            </PageTransition>
        </AnimatePresence>
    );

    return (
        <Suspense fallback={null}>
            <Routes>
                {/* System Pages (No Chat Button) */}
                <Route path="/dev/maintenance" element={checkAdminBypass() ? <Maintenance /> : <Navigate to="/" />} />
                <Route path="/dev/backend-down" element={checkAdminBypass() ? <GlobalBackendUnavailable /> : <Navigate to="/" />} />
                <Route path="/maintenance" element={<Maintenance />} />

                {/* Catch-all 404 (No Chat Button) */}
                <Route path="/404" element={<NotFound />} />

                {/* Normal App Pages (With Chat Button) */}
                <Route path="*" element={
                    // Double check if we are on a fake path before rendering MainLayout
                    // This is to prevent the button from flickering on unknown routes
                    // If the path doesn't match our main routes above, it will fall through to 404
                    <MainLayout />
                } />
            </Routes>
        </Suspense>
    );
}

// Backend Status
import { BackendStatusProvider, useBackendStatus } from "./context/BackendStatusContext";
import ErrorBoundary from "./components/ErrorBoundary";

function BackendStatusHandler({ children }) {
    const { isBackendDown, isCritical } = useBackendStatus();
    const isBypass = checkAdminBypass();

    // Only show global overlay if it's a critical failure AND no admin bypass is active
    if (isBackendDown && isCritical && !isBypass) {
        return <GlobalBackendUnavailable />;
    }

    return children;
}

function App() {
    const [isAppLoading, setIsAppLoading] = useState(true);

    useEffect(() => {
        loadFavorites();

        // Sync session silently before showing the UI
        const initializeApp = async () => {
            if (authService.isLoggedIn()) {
                try {
                    await authService.getMe();
                } catch (err) {
                    console.error("Initial session sync failed:", err);
                    // If initial bootstrap fails due to server, trigger critical down
                    if (!err.response || err.response.status >= 500) {
                        window.dispatchEvent(new CustomEvent('aqarico:backend_down', {
                            detail: { isCritical: true }
                        }));
                    }
                }
            }
            setIsAppLoading(false);
        };

        initializeApp();

        const handleUserChanged = () => {
            loadFavorites();
        };
        window.addEventListener("userChanged", handleUserChanged);

        return () => {
            window.removeEventListener("userChanged", handleUserChanged);
        };
    }, []);

    if (isAppLoading) return null;

    return (
        <BackendStatusProvider>
            <ErrorBoundary>
                <BackendStatusHandler>
                    <ComparisonProvider>
                        <AppRoutes />
                    </ComparisonProvider>
                </BackendStatusHandler>
            </ErrorBoundary>
        </BackendStatusProvider>
    );
}

export default App;