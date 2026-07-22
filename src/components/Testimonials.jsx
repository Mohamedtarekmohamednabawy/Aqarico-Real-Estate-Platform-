import { motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { Star } from "lucide-react";
import MotionReveal from "./MotionReveal";

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const Testimonials = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];

    const reviews = [
        {
            name: "Sarah Jenkins",
            text: "Exceptional service! Found my dream home in weeks.",
            rating: 5,
        },
        {
            name: "Michael Chen",
            text: "Professional and dedicated team. Highly recommended.",
            rating: 5,
        },
        {
            name: "Emily Rodriguez",
            text: "Made the selling process smooth and stress-free.",
            rating: 4,
        },
    ];

    return (
        <section
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
            }}
            className="py-20 px-6 transition-colors duration-500 text-center"
        >
            <MotionReveal>
                <h2
                    style={{
                        fontSize: tokens.typography.headings.h2,
                        fontWeight: tokens.typography.weight.bold,
                    }}
                    className="mb-12"
                >
                    What Our Clients Say
                </h2>

                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                    {reviews.map((review, idx) => (
                        <MotionReveal key={idx} delay={idx * 0.08}>
                            <motion.div
                                variants={cardVariants}
                                whileHover={{
                                    y: -6,
                                    scale: 1.02,
                                    boxShadow: `0 20px 40px -12px ${tokens.colors.primary}25`,
                                    transition: { duration: 0.25, ease: "easeOut" },
                                }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    backgroundColor: tokens.colors.surface,
                                    boxShadow: tokens.shadows.md,
                                    borderRadius: tokens.borderRadius.lg,
                                    border: `1px solid ${tokens.colors.border}`,
                                    willChange: "transform",
                                }}
                                className="p-6 cursor-default"
                            >
                                <div className="flex justify-center mb-4">
                                    {Array.from({ length: review.rating }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={20}
                                            color={tokens.colors.accent}
                                            fill={tokens.colors.accent}
                                        />
                                    ))}
                                </div>
                                <p
                                    className="mb-4"
                                    style={{
                                        color: tokens.colors.textSub,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {review.text}
                                </p>
                                <p
                                    className="font-semibold"
                                    style={{ color: tokens.colors.primary }}
                                >
                                    {review.name}
                                </p>
                            </motion.div>
                        </MotionReveal>
                    ))}
                </div>
            </MotionReveal>
        </section>
    );
}

export default Testimonials;
