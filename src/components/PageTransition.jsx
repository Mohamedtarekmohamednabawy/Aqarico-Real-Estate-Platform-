import { motion, useReducedMotion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1];

const PageTransition = ({ children }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: reduceMotion ? 0.12 : 0.28,
        ease: easeOut,
      }}
      style={{ width: "100%", overflowX: "hidden" }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
