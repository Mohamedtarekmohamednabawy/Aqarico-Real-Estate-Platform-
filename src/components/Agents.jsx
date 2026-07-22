import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { cachedGet } from "../services/requestCache";
import { useLanguage } from "../i18n/LanguageContext";
import AgentCard from "./AgentCard";

import { AgentGridSkeleton } from "./skeletons/AgentCardSkeleton";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Agents = () => {
    const { themeName } = useTheme();
    const { t } = useLanguage();
    const tokens = designTokens[themeName];
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const fetchAgents = async () => {
            try {
                const response = await cachedGet("/agents", {
                    ttl: 5 * 60 * 1000,
                    signal: controller.signal,
                });
                if (response.success) {
                    // Take only first 3 agents for homepage preview
                    setAgents(response.data.slice(0, 3));
                }
            } catch (error) {
                if (error?.code !== "ERR_CANCELED") {
                    console.error("Error fetching agents:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchAgents();
        return () => controller.abort();
    }, []);

    // Don't render section if no agents after loading
    if (!loading && agents.length === 0) return null;

    return (
        <section
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
            }}
            className="py-20 px-6 text-center transition-colors duration-500"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2
                    style={{
                        color: tokens.colors.text,
                        fontSize: tokens.typography.headings.h2,
                        fontWeight: tokens.typography.weight.bold,
                    }}
                    className="mb-10"
                >
                    {t("landing.agents.title")}
                </h2>

                {loading ? (
                    <div className="max-w-7xl mx-auto">
                        <AgentGridSkeleton count={3} compact={true} />
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {agents.map((agent, idx) => (
                            <motion.div key={agent._id || agent.name} variants={childVariants}>
                                <AgentCard
                                    agent={agent}
                                    tokens={tokens}
                                    index={idx}
                                    compact={true}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </section>
    );
};

export default Agents;