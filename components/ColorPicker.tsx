import React from 'react';
import { CardColor } from '../types';
import { motion } from 'framer-motion';

interface Props {
  onSelect: (color: CardColor) => void;
}

export const ColorPicker: React.FC<Props> = ({ onSelect }) => {
  const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];

  const getColorStyles = (color: CardColor) => {
    switch(color) {
        case CardColor.RED: return "border-[#ff3366] text-[#ff3366] shadow-[0_0_15px_rgba(255,51,102,0.4)] hover:bg-[#ff3366]/20";
        case CardColor.BLUE: return "border-[#33ccff] text-[#33ccff] shadow-[0_0_15px_rgba(51,204,255,0.4)] hover:bg-[#33ccff]/20";
        case CardColor.GREEN: return "border-[#39ff14] text-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.4)] hover:bg-[#39ff14]/20";
        case CardColor.YELLOW: return "border-[#ffe600] text-[#ffe600] shadow-[0_0_15px_rgba(255,230,0,0.4)] hover:bg-[#ffe600]/20";
        default: return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0, rotate: -10 }} 
        animate={{ scale: 1, rotate: 0 }} 
        className="bg-slate-900/80 p-8 rounded-[2rem] border border-white/10 grid grid-cols-2 gap-6 shadow-2xl max-w-sm w-full relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none" />

        <h2 className="col-span-2 text-center text-2xl font-black italic text-white mb-2 tracking-widest drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
            CHOOSE COLOR
        </h2>
        
        {colors.map(color => (
          <motion.button
            key={color}
            onClick={() => onSelect(color)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-28 h-28 rounded-2xl border-4 bg-slate-950 transition-all duration-300 relative group overflow-hidden ${getColorStyles(color)}`}
          >
              <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-1 bg-current rounded-full blur-[2px]" />
              </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};