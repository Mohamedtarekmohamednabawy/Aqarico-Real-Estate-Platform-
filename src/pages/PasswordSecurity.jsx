import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Shield, Lock, ArrowLeft, ArrowRight, Smartphone, Monitor, Trash2, Loader2, Globe } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { getPasswordStrength } from "../utils/utils";
import { PasswordInput } from "../components/FormComponents";
import authService from "../services/authService";
import userService from "../services/userService";
import { useLanguage } from "../i18n/LanguageContext";
import { getDeviceId } from "../utils/deviceInfo";

const PasswordSecurity = () => {
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

    const title = t("settings.security");

    const [user, setUser] = useState(null);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [devices, setDevices] = useState([]);
    const [isDevicesLoading, setIsDevicesLoading] = useState(true);
    const [revokingId, setRevokingId] = useState(null);
    const currentDeviceId = getDeviceId();

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            navigate("/login");
            return;
        }
        setUser(currentUser);
        fetchDevices();
    }, [navigate]);

    const fetchDevices = async () => {
        try {
            const result = await authService.getDevices();
            if (result.success) {
                setDevices(result.devices);
            }
        } catch (error) {
            console.error("Failed to fetch devices:", error);
        } finally {
            setIsDevicesLoading(false);
        }
    };

    const handleRevoke = async (deviceId) => {
        const confirmRevoke = await Swal.fire({
            title: t("security.revokeConfirmTitle"),
            text: t("security.revokeConfirmText"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: t("security.revokeConfirmBtn"),
            cancelButtonText: t("common.cancel"),
            background: tokens.colors.surface,
            color: tokens.colors.text,
        });

        if (!confirmRevoke.isConfirmed) return;

        setRevokingId(deviceId);
        try {
            const result = await authService.revokeDevice(deviceId);
            if (result.success) {
                if (deviceId === currentDeviceId) {
                    authService.logout();
                    navigate("/login");
                    return;
                }
                setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
                Swal.fire({
                    icon: "success",
                    title: t("security.revokeSuccessTitle"),
                    text: t("security.revokeSuccessText"),
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: t("admin.alerts.error"),
                text: error.response?.data?.message || t("security.revokeError"),
            });
        } finally {
            setRevokingId(null);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const errors = {};

        if (!passwordForm.oldPassword) errors.oldPassword = t("security.errorOldRequired");
        if (!passwordForm.newPassword) {
            errors.newPassword = t("security.errorNewRequired");
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordForm.newPassword)) {
            errors.newPassword = t("security.errorNewWeak");
        } else if (passwordForm.oldPassword && passwordForm.newPassword === passwordForm.oldPassword) {
            errors.newPassword = t("security.errorSamePassword");
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            errors.confirmPassword = t("security.errorNoMatch");
        }

        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors);
            return;
        }

        try {
            await userService.updatePassword({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword,
            });

            setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordErrors({});

            Swal.fire({
                title: t("security.successTitle"),
                text: t("security.successText"),
                icon: "success",
                background: tokens.colors.surface,
                color: tokens.colors.text,
                confirmButtonColor: tokens.colors.primary,
            });
        } catch (error) {
            const message = error.response?.data?.message || t("security.errorFailed");
            setPasswordErrors({ oldPassword: message });
        }
    };

    const strength = getPasswordStrength(passwordForm.newPassword);

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
                            style={{ backgroundColor: "#10b98120", color: "#10b981" }}
                            className="p-4 rounded-xl"
                        >
                            <Shield size={32} />
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
                                transition={{ duration: 0.5 }}
                                style={{ color: tokens.colors.textSub }}
                                className="text-sm mt-1"
                            >
                                {t("security.subtitle")}
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
                        border: `1px solid ${tokens.colors.border}`,
                    }}
                    className="p-6 md:p-8 shadow-lg mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold" style={{ color: tokens.colors.text }}>
                            {t("security.changePassword")}
                        </h2>
                    </div>
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                        <PasswordInput
                            label={t("security.oldPassword")}
                            value={passwordForm.oldPassword}
                            onChange={(e) =>
                                setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                            }
                            error={passwordErrors.oldPassword}
                            show={showOldPassword}
                            setShow={setShowOldPassword}
                            tokens={tokens}
                        />

                        <div
                            className="pt-6"
                            style={{ borderTop: `1px solid ${tokens.colors.border}` }}
                        >
                            <PasswordInput
                                label={t("security.newPassword")}
                                value={passwordForm.newPassword}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                                }
                                error={passwordErrors.newPassword}
                                show={showNewPassword}
                                setShow={setShowNewPassword}
                                tokens={tokens}
                            />

                            {passwordForm.newPassword && (
                                <div className="mt-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span style={{ color: tokens.colors.textSub }}>
                                            {t("auth.passwordStrength")}:
                                        </span>
                                        <span style={{ color: strength.color }} className="font-semibold">
                                            {strength.label}
                                        </span>
                                    </div>
                                    <div
                                        className="mt-2 h-2 rounded-full overflow-hidden"
                                        style={{ backgroundColor: tokens.colors.bg }}
                                    >
                                        <div
                                            className="h-full transition-all duration-300"
                                            style={{
                                                width: `${strength.width}%`,
                                                backgroundColor: strength.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <PasswordInput
                            label={t("security.confirmPassword")}
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                            }
                            error={passwordErrors.confirmPassword}
                            show={showConfirmPassword}
                            setShow={setShowConfirmPassword}
                            tokens={tokens}
                        />

                        <button
                            type="submit"
                            style={{
                                backgroundColor: tokens.colors.primary,
                                color: tokens.colors.surface,
                            }}
                            className="w-full md:w-auto px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Lock size={20} />
                            {t("security.updatePassword")}
                        </button>
                    </form>
                </motion.div>

                {/* Trusted Devices Management */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{
                        backgroundColor: tokens.colors.surface,
                        borderRadius: tokens.borderRadius.lg,
                        border: `1px solid ${tokens.colors.border}`,
                    }}
                    className="p-6 md:p-8 shadow-lg"
                >
                    <div className="mb-6">
                        <h2 className="text-xl font-bold" style={{ color: tokens.colors.text }}>
                            {t("security.trustedDevices")}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: tokens.colors.textSub }}>
                            {t("security.trustedDevicesSubtitle")}
                        </p>
                    </div>

                    {isDevicesLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin" size={32} style={{ color: tokens.colors.primary }} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {devices.length === 0 ? (
                                <p className="text-center py-6 text-sm" style={{ color: tokens.colors.textSub }}>
                                    {t("security.noDevicesFound")}
                                </p>
                            ) : (
                                devices.map((device) => {
                                    const isCurrent = device.deviceId === currentDeviceId;
                                    const DeviceIcon = device.os === "Android" || device.os === "iOS" ? Smartphone : Monitor;

                                    return (
                                        <div
                                            key={device.deviceId}
                                            className="flex items-center justify-between p-4 rounded-xl border-2 transition-all"
                                            style={{
                                                backgroundColor: tokens.colors.bg,
                                                borderColor: isCurrent ? tokens.colors.primary : tokens.colors.border
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="p-3 rounded-lg"
                                                    style={{
                                                        backgroundColor: isCurrent ? `${tokens.colors.primary}20` : tokens.colors.surface,
                                                        color: isCurrent ? tokens.colors.primary : tokens.colors.textSub
                                                    }}
                                                >
                                                    <DeviceIcon size={24} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold" style={{ color: tokens.colors.text }}>
                                                            {device.name}
                                                        </h3>
                                                        {isCurrent && (
                                                            <span
                                                                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                                                                style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                                                            >
                                                                {t("security.thisDevice")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs mt-1" style={{ color: tokens.colors.textSub }}>
                                                        {device.os} • {device.browser} • {t("security.lastActive")}: {new Date(device.lastUsed).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleRevoke(device.deviceId)}
                                                disabled={revokingId === device.deviceId}
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition disabled:opacity-50 cursor-pointer"
                                                title={t("security.revokeTrust")}
                                            >
                                                {revokingId === device.deviceId ? (
                                                    <Loader2 className="animate-spin" size={20} />
                                                ) : (
                                                    <Trash2 size={20} />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.main>

            <Footer />
        </div>
    );
};

export default PasswordSecurity;