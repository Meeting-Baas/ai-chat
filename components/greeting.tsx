import { FishIcon } from 'lucide-react';
import { motion } from 'motion/react';

export const Greeting = () => {
  return (
    <div key="overview" className="max-w-3xl mx-auto text-center text-2xl mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{
          delay: 0.15,
          layout: {
            duration: 0,
          },
        }}
        layout="position"
        className="inline-flex gap-2 items-center text-2xl md:text-3xl lg:text-4xl font-medium"
      >
        <FishIcon
          className="inline-block h-full size-6 md:size-8 lg:size-9 hover:scale-125 transition-transform"
          fill="hsl(var(--accent))"
        />
        How can I help you today?
      </motion.div>
    </div>
  );
};
