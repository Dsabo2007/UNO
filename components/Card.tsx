import React from 'react';
import { motion } from 'framer-motion';
import { Ban, RefreshCw, Zap } from 'lucide-react';
import { Card as CardType, CardColor, CardType as ECardType } from '../types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isPlayable?: boolean;
  isHidden?: boolean;
  isSmall?: boolean;
  hoverEffect?: boolean;
}

// Neon Theme Configuration
const NEON_THEMES = {
  [CardColor.RED]: {
    border: 'border-[#ff3366]',
    text: 'text-[#ff3366]',
    shadow: 'shadow-[#ff3366]/40',
    bgGradient: 'bg-gradient-to-br from-red-950 via-slate-950 to-black',
    glow: 'drop-shadow-[0_0_8px_rgba(255,51,102,0.8)]',
    iconColor: '#ff3366'
  },
  [CardColor.BLUE]: {
    border: 'border-[#33ccff]',
    text: 'text-[#33ccff]',
    shadow: 'shadow-[#33ccff]/40',
    bgGradient: 'bg-gradient-to-br from-blue-950 via-slate-950 to-black',
    glow: 'drop-shadow-[0_0_8px_rgba(51,204,255,0.8)]',
    iconColor: '#33ccff'
  },
  [CardColor.GREEN]: {
    border: 'border-[#39ff14]',
    text: 'text-[#39ff14]',
    shadow: 'shadow-[#39ff14]/40',
    bgGradient: 'bg-gradient-to-br from-green-950 via-slate-950 to-black',
    glow: 'drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]',
    iconColor: '#39ff14'
  },
  [CardColor.YELLOW]: {
    border: 'border-[#ffe600]',
    text: 'text-[#ffe600]',
    shadow: 'shadow-[#ffe600]/40',
    bgGradient: 'bg-gradient-to-br from-yellow-950 via-slate-950 to-black',
    glow: 'drop-shadow-[0_0_8px_rgba(255,230,0,0.8)]',
    iconColor: '#ffe600'
  },
  [CardColor.WILD]: {
    border: 'border-white', // Handled via special gradient usually
    text: 'text-white',
    shadow: 'shadow-purple-500/50',
    bgGradient: 'bg-gradient-to-br from-slate-900 to-black',
    glow: 'drop-shadow-[0_0_8px_rgba(255,255,255,1)]',
    iconColor: '#ffffff'
  },
};

export const Card: React.FC<CardProps> = ({ card, onClick, isPlayable, isHidden, isSmall, hoverEffect = true }) => {
  const theme = NEON_THEMES[card.color];
  const isWild = card.color === CardColor.WILD;
  
  // Dimensions
  const widthClass = isSmall ? 'w-8 md:w-12' : 'w-24 sm:w-28 md:w-32 lg:w-36';
  const heightClass = isSmall ? 'h-12 md:h-16' : 'h-36 sm:h-40 md:h-48 lg:h-52';
  
  const textSizeClass = isSmall ? 'text-xl md:text-2xl' : 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl';
  const cornerTextSize = isSmall ? 'text-[10px] md:text-xs' : 'text-xs sm:text-sm md:text-base';
  const iconSize = isSmall ? '1em' : '0.8em'; 

  // Base container styles
  // We use a pseudo-border approach for Wild cards to get the rainbow effect
  const baseClasses = `
    relative rounded-xl md:rounded-2xl select-none transition-transform
    ${widthClass} ${heightClass}
    ${isPlayable ? 'cursor-pointer z-10' : ''}
    ${isHidden ? '' : (isWild ? 'p-[2px]' : `border-2 ${theme.border} ${theme.bgGradient} ${theme.shadow} shadow-lg`)}
  `;

  // --- Render Helpers ---

  const renderBack = () => (
    <div className={`w-full h-full rounded-xl md:rounded-2xl bg-slate-950 relative overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center`}>
       {/* Background Grid Pattern */}
       <div className="absolute inset-0 opacity-20" 
            style={{ backgroundImage: 'radial-gradient(#4f4f4f 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
       </div>
       
       {/* Neon Ring */}
       <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[85%] h-[60%] border-4 border-red-500/80 rounded-[50%] transform -rotate-45 shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-slate-900/50 backdrop-blur-sm" />
       </div>

       {/* Logo */}
       <div className="relative transform -rotate-45 z-10">
          <span className="font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]"
                style={{ WebkitTextStroke: '1px white' }}>
            UNO
          </span>
          <div className="absolute -bottom-2 right-0 text-[8px] tracking-[0.3em] text-cyan-400 font-bold uppercase">
              Neon
          </div>
       </div>
    </div>
  );

  const renderSymbol = (type: ECardType, className: string) => {
    switch (type) {
      case ECardType.SKIP:
        return <Ban className={className} />;
      case ECardType.REVERSE:
        return <RefreshCw className={className} />;
      case ECardType.DRAW_TWO:
        return <span className={`font-black italic ${theme.glow}`}>+2</span>;
      case ECardType.WILD:
        return <Zap className={className} fill="currentColor" />;
      case ECardType.WILD_DRAW_FOUR:
        return (
            <div className="relative">
                <span className="font-black italic drop-shadow-[0_0_10px_rgba(255,255,255,1)]">+4</span>
                <Zap className="absolute -top-4 -right-4 text-yellow-400 animate-pulse" size={24} fill="currentColor" />
            </div>
        );
      default:
        return null;
    }
  };

  const renderFace = () => {
    const isNumber = card.type === ECardType.NUMBER;
    const isAction = !isNumber && card.type !== ECardType.WILD && card.type !== ECardType.WILD_DRAW_FOUR;
    
    // Wild Gradient Border Background
    const wildBackground = isWild ? (
        <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 animate-gradient-xy" />
    ) : null;

    // Inner Content Container
    // If Wild, this is the black card on top of the gradient background
    const innerClass = isWild 
        ? `w-full h-full bg-slate-950 rounded-[10px] md:rounded-[14px] relative overflow-hidden flex items-center justify-center`
        : `w-full h-full relative overflow-hidden flex items-center justify-center`;

    return (
        <>
            {wildBackground}
            <div className={innerClass}>
                 {/* Inner Neon Ring */}
                <div className={`absolute w-[85%] h-[70%] border-2 ${isWild ? 'border-white/50' : theme.border} rounded-[50%] transform -rotate-12 opacity-80 shadow-[0_0_10px_currentColor] ${isWild ? 'text-white' : theme.text}`} />
                
                {/* Center Content */}
                <div className={`relative z-10 flex items-center justify-center ${theme.text} ${theme.glow}`}>
                    {isNumber ? (
                        <span className={`font-black italic tracking-tighter ${textSizeClass}`}>
                            {card.value}
                        </span>
                    ) : (
                        <div className={`font-black italic ${textSizeClass} flex items-center justify-center`}>
                            {renderSymbol(card.type, isSmall ? "w-6 h-6" : "w-16 h-16")}
                        </div>
                    )}
                </div>

                {/* Corners */}
                <div className={`absolute top-1.5 left-2 ${theme.text} font-bold italic ${cornerTextSize} leading-none`}>
                    {card.type === ECardType.NUMBER ? card.value : renderSymbol(card.type, isSmall ? "w-3 h-3" : "w-5 h-5")}
                </div>
                <div className={`absolute bottom-1.5 right-2 ${theme.text} font-bold italic ${cornerTextSize} leading-none transform rotate-180`}>
                    {card.type === ECardType.NUMBER ? card.value : renderSymbol(card.type, isSmall ? "w-3 h-3" : "w-5 h-5")}
                </div>

                {/* Gloss/Sheen Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </div>
        </>
    );
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={isPlayable && hoverEffect ? { y: -20, scale: 1.1, zIndex: 50, transition: { duration: 0.2 } } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      className={baseClasses}
      onClick={isPlayable ? onClick : undefined}
    >
      {isHidden ? renderBack() : renderFace()}
    </motion.div>
  );
};