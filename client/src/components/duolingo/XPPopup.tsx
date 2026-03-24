import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface XPPopupProps {
  amount: number;
  show: boolean;
  onComplete?: () => void;
}

export function XPPopup({ amount, show, onComplete }: XPPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.5 }}
          animate={{ opacity: 1, y: -40, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-2xl shadow-2xl">
            <span className="text-3xl">⚡</span>
            <span>+{amount} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
