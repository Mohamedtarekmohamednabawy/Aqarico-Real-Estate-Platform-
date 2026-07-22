import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Trash2, ArrowLeft, ArrowRight, AlertTriangle, X } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import authService from "../services/authService";
import userService from "../services/userService";
import { useLanguage } from "../i18n/LanguageContext";

const DeleteAccount = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const isRTL = language === "ar";
    const BackIcon = isRTL ? ArrowRight : ArrowLeft;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03,
                delayChildren: 0.1,
            },
        },
    };

    const letterVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 },
    };

    const title = t("settings.deleteAccount");

    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            navigate("/login");
            return;
        }
        setUser(currentUser);
    }, [navigate]);

    const handleDeleteAccount = async () => {
        if (!user || !user.email) return;

        // Step 1: Ask for password
        const { value: password } = await Swal.fire({
            title: t("deleteAccount.confirmPasswordTitle"),
            input: "password",
            inputLabel: t("deleteAccount.confirmPasswordLabel"),
            inputPlaceholder: t("deleteAccount.confirmPasswordPlaceholder"),
            inputAttributes: { autocapitalize: "off", autocorrect: "off" },
            showCancelButton: true,
            confirmButtonText: t("deleteAccount.confirm"),
            cancelButtonText: t("common.cancel"),
            inputValidator: (value) => {
                if (!value) return t("deleteAccount.passwordRequired");
            },
            background: tokens.colors.surface,
            color: tokens.colors.text,
            confirmButtonColor: tokens.colors.primary,
            cancelButtonColor: "#dc2626",
        });

        if (!password) return;

        // Step 2: Confirm deletion
        Swal.fire({
            title: t("deleteAccount.confirmTitle"),
            html: `
                <div style="text-align: ${isRTL ? "right" : "left"}" class="space-y-3">
                    <p class="font-bold text-red-600">${t("deleteAccount.irreversibleWarning")}</p>
                    <p>${t("deleteAccount.willErase")}</p>
                    <ul class="${isRTL ? "pr-5" : "pl-5"} list-disc space-y-1 opacity-80">
                        <li>${t("deleteAccount.eraseProfile")}</li>
                        <li>${t("deleteAccount.eraseListings")}</li>
                        <li>${t("deleteAccount.eraseFavorites")}</li>
                        <li>${t("deleteAccount.eraseHistory")}</li>
                    </ul>
                </div>
            `,
            icon: "warning",
            background: tokens.colors.surface,
            color: tokens.colors.text,
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t("deleteAccount.deleteForever"),
            cancelButtonText: t("common.cancel"),
            reverseButtons: true,
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await userService.deleteAccount(password);
                    authService.logout();

                    await Swal.fire({
                        title: t("deleteAccount.deletedTitle"),
                        text: t("deleteAccount.deletedText"),
                        icon: "success",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary,
                        timer: 2000,
                        showConfirmButton: false,
                    });

                    window.dispatchEvent(new Event("userChanged"));
                    navigate("/");
                } catch (error) {
                    const message =
                        error.response?.data?.message || t("deleteAccount.errorText");
                    Swal.fire({
                        title: t("deleteAccount.errorTitle"),
                        text: message,
                        icon: "error",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary,
                    });
                }
            }
        });
    };

    if (!user) return null;

    return (
        <div style={{ backgroundColor: tokens.colors.bg, minHeight: "100vh" }}>
            <NavBar />

            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-24 px-4 md:px-6 lg:px-8 max-w-3xl mx-auto pb-12"
            >
                <button
                    onClick={() => navigate("/settings")}
                    style={{ color: tokens.colors.text }}
                    className="flex items-center gap-2 mb-6 hover:opacity-70 transition cursor-pointer"
                >
                    <BackIcon size={20} />
                    {t("common.back")}
                </button>

                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626" }}
                            className="p-4 rounded-xl"
                        >
                            <Trash2 size={32} />
                        </div>
                        <div>
                            <motion.h1
                                style={{ color: tokens.colors.text }}
                                className="text-4xl font-bold flex flex-wrap gap-x-2"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {title.split(" ").map((word, i) => (
                                    <motion.span
                                        key={i}
                                        variants={letterVariants}
                                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                        className="inline-block"
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                style={{ color: tokens.colors.textSub }}
                                className="text-sm mt-1"
                            >
                                {t("deleteAccount.subtitle")}
                            </motion.p>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{
                        backgroundColor: tokens.colors.surface,
                        borderRadius: tokens.borderRadius.lg,
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                    }}
                    className="p-6 md:p-8 shadow-lg overflow-hidden relative"
                >
                    <div className="flex items-start gap-4 mb-6 z-10 relative">
                        <AlertTriangle size={28} className="text-red-600 flex-shrink-0 mt-1" />
                        <div>
                            <h2 className="text-red-600 font-bold text-2xl mb-2">
                                {t("deleteAccount.dangerZone")}
                            </h2>
                            <p style={{ color: tokens.colors.textSub }} className="text-base leading-relaxed">
                                {t("deleteAccount.dangerDesc1")}
                                <strong className="text-red-600 text-lg">
                                    {" "}{t("deleteAccount.dangerDesc2")}
                                </strong>
                                .
                            </p>
                        </div>
                    </div>

                    <div
                        className="p-5 rounded-lg mb-8 border border-red-200/50 flex items-start gap-4"
                        style={{ backgroundColor: "rgba(254, 226, 226, 0.3)" }}
                    >
                        <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                            <AlertTriangle size={20} className="text-red-700" />
                        </div>

                        <div className="flex-1">
                            <p className="text-red-800 dark:text-red-400 text-base font-bold mb-3">
                                {t("deleteAccount.willBeDeleted")}
                            </p>
                            <div className="text-red-800 dark:text-red-300 text-sm space-y-2.5 font-medium">
                                {[
                                    t("deleteAccount.eraseProfile"),
                                    t("deleteAccount.eraseListings"),
                                    t("deleteAccount.eraseFavorites"),
                                    t("deleteAccount.eraseHistory"),
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <X size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="z-10 relative">
                        <p style={{ color: tokens.colors.textSub }} className="text-sm mb-6 font-medium">
                            {t("deleteAccount.proceedWarning")}
                        </p>

                        <button
                            onClick={handleDeleteAccount}
                            className="w-full md:w-auto px-8 py-4 rounded-lg bg-red-600 text-white font-bold text-lg hover:bg-red-700 active:bg-red-800 transition-colors duration-200 flex items-center justify-center gap-3 cursor-pointer shadow-md hover:shadow-lg"
                        >
                            <Trash2 size={22} />
                            {t("deleteAccount.deleteBtn")}
                        </button>
                    </div>
                </motion.div>
            </motion.main>

            <Footer />
        </div>
    );
};

export default DeleteAccount;