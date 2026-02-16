import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const EffectOverlay = ({ type }: { type: 'draw2' | 'draw4' | 'skip' | 'reverse' | 'wild' | null }) => {
  if (!type) return null;

  let text = '';
  let color = '';
  let subText = '';
  let isGradient = false;

  switch(type) {
    case 'draw2': 
      text = "+2"; 
      color = "text-yellow-400"; 
      subText = "ATTACK!";
      break;
    case 'draw4': 
      text = "+4"; 
      color = "text-red-600"; 
      subText = "DEVASTATING!";
      break;
    case 'skip': 
      text = "SKIP"; 
      color = "text-blue-400"; 
      subText = "DENIED";
      break;
    case 'reverse': 
      text = "REVERSE"; 
      color = "text-green-400"; 
      subText = "SWITCH";
      break;
    case 'wild':
      text = "WILD";
      color = "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-500";
      subText = "COLOR CHANGE";
      isGradient = true;
      break;
  }

  return (
    <AnimatePresence>
    <motion.div
        key={type}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
        className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center z-50"
    >
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black/50 text-white px-4 py-1 rounded-full text-xl font-black tracking-[0.5em] mb-2 border border-white/20"
        >
            {subText}
        </motion.div>
        
        {/* Main Text */}
        <div className="relative">
             {/* Gradient Backup/Glow for Wild */}
             {isGradient && (
                 <motion.h1 
                    animate={{ filter: ["blur(10px)", "blur(20px)", "blur(10px)"] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 text-[8rem] md:text-[13rem] leading-none font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-500 opacity-50 select-none"
                >
                    {text}
                </motion.h1>
             )}

            <h1 className={`text-[8rem] md:text-[13rem] leading-none font-black italic ${color} drop-shadow-[0_10px_0_rgba(0,0,0,0.5)] select-none`} style={{ WebkitTextStroke: isGradient ? '2px rgba(255,255,255,0.5)' : '3px white' }}>
                {text}
            </h1>
        </div>

        {/* Shockwave */}
        <motion.div 
            initial={{ scale: 0, border: "20px solid white", opacity: 0.5 }}
            animate={{ scale: 2, border: "0px solid white", opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute w-64 h-64 rounded-full"
        />
    </motion.div>
    </AnimatePresence>
  );
};

export interface FlyingCardProps {
    startX: string; // e.g., "50%"
    startY: string;
    endX: string;
    endY: string;
    delay: number;
    color: string;
}

export const FlyingCard: React.FC<FlyingCardProps> = ({ startX, startY, endX, endY, delay, color }) => {
    return (
        <motion.div
            initial={{ left: startX, top: startY, scale: 0.5, rotate: 0, opacity: 1 }}
            animate={{ left: endX, top: endY, scale: 1.5, rotate: 720, opacity: 0 }}
            transition={{ duration: 0.6, delay: delay, ease: "easeIn" }}
            className={`fixed w-8 h-12 rounded bg-white z-[60] border-2 border-white shadow-[0_0_15px_${color}]`}
            style={{ 
                backgroundImage: `linear-gradient(135deg, ${color} 0%, black 100%)`
            }}
        >
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-6 bg-white/20 rounded-sm transform rotate-45" />
            </div>
            {/* Trail effect */}
            <motion.div 
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3, delay: delay + 0.1 }}
                className="absolute inset-0 rounded blur-md"
                style={{ backgroundColor: color }}
            />
        </motion.div>
    );
};