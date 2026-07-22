import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import UserAvatar from "../components/UserAvatar";
import PhoneNumberField from "../components/PhoneNumberField";
import { validatePhoneNumber } from "../data/countries";
import authService from "../services/authService";
import userService from "../services/userService";
import { useLanguage } from "../i18n/LanguageContext";
import TwoStepVerifyModal from "../components/TwoStepVerifyModal";

const EditProfile = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

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

    const title = t("profile.editProfile");

    const [user, setUser] = useState(null);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        username: "",
        phone: "",
        country: "EG",
        role: "",
        currentPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [verificationData, setVerificationData] = useState({ userId: null, step: "phone" });

    const themedSwal = Swal.mixin({
        background: tokens.colors.surface,
        color: tokens.colors.text,
        confirmButtonColor: tokens.colors.primary,
        cancelButtonColor: tokens.colors.bg,
        customClass: {
            popup: "rounded-3xl border shadow-2xl",
            title: "font-bold",
            confirmButton: "rounded-xl px-6 py-3 font-bold",
            cancelButton: "rounded-xl px-6 py-3 font-bold",
        },
    });

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            navigate("/login");
            return;
        }
        setUser(currentUser);
        setForm({
            firstName: currentUser.firstName || "",
            lastName: currentUser.lastName || "",
            username: currentUser.username || "",
            phone: currentUser.phone || "",
            country: currentUser.country || "EG",
            role: currentUser.role || "",
            currentPassword: "",
        });
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setGeneralError("");

        if (debounceRef.current[name]) clearTimeout(debounceRef.current[name]);
        debounceRef.current[name] = setTimeout(() => {
            validateField(name, value);
        }, 500);
    };

    const debounceRef = useRef({});

    const validateField = (name, value, countryValue = form.country) => {
        let error = "";

        if (name === "firstName" && !/^[A-Za-z]{2,}$/.test(value)) {
            error = t("profile.errors.firstName");
        } else if (name === "lastName" && !/^[A-Za-z]{2,}$/.test(value)) {
            error = t("profile.errors.lastName");
        } else if (name === "username" && !/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
            error = t("profile.errors.username");
        } else if (name === "phone" && value) {
            const validation = validatePhoneNumber(value, countryValue);
            if (!validation.valid) {
                error = validation.error;
            }
        }

        setErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    const validateForm = () => {
        const newErrors = {};
        newErrors.firstName = validateField("firstName", form.firstName);
        newErrors.lastName = validateField("lastName", form.lastName);
        newErrors.username = validateField("username", form.username);
        if (form.phone) {
            newErrors.phone = validateField("phone", form.phone);
        }

        if (!form.currentPassword) {
            newErrors.currentPassword = t("profile.errors.currentPassword");
        }

        setErrors((prev) => ({ ...prev, ...newErrors }));
        return !Object.values(newErrors).some(err => err);
    };

    const hasProfileChanges = () => {
        if (!user) return false;
        return (
            form.firstName !== (user.firstName || "") ||
            form.lastName !== (user.lastName || "") ||
            form.username !== (user.username || "") ||
            form.phone !== (user.phone || "") ||
            form.country !== (user.country || "EG") ||
            form.role !== (user.role || "")
        );
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await userService.updateAvatar(file);
            if (result.success) {
                authService.updateStoredUser(result.user);
                setUser(result.user);
                window.dispatchEvent(new Event("userChanged"));
                themedSwal.fire({
                    icon: "success",
                    title: t("profile.avatarSuccess"),
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            themedSwal.fire({
                icon: "error",
                title: t("profile.avatarError"),
                text: error.response?.data?.message || t("profile.uploadFailed"),
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasProfileChanges()) {
            setErrors((prev) => ({ ...prev, currentPassword: "" }));
            setGeneralError("");
            themedSwal.fire({
                icon: "info",
                title: t("profile.noChanges"),
                text: t("profile.noChangesText"),
                confirmButtonText: t("common.close"),
            });
            return;
        }

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const result = await userService.updateProfile({
                firstName: form.firstName,
                lastName: form.lastName,
                username: form.username,
                phone: form.phone,
                country: form.country,
                role: form.role,
                currentPassword: form.currentPassword,
            });

            if (result.success) {
                authService.updateStoredUser(result.user);
                setUser(result.user);
                window.dispatchEvent(new Event("userChanged"));

                themedSwal.fire({
                    icon: "success",
                    title: t("profile.success"),
                    text: t("profile.successText"),
                    timer: 2000,
                    showConfirmButton: false,
                });

                setForm((prev) => ({ ...prev, currentPassword: "" }));
            } else if (result.requiresVerification) {
                setVerificationData({ userId: result.userId, step: result.step });
                setShow2FAModal(true);
            }
        } catch (error) {
            const raw = error.response?.data?.message || "";
            const lower = raw.toLowerCase();

            let message;
            if (lower.includes("incorrect") || lower.includes("wrong") || (lower.includes("invalid") && lower.includes("password"))) {
                message = t("profile.errors.incorrectPassword");
            } else if (lower.includes("username")) {
                message = (lower.includes("taken") || lower.includes("already"))
                    ? t("auth.errors.usernameTaken")
                    : t("auth.errors.checkUsername");
            } else if (lower.includes("phone")) {
                message = t("auth.errors.checkPhone");
            } else if (lower.includes("email")) {
                message = t("auth.errors.checkEmail");
            } else {
                message = raw || t("profile.errors.general");
            }

            setGeneralError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handle2FASuccess = (result) => {
        setShow2FAModal(false);
        authService.updateStoredUser(result.user);
        setUser(result.user);
        window.dispatchEvent(new Event("userChanged"));

        themedSwal.fire({
            icon: "success",
            title: t("profile.success"),
            text: t("profile.successText"),
            timer: 2000,
            showConfirmButton: false,
        });

        setForm((prev) => ({ ...prev, currentPassword: "" }));
    };

    if (!user) return null;

    const inputStyle = {
        backgroundColor: tokens.colors.bg,
        color: tokens.colors.text,
        borderColor: tokens.colors.border,
    };

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
                    className={`flex items-center gap-2 mb-6 hover:opacity-70 transition cursor-pointer ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                >
                    <ArrowLeft size={20} className={language === 'ar' ? 'rotate-180' : ''} />
                    {t("profile.backToSettings")}
                </button>

                <div className={`mb-8 ${language === 'ar' ? 'flex flex-col items-start' : ''}`}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("profile.badge")}
                    </motion.div>
                    <motion.h1
                        style={{ color: tokens.colors.text }}
                        className={`text-4xl font-bold flex flex-wrap gap-x-2 ${language === 'ar' ? 'justify-start w-full' : ''}`}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {t("profile.titlePart1").split(" ").map((word, i) => (
                            <motion.span
                                key={`p1-${i}`}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                            >
                                {word}
                            </motion.span>
                        ))}
                        {t("profile.titlePart2").split(" ").map((word, i) => (
                            <motion.span
                                key={`p2-${i}`}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                                style={{ color: tokens.colors.primary }}
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
                        {t("profile.updateInfo")}
                    </motion.p>
                </div>

                <div className="flex items-center gap-6 mb-8">
                    <div
                        className="relative group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UserAvatar
                            user={user}
                            size="xxl"
                            showHoverEffect={false}
                            overlay={(
                                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                    <div className="transform scale-90 group-hover:scale-100 transition-all duration-300 flex flex-col items-center gap-2">
                                        <Camera className="text-white drop-shadow-md" size={32} />
                                        <span className="text-white text-[11px] font-bold uppercase tracking-wider text-center whitespace-pre-line">{t("profile.changePhotoHover")}</span>
                                    </div>
                                </div>
                            )}
                        />
                        <div
                            className="absolute -bottom-1 -right-1 p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800 z-10 transition-all duration-300 group-hover:scale-110"
                            style={{ backgroundColor: tokens.colors.primary, color: 'white' }}
                        >
                            <Camera size={14} />
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </div>
                    <div>
                        <h2 style={{ color: tokens.colors.text }} className="text-xl font-bold">
                            {user.firstName} {user.lastName}
                        </h2>
                        <p style={{ color: tokens.colors.textSub }} className="text-sm">
                            @{user.username || user.email.split('@')[0]}
                        </p>
                    </div>
                </div>

                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    onSubmit={handleSubmit}
                    style={{
                        backgroundColor: tokens.colors.surface,
                        borderRadius: tokens.borderRadius.lg,
                        border: `1px solid ${tokens.colors.border}`,
                    }}
                    className="p-6 md:p-8 shadow-lg space-y-6"
                >
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: tokens.colors.text, textAlign: language === 'ar' ? 'right' : 'left' }}>
                                {t("profile.firstName")}
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                style={{ ...inputStyle, textAlign: language === 'ar' ? 'right' : 'left', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: tokens.colors.text, textAlign: language === 'ar' ? 'right' : 'left' }}>
                                {t("profile.lastName")}
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                style={{ ...inputStyle, textAlign: language === 'ar' ? 'right' : 'left', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                                className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{errors.lastName}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: tokens.colors.text, textAlign: language === 'ar' ? 'right' : 'left' }}>
                            {t("profile.username")}
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            style={{ ...inputStyle, textAlign: language === 'ar' ? 'right' : 'left', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                            className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        {errors.username && <p className="text-red-500 text-xs mt-1" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{errors.username}</p>}
                    </div>

                    <div>
                        <PhoneNumberField
                            phone={form.phone}
                            country={form.country}
                            onPhoneChange={handleChange}
                            onCountryChange={(country) => {
                                setForm((prev) => ({ ...prev, country }));
                                if (form.phone) {
                                    setTimeout(() => validateField("phone", form.phone, country), 0);
                                }
                            }}
                            tokens={tokens}
                            error={errors.phone}
                        />
                    </div>

                    <div
                        style={{ borderTop: `1px solid ${tokens.colors.border}` }}
                        className="pt-6"
                    >
                        <label className="block text-sm font-medium mb-2" style={{ color: tokens.colors.text, textAlign: language === 'ar' ? 'right' : 'left' }}>
                            {t("profile.currentPassword")} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={form.currentPassword}
                            onChange={handleChange}
                            style={{ ...inputStyle, textAlign: language === 'ar' ? 'right' : 'left', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                            className="w-full px-4 py-3 rounded-lg border focus:outline-none"
                            autoComplete="new-password"
                            autoCorrect="off"
                            spellCheck="false"
                            placeholder={t("profile.passwordReq")}
                        />
                        {errors.currentPassword && (
                            <p className="text-red-500 text-xs mt-1" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{errors.currentPassword}</p>
                        )}
                        <AnimatePresence mode="wait">
                            {generalError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: "auto", y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                    className="p-3 rounded-lg bg-red-100 text-red-700 text-sm mt-3 text-center overflow-hidden"
                                >
                                    {generalError}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            backgroundColor: tokens.colors.primary,
                            color: tokens.colors.surface,
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                        className="w-full py-3 rounded-xl font-semibold text-lg hover:opacity-90 transition cursor-pointer"
                    >
                        {isSubmitting ? t("profile.saving") : t("profile.saveChanges")}
                    </button>
                </motion.form>
            </motion.main>

            <Footer />

            <TwoStepVerifyModal
                isOpen={show2FAModal}
                onClose={() => setShow2FAModal(false)}
                userId={verificationData.userId}
                step={verificationData.step}
                onSuccess={handle2FASuccess}
            />
        </div>
    );
};

export default EditProfile;
