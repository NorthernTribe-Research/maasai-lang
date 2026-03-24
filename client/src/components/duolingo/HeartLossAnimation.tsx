import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeartLossAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

export function HeartLossAnimation({ show, onComplete }: HeartLossAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <motion.div
            animate={{
              scale: [1, 1.3, 0.9, 1],
              rotate: [0, -10, 10, 0],
            }}
            transition={{ duration: 0.5, times: [0, 0.3, 0.6, 1] }}
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-2xl shadow-2xl"
          >
            <span className="text-4xl">💔</span>
            <span>-1 Heart</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
