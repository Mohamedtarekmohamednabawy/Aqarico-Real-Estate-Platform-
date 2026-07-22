import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";

const LoadingScreen = ({ isLoading, message = "Loading..." }) => {
    const { themeName } = useTheme();
    const tokens = designTokens?.[themeName] || designTokens?.default || {};

    const content = (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 99999, // Ensure it's above everything
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                            tokens.colors?.surfaceGlass ||
                            `${tokens.colors?.bg ?? "#000"}DD`,
                        backdropFilter: "blur(18px) saturate(140%)",
                        WebkitBackdropFilter: "blur(18px) saturate(140%)",
                    }}
                >
                    {/* Loader Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px]"
                        style={{
                            background: `linear-gradient(135deg, ${tokens.colors?.surface || "#222"
                                }, ${tokens.colors?.bg || "#000"})`,
                            border: `1px solid ${tokens.colors?.border || "#333"}`,
                            boxShadow: tokens.shadows?.lg || "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                    >
                        <div
                            className="premium-loader-ring"
                            style={{
                                "--loader-primary": tokens.colors?.primary || "#ff7a00",
                                "--loader-accent":
                                    tokens.colors?.gold || tokens.colors?.secondary || "#f5c542",
                                "--loader-muted": tokens.colors?.border || "#444",
                            }}
                        />
                    </motion.div>

                    {/* Message */}
                    <motion.h3
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.25 }}
                        style={{ color: tokens.colors?.text || "#fff" }}
                        className="text-sm font-black uppercase tracking-[0.18em] px-6 text-center"
                    >
                        {message}
                    </motion.h3>

                    {/* Dots */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 flex items-center gap-1.5"
                    >
                        {[0, 1, 2].map((dot) => (
                            <span
                                key={dot}
                                className="premium-loader-dot"
                                style={{
                                    "--dot-delay": `${dot * 120}ms`,
                                    backgroundColor: tokens.colors?.primary || "#ff7a00",
                                }}
                            />
                        ))}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
};

export default LoadingScreen;