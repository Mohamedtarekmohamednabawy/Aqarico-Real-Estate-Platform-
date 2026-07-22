import { motion, useReducedMotion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1];

const MotionReveal = ({
    as = "div",
    children,
    className = "",
    delay = 0,
    distance = 18,
    once = true,
    amount = 0.16,
    ...props
}) => {
    const reduceMotion = useReducedMotion();
    const Component = motion[as] || motion.div;

    return (
        <Component
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: distance }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once, amount }}
            transition={{
                duration: reduceMotion ? 0.12 : 0.35,
                delay: reduceMotion ? 0 : delay,
                ease: [0.21, 1, 0.44, 1],
            }}
            className={className}
            {...props}
        >
            {children}
        </Component>
    );
};

export default MotionReveal;
