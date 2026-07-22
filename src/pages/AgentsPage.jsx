import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Award, Search, X } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import PhoneNumberField from "../components/PhoneNumberField";
import AgentCard from "../components/AgentCard";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { countries, validatePhoneNumber, displayFormattedPhone } from "../data/countries";
import { cachedGet } from "../services/requestCache";
import Swal from "sweetalert2";
import { useLanguage } from "../i18n/LanguageContext";
import LoadingScreen from "../components/LoadingScreen";
import { AgentGridSkeleton } from "../components/skeletons/AgentCardSkeleton";

import { Navigate } from "react-router-dom";
import authService from "../services/authService";

const AgentsPage = () => {
    const { themeName } = useTheme();
    const { language, t } = useLanguage();
    const tokens = designTokens[themeName];
    const loggedInUser = authService.getCurrentUser();

    // Restricted access for unregistered users
    if (!loggedInUser) {
        return <Navigate to="/login" replace />;
    }

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
        visible: {
            opacity: 1,
            y: 0,
        },
    };

    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedAgentId, setExpandedAgentId] = useState(null);
    const [agentProperties, setAgentProperties] = useState({});
    const [loadingProps, setLoadingProps] = useState(false);
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [verifyForm, setVerifyForm] = useState({ country: "EG", phone: "" });
    const [verifyPhoneError, setVerifyPhoneError] = useState("");

    useEffect(() => {
        setExpandedAgentId(null); // reset listings when agent changes (not needed but kept)
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchAgents(controller.signal);
        return () => controller.abort();
    }, []);

    const fetchAgents = async (signal) => {
        try {
            const response = await cachedGet("/agents", {
                ttl: 5 * 60 * 1000,
                signal,
            });
            if (response.success) {
                setAgents(response.data);
            }
        } catch (error) {
            if (error?.code !== "ERR_CANCELED") {
                console.error("Error fetching agents:", error);
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    const toggleListings = async (agent) => {
        if (expandedAgentId === agent._id) {
            setExpandedAgentId(null);
            return;
        }

        setExpandedAgentId(agent._id);

        if (agent.assignedListings?.length > 0 && !agentProperties[agent._id]) {
            setAgentProperties((prev) => ({
                ...prev,
                [agent._id]: agent.assignedListings,
            }));
            return;
        }

        if (agentProperties[agent._id]) return;

        setLoadingProps(true);
        try {
            const ownerId = agent.user?._id || agent.user;
            const response = await cachedGet("/properties", {
                params: { owner: ownerId },
                ttl: 2 * 60 * 1000,
            });
            if (response.success) {
                setAgentProperties((prev) => ({
                    ...prev,
                    [agent._id]: response.data,
                }));
            }
        } catch (error) {
            console.error("Error fetching agent properties:", error);
        } finally {
            setLoadingProps(false);
        }
    };

    const ThemedSwal = Swal.mixin({
        background: tokens.colors.surface,
        color: tokens.colors.text,
        confirmButtonColor: tokens.colors.primary,
        cancelButtonColor: tokens.colors.bg,
        reverseButtons: true,
        heightAuto: false,
        customClass: {
            popup: "rounded-3xl border shadow-2xl",
            title: "font-bold",
            confirmButton: "rounded-xl px-6 py-3 font-bold",
            cancelButton: "rounded-xl px-6 py-3 font-bold",
            input: "rounded-xl border shadow-inner",
        },
    });

    const searchVerifiedAgent = async (phoneNumber) => {
        // Show loading dialog and run the search inside didOpen so the
        // loader is guaranteed to be visible before any result dialog appears
        ThemedSwal.fire({
            title: t("agents.searching"),
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: async () => {
                Swal.showLoading();
                try {
                    const response = await cachedGet("/agents/verify-search/phone", {
                        params: { phone: phoneNumber },
                        ttl: 5 * 60 * 1000,
                    });

                    if (response.success && response.verified) {
                        const agent = response.data;
                        ThemedSwal.fire({
                            title: t("agents.foundTitle"),
                            html: `
                                <div style="text-align: center; padding: 10px 0;">
                                    <div style="width: 100px; height: 100px; border-radius: 24px; overflow: hidden; margin: 0 auto 20px; border: 4px solid ${tokens.colors.primary}20; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">
                                        <img src="${agent.avatar || "https://via.placeholder.com/100"}" style="width: 100%; height: 100%; object-fit: cover;" />
                                    </div>
                                    <h3 style="color: ${tokens.colors.primary}; margin-bottom: 5px; font-size: 24px;">${agent.name}</h3>
                                    <p style="font-size: 16px; color: ${tokens.colors.textSub};">${t("agents.partnerText")}</p>
                                    <div style="background: ${tokens.colors.primary}08; padding: 20px; border-radius: 20px; margin-top: 25px; border: 1px dashed ${tokens.colors.primary}30;">
                                        <div style="display: flex; flex-direction: column; gap: 10px;">
                                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                <span style="color: ${tokens.colors.primary}; font-weight: bold;">${t("agents.phoneLabel")}:</span>
                                                <span style="color: ${tokens.colors.text};" dir="ltr">${displayFormattedPhone(agent.phone || phoneNumber, agent.user?.country || "EG")}</span>
                                            </div>
                                            ${agent.email ? `
                                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                <span style="color: ${tokens.colors.primary}; font-weight: bold;">${t("agents.emailLabel")}:</span>
                                                <span style="color: ${tokens.colors.text};">${agent.email}</span>
                                            </div>` : ""}
                                        </div>
                                    </div>
                                </div>
                            `,
                            icon: "success",
                        });
                    } else {
                        ThemedSwal.fire({
                            title: t("agents.notFoundTitle"),
                            text: response.message || t("agents.notFoundRecord"),
                            icon: "error",
                        });
                    }
                } catch {
                    ThemedSwal.fire({
                        title: t("agents.error"),
                        text: t("agents.verificationError"),
                        icon: "error",
                    });
                }
            },
        });
    };

    const handleVerifyAgent = () => {
        setVerifyForm({ country: "EG", phone: "" });
        setVerifyPhoneError("");
        setVerifyModalOpen(true);
    };

    const handleSubmitVerifyAgent = async (e) => {
        e.preventDefault();

        const selectedCountry = countries.find((c) => c.code === verifyForm.country);
        const digitsOnly = verifyForm.phone.replace(/\D/g, "");

        if (!digitsOnly) {
            setVerifyPhoneError(t("agents.phoneRequired"));
            return;
        }

        const validation = validatePhoneNumber(verifyForm.phone, verifyForm.country);
        if (!validation.valid) {
            setVerifyPhoneError(validation.error);
            return;
        }

        const cleanDigits = digitsOnly.replace(/^0+/, "");
        const phoneNumber = `${selectedCountry.dial}${cleanDigits}`;

        setVerifyModalOpen(false);
        await searchVerifiedAgent(phoneNumber);
    };

    return (
        <div
            style={{ backgroundColor: tokens.colors.bg, minHeight: "100vh" }}
            className="premium-page-bg overflow-x-hidden flex flex-col"
        >
            {/* Remove global LoadingScreen for smoother transition */}
            <NavBar />

            {createPortal(
                <AnimatePresence>
                    {verifyModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                            onClick={() => setVerifyModalOpen(false)}
                        >
                            <motion.form
                                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleSubmitVerifyAgent}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-lg rounded-3xl border p-5 sm:p-6 shadow-2xl"
                                style={{
                                    backgroundColor: tokens.colors.surface,
                                    borderColor: tokens.colors.border,
                                    color: tokens.colors.text,
                                }}
                            >
                                <div className="flex items-start justify-between gap-4 mb-5">
                                    <div>
                                        <h2 className="text-2xl font-bold">{t("agents.verifyModalTitle")}</h2>
                                        <p className="text-sm mt-1" style={{ color: tokens.colors.textSub }}>
                                            {t("agents.verifyModalSubtitle")}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setVerifyModalOpen(false)}
                                        className="p-2 rounded-xl transition-all hover:opacity-75 cursor-pointer shrink-0"
                                        style={{ backgroundColor: tokens.colors.bg, color: tokens.colors.text }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <PhoneNumberField
                                    country={verifyForm.country}
                                    phone={verifyForm.phone}
                                    onCountryChange={(country) => {
                                        setVerifyForm({ country, phone: "" });
                                        setVerifyPhoneError("");
                                    }}
                                    onPhoneChange={(e) => {
                                        setVerifyForm((prev) => ({ ...prev, phone: e.target.value }));
                                        setVerifyPhoneError("");
                                    }}
                                    error={verifyPhoneError}
                                    tokens={tokens}
                                />

                                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setVerifyModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl font-bold transition-all cursor-pointer"
                                        style={{ backgroundColor: tokens.colors.bg, color: tokens.colors.text }}
                                    >
                                        {t("agents.modalCancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
                                        style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                                    >
                                        {t("agents.verifyModalNow")}
                                    </button>
                                </div>
                            </motion.form>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <main className="flex-grow pt-32 pb-20 px-4 max-w-7xl mx-auto w-full">
                <header className="text-center mb-14">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className="premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("agents.badge")}
                    </motion.div>

                    <motion.h1
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="animated-page-title text-4xl md:text-6xl font-black mb-6 flex justify-center flex-wrap gap-x-3 gap-y-1 leading-[1.05]"
                        style={{ color: tokens.colors.text }}
                    >
                        {t("agents.titlePart1").split(" ").map((word, i) => (
                            <motion.span key={`p1-${i}`} variants={letterVariants} transition={{ type: "spring", damping: 12, stiffness: 200 }} className="inline-block">{word}</motion.span>
                        ))}
                        {t("agents.titlePart2").split(" ").map((word, i) => (
                            <motion.span key={`p2-${i}`} variants={letterVariants} transition={{ type: "spring", damping: 12, stiffness: 200 }} className="inline-block" style={{ color: tokens.colors.primary }}>{word}</motion.span>
                        ))}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-base md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-light"
                        style={{ color: tokens.colors.textSub }}
                    >
                        {t("agents.subtitle")}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={handleVerifyAgent}
                            style={{
                                background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})`,
                                color: tokens.colors.surface,
                                boxShadow: tokens.shadows.glow || tokens.shadows.lg,
                            }}
                            className="premium-focus min-h-12 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.16em] hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
                        >
                            <Search size={20} strokeWidth={3} />
                            {t("agents.verifyButton")}
                        </button>
                    </motion.div>
                </header>

                {loading ? (
                    <AgentGridSkeleton count={8} />
                ) : agents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agents.map((agent, idx) => (
                            <AgentCard
                                key={agent._id || agent.name}
                                agent={agent}
                                tokens={tokens}
                                index={idx}
                                listings={agentProperties[agent._id] || []}
                                loadingListings={loadingProps && expandedAgentId === agent._id}
                                onToggleListings={toggleListings}
                                compact={false}
                            />
                        ))}
                    </div>
                ) : (
                    <div
                        className="text-center py-20 px-4 rounded-3xl"
                        style={{
                            backgroundColor: `${tokens.colors.surface}80`,
                            border: `1px solid ${tokens.colors.border}`,
                        }}
                    >
                        <div
                            className="inline-block p-6 rounded-full mb-6"
                            style={{ backgroundColor: `${tokens.colors.primary}10` }}
                        >
                            <Users size={48} style={{ color: tokens.colors.primary }} />
                        </div>
                        <h2 className="text-2xl font-bold mb-4" style={{ color: tokens.colors.text }}>
                            {t("agents.notFoundTitle")}
                        </h2>
                        <p className="max-w-md mx-auto mb-8" style={{ color: tokens.colors.textSub }}>
                            {t("agents.notFoundSubtitle")}
                        </p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default AgentsPage;
