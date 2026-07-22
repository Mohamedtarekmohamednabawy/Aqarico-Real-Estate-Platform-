import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import CurrencySelector from "./CurrencySelector";
import LanguageSelector from "./LanguageSelector";
import UserAvatar from "./UserAvatar";
import logoEN160 from "../assets/EN_Logo-160.png";
import logoEN320 from "../assets/EN_Logo-320.png";
import logoENWebp from "../assets/EN_Logo-320.webp";
import logoAR160 from "../assets/AR_Logo-160.png";
import logoAR320 from "../assets/AR_Logo-320.png";
import logoARWebp from "../assets/AR_Logo-320.webp";
import authService from "../services/authService";
import { AnimatedThemeToggler } from "../theme/animated-theme-toggler";
import { useLanguage } from "../i18n/LanguageContext";

const NavBar = () => {
    const { themeName, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const navigate = useNavigate();
    const tokens = designTokens[themeName];

    const loggedInUser = authService.getCurrentUser();
    const logo = language === 'ar'
        ? { src: logoAR160, srcSet: `${logoAR160} 160w, ${logoAR320} 320w`, webp: logoARWebp }
        : { src: logoEN160, srcSet: `${logoEN160} 160w, ${logoEN320} 320w`, webp: logoENWebp };

    const handleLogout = async () => {
        await authService.logout();
        // authService.logout already handles cleanup and redirecting to /login
    };

    // Prevent body scroll when mobile menu is open (UX Pro Pattern)
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    // Close mobile menu automatically once the full desktop nav is available.
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1280) setMenuOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Reusable styles
    const authButtonStyle = {
        backgroundColor: tokens.colors.primary,
        color: tokens.colors.surface,
    };

    const dropdownItemStyle = {
        backgroundColor: tokens.colors.surface,
        color: tokens.colors.text,
    };

    const dropdownHoverStyle = {
        backgroundColor: tokens.colors.primary,
        color: tokens.colors.surface,
    };

    const getNavUrl = (item) => {
        if (item === "Home") return "/";
        if (item === "About Us") return "/about";
        if (item === "Find Agent") return "/agents";
        if (item === "Market") return "/market-dashboard";
        return `/${item.toLowerCase().replace(" ", "-")}`;
    };

    const AuthButton = ({ to, text, className = "" }) => (
        <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ display: "inline-block" }}
        >
            <Link
                to={to}
                style={authButtonStyle}
                className={`px-4 py-2 rounded-full font-medium hover:opacity-90 transition duration-300 relative overflow-hidden group whitespace-nowrap cursor-pointer flex items-center ${className}`}
            >
                <span className="relative z-10">{text}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            </Link>
        </motion.div>
    );

    const DropdownItem = ({ to, onClick, children, isButton }) => {
        const handleMouseEnter = (e) => Object.assign(e.currentTarget.style, dropdownHoverStyle);
        const handleMouseLeave = (e) => Object.assign(e.currentTarget.style, dropdownItemStyle);

        const commonProps = {
            className: "w-full flex items-center text-left px-4 py-2 transition cursor-pointer",
            style: dropdownItemStyle,
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
        };

        return isButton ? (
            <button onClick={onClick} {...commonProps}>
                {children}
            </button>
        ) : (
            <Link to={to} {...commonProps}>
                {children}
            </Link>
        );
    };

    return (
        <nav
            style={{
                backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface + "cc",
                color: tokens.colors.text,
                backdropFilter: "blur(18px) saturate(140%)",
                WebkitBackdropFilter: "blur(18px) saturate(140%)",
                borderBottom: `1px solid ${tokens.colors.border}`,
            }}
            className="fixed top-0 left-0 w-full z-[10000] transition-all duration-300"
        >
            <div className="max-w-7xl mx-auto flex xl:grid xl:grid-cols-[auto_1fr_auto] justify-between items-center px-4 py-3 md:px-10 gap-4">
                {/* LEFT — Logo */}
                <Link to="/" className="flex items-center shrink-0">
                    <picture>
                        <source srcSet={logo.webp} type="image/webp" />
                        <img
                            src={logo.src}
                            srcSet={logo.srcSet}
                            sizes="160px"
                            alt={t("common.logoAlt")}
                            width={160}
                            height={40}
                            fetchPriority="high"
                            decoding="async"
                            className="h-10 w-auto hover:scale-110 transition-transform duration-300"
                        />
                    </picture>
                </Link>

                {/* CENTER — Navigation Links (Desktop only) */}
                <div
                    className={`hidden min-[1100px]:flex flex-1 justify-center items-center font-medium px-2`}
                    style={{ gap: "clamp(2px, 0.5vw, 12px)" }}
                >
                    {["Home", "Buy", "Rent", "Market", "Sell", "Find Agent", "About Us"]
                        .filter((item) => (item !== "Sell" && item !== "Find Agent") || loggedInUser)
                        .map((item) => (
                            <Link
                                key={item}
                                to={getNavUrl(item)}
                                style={{
                                    color: tokens.colors.text,
                                    fontSize: "clamp(0.8rem, 1.1vw, 1rem)",
                                    padding: "clamp(4px, 0.4vw, 6px) clamp(7px, 0.9vw, 12px)",
                                }}
                                className="premium-focus rounded-full hover:bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] hover:text-[var(--primary-color)] transition whitespace-nowrap cursor-pointer"
                            >
                                {t(`nav.${item.replace(" ", "").charAt(0).toLowerCase() + item.replace(" ", "").slice(1)}`)}
                            </Link>
                        ))}
                </div>

                {/* RIGHT — Theme + Currency + User (Responsive) */}
                <div className="flex justify-end items-center gap-2 xl:gap-3 shrink-0">
                    {/* Language and Currency Selectors - Hidden on small/medium screens */}
                    <div className="hidden min-[1100px]:flex items-center gap-2">
                        <LanguageSelector />
                        <CurrencySelector />
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center justify-center min-h-11 min-w-11">
                        <AnimatedThemeToggler
                            fromCenter={true}
                            checked={themeName === "dark"}
                            onCheckedChange={toggleTheme}
                            className="cursor-pointer hover:scale-110 transition-transform"
                        />
                    </div>

                    {/* User Menu / Auth Buttons */}
                    {!loggedInUser ? (
                        <AuthButton to="/register" text={t("nav.joinUs")} className="hidden xl:inline-block" />
                    ) : (
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="transition cursor-pointer"
                            >
                                <UserAvatar
                                    user={loggedInUser}
                                    size="md"
                                    showHoverEffect={true}
                                />
                            </button>
                            {userMenuOpen && (
                                <div
                                    className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-48 rounded-md shadow-lg py-2 z-50`}
                                    style={{ backgroundColor: tokens.colors.surface }}
                                >
                                    <DropdownItem to="/settings">{t("nav.settings")}</DropdownItem>
                                    <DropdownItem to="/manage-listings">{t("nav.manageListings")}</DropdownItem>
                                    <DropdownItem to="/favourites">{t("nav.myFavourites")}</DropdownItem>
                                    {loggedInUser.role === 'admin' && (
                                        <DropdownItem to="/admin">{t("nav.adminPanel")}</DropdownItem>
                                    )}
                                    <DropdownItem onClick={handleLogout} isButton>
                                        {t("nav.logOut")}
                                    </DropdownItem>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        className="premium-focus min-[1100px]:hidden flex h-11 w-11 items-center justify-center rounded-xl hover:opacity-90 hover:scale-105 transition duration-300 ease-out cursor-pointer"
                        aria-label={menuOpen ? t("common.close") : t("common.openMenu")}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* MOBILE/TABLET MENU */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{
                            backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface + "f0",
                            color: tokens.colors.text,
                            borderTopColor: tokens.colors.border,
                            backdropFilter: "blur(18px)",
                            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
                        }}
                        className="xl:hidden flex flex-col py-6 text-lg font-medium transition-all duration-300 border-t-2 overflow-y-auto overflow-x-hidden max-h-[calc(100dvh-75px)] sm:max-h-[calc(100vh-75px)] custom-scrollbar overscroll-contain"
                    >
                        {/* Mobile Selectors Section */}
                        <div
                            className="flex flex-col px-5 pb-4 border-b-2 mb-4 gap-3"
                            style={{ borderBottomColor: tokens.colors.border }}
                        >
                            <LanguageSelector isMobile={true} />
                            <CurrencySelector isMobile={true} />
                        </div>

                        {/* Navigation Links */}
                        <div className="flex flex-col w-full px-5 pb-8 gap-1.5 flex-1">
                            {["Home", "Buy", "Rent", "Market", "Sell", "Find Agent", "About Us"]
                                .filter((item) => (item !== "Sell" && item !== "Find Agent") || loggedInUser)
                                .map((item) => (
                                    <Link
                                        key={item}
                                        to={getNavUrl(item)}
                                        onClick={() => setMenuOpen(false)}
                                        style={{ color: tokens.colors.text, backgroundColor: "transparent" }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = tokens.colors.primary + "15";
                                            e.currentTarget.style.color = tokens.colors.primary;
                                            e.currentTarget.style.transform = "translateX(4px)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                            e.currentTarget.style.color = tokens.colors.text;
                                            e.currentTarget.style.transform = "translateX(0)";
                                        }}
                                        className="block w-full py-3.5 px-5 rounded-xl transition-all duration-300 text-[1.05rem] font-semibold active:scale-[0.98]"
                                    >
                                        {t(`nav.${item.replace(" ", "").charAt(0).toLowerCase() + item.replace(" ", "").slice(1)}`)}
                                    </Link>
                                ))}
                        </div>

                        {/* Auth Button only when not logged in */}
                        {!loggedInUser && (
                            <div
                                className="flex flex-col items-center gap-3 md:gap-3 pt-6 mt-6 border-t-2"
                                style={{ borderTopColor: tokens.colors.border }}
                            >
                                <AuthButton to="/register" text={t("nav.joinUs")} />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default NavBar;
