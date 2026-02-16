import React, { useState, useEffect } from 'react';
import { Card } from './components/Card';
import { ColorPicker } from './components/ColorPicker';
import { EffectOverlay, FlyingCard } from './components/Particles';
import { useGameEngine } from './hooks/useGameEngine';
import { GameStatus, CardColor, CardType, GameRules, Player } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, User, Users, Cpu, ChevronRight, ChevronLeft, Trophy, Crown, Settings, Volume2, VolumeX, Music, Zap, X, AlertTriangle, Skull, Sliders, CheckCircle, Globe, Search, PlusCircle, Wifi, Copy, Hash } from 'lucide-react';
import { getNextPlayerIndex } from './utils/gameUtils';
import { socket } from './src/services/socketService';

// --- Sub-components for Lobby ---

const FloatingBackground = () => {
    // Generate deterministic random-like positions for visual cards
    const bgCards = Array.from({ length: 8 }).map((_, i) => ({
        id: `bg-card-${i}`,
        x: Math.random() * 100, // random % left
        y: Math.random() * 100, // random % top
        rotate: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW, CardColor.WILD][Math.floor(Math.random() * 5)],
        delay: i * 0.5
    }));

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-950">
            {/* Animated Gradient Orbs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3], x: [0, 50, 0], y: [0, 30, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-900/40 rounded-full blur-[120px]"
            />
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2], x: [0, -40, 0], y: [0, -50, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/40 rounded-full blur-[100px]"
            />

            {bgCards.map((c) => (
                <motion.div
                    key={c.id}
                    className="absolute opacity-30 blur-[1px]"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    animate={{
                        y: [0, -30, 0],
                        rotate: [c.rotate, c.rotate + 20, c.rotate],
                    }}
                    transition={{
                        duration: 5 + Math.random() * 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: c.delay
                    }}
                >
                    <div style={{ transform: `scale(${c.scale})` }}>
                        <Card card={{ id: c.id, color: c.color, type: CardType.NUMBER, value: 7, score: 0 }} isHidden={false} hoverEffect={false} />
                    </div>
                </motion.div>
            ))}
            <div className="absolute inset-0 bg-black/40 z-10" /> {/* Dimming overlay */}
        </div>
    );
};

const NeonToggle = ({ label, icon: Icon, value, onChange }: { label: string, icon: any, value: boolean, onChange: () => void }) => (
    <div className="flex items-center justify-between w-full py-3 border-b border-white/10 last:border-0 cursor-pointer group" onClick={onChange}>
        <div className="flex items-center gap-3 text-white/80 group-hover:text-white transition-colors">
            <Icon size={20} className="text-cyan-400" />
            <span className="font-bold tracking-wide select-none text-sm md:text-base">{label}</span>
        </div>
        <button
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${value ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-700'}`}
        >
            <motion.div
                layout
                className="absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full shadow-md"
                initial={false}
                animate={{ left: value ? 'calc(100% - 1.25rem)' : '0.25rem' }}
            />
        </button>
    </div>
);

const SettingsModal = ({ isOpen, onClose, settings, onUpdate }: { isOpen: boolean, onClose: () => void, settings: { sound: boolean, music: boolean, hardMode: boolean }, onUpdate: (key: string, val: boolean) => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900/90 border border-cyan-500/30 w-full max-w-md rounded-2xl p-6 relative shadow-[0_0_30px_rgba(6,182,212,0.15)]"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black italic text-white tracking-widest flex items-center gap-2">
                        <Settings className="text-cyan-400 animate-spin-slow" /> SETTINGS
                    </h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-2">
                    <NeonToggle
                        label="Sound FX"
                        icon={settings.sound ? Volume2 : VolumeX}
                        value={settings.sound}
                        onChange={() => onUpdate('sound', !settings.sound)}
                    />
                    <NeonToggle
                        label="Music"
                        icon={settings.music ? Music : VolumeX}
                        value={settings.music}
                        onChange={() => onUpdate('music', !settings.music)}
                    />
                    <NeonToggle
                        label="Hard Mode (AI)"
                        icon={Zap}
                        value={settings.hardMode}
                        onChange={() => onUpdate('hardMode', !settings.hardMode)}
                    />
                </div>

                <div className="mt-8 text-center text-xs text-white/30 font-mono">
                    UNO LEGENDS v1.0 // NEON EDITION
                </div>
            </motion.div>
        </div>
    );
};

// --- Main App Component ---

// ... (DirectionIndicator and DealingAnimation unchanged, see below)
const DirectionIndicator = ({ direction }: { direction: 1 | -1 }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
            <motion.div
                key={direction}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[600px] md:h-[600px] rounded-full bg-white/5 blur-3xl"
            />
            <div className="absolute w-[250px] h-[250px] sm:w-[320px] sm:h-[320px] md:w-[550px] md:h-[550px] rounded-full border border-white/5 border-dashed" />
            <motion.div
                animate={{ rotate: direction === 1 ? 360 : -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[600px] md:h-[600px] rounded-full flex items-center justify-center"
            >
                {[0, 90, 180, 270].map((deg) => (
                    <div
                        key={deg}
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-bottom"
                        style={{ height: '50%', transformOrigin: 'bottom center', transform: `rotate(${deg}deg)` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30">
                            {direction === 1 ? (
                                <ChevronRight size={24} className="md:w-9 md:h-9 transform rotate-90 drop-shadow-lg" />
                            ) : (
                                <ChevronLeft size={24} className="md:w-9 md:h-9 transform rotate-90 drop-shadow-lg" />
                            )}
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

const DealingAnimation = ({ totalPlayers, getPlayerPos }: { totalPlayers: number, getPlayerPos: (i: number, t: number) => { x: string, y: string } }) => {
    const cards = [];
    for (let i = 0; i < totalPlayers; i++) {
        for (let j = 0; j < 7; j++) {
            cards.push({ playerIndex: i, cardIndex: j });
        }
    }

    return (
        <div className="absolute inset-0 z-50 pointer-events-none">
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 0.8, duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <div className="relative">
                    <motion.div
                        animate={{ x: [-50, 0], rotate: [-10, 0] }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="absolute top-0 left-0"
                    >
                        <Card card={{ id: 'd1', color: CardColor.WILD, type: CardType.NUMBER, score: 0 }} isHidden />
                    </motion.div>
                    <motion.div
                        animate={{ x: [50, 0], rotate: [10, 0] }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="absolute top-0 left-0"
                    >
                        <Card card={{ id: 'd2', color: CardColor.WILD, type: CardType.NUMBER, score: 0 }} isHidden />
                    </motion.div>
                </div>
            </motion.div>

            {cards.map((item, idx) => {
                const target = getPlayerPos(item.playerIndex, totalPlayers);
                const delay = 0.8 + (idx * 0.05);

                return (
                    <motion.div
                        key={`${item.playerIndex}-${item.cardIndex}`}
                        initial={{ top: '50%', left: '50%', scale: 0.5, opacity: 0, x: '-50%', y: '-50%' }}
                        animate={{
                            top: target.y,
                            left: target.x,
                            scale: 0.2,
                            opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                            duration: 0.6,
                            delay: delay,
                            ease: "easeInOut"
                        }}
                        className="absolute w-20 h-28 md:w-32 md:h-48"
                    >
                        <Card card={{ id: 'deal', color: CardColor.WILD, type: CardType.NUMBER, score: 0 }} isHidden />
                    </motion.div>
                );
            })}
        </div>
    );
};

// --- MENU & MODES CONFIG ---

type MenuView = 'main' | 'play-type' | 'multiplayer-menu' | 'modes' | 'custom' | 'players' | 'lobby-browser' | 'create-room';

const NORMAL_RULES: GameRules = {
    modeName: 'Normal',
    stacking: false,
    drawUntilPlay: false,
    sevenZero: false,
    jumpIn: false,
    unoPenaltyCount: 2,
    forcePlay: false
};

const NO_MERCY_RULES: GameRules = {
    modeName: 'No Mercy',
    stacking: true, // Implied: would need engine support
    drawUntilPlay: true,
    sevenZero: true,
    jumpIn: true,
    unoPenaltyCount: 4, // Ouch
    forcePlay: true
};

export default function App() {
    const [settings, setSettings] = useState({
        sound: true,
        music: true,
        hardMode: false
    });

    const {
        gameState,
        startGame,
        humanPlayCard,
        humanDrawCard,
        humanSelectWildColor,
        wildPickerOpen,
        isUnoCalled,
        callUno,
        restartGame
    } = useGameEngine(settings);

    const [lastEffect, setLastEffect] = useState<'draw2' | 'draw4' | 'skip' | 'reverse' | 'wild' | null>(null);
    const [projectiles, setProjectiles] = useState<{ id: number, startX: string, startY: string, endX: string, endY: string, delay: number, color: string }[]>([]);
    const [shake, setShake] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

    // Menu Navigation States
    const [menuView, setMenuView] = useState<MenuView>('main');
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Custom Rules State
    const [selectedRules, setSelectedRules] = useState<GameRules>(NORMAL_RULES);
    const [customConfig, setCustomConfig] = useState<GameRules>({
        ...NORMAL_RULES,
        modeName: 'Custom'
    });

    // Multiplayer State
    const [mpPlayerName, setMpPlayerName] = useState('Player ' + Math.floor(Math.random() * 1000));
    const [mpRoomId, setMpRoomId] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [connectedPlayers, setConnectedPlayers] = useState<Player[]>([]);
    const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
    const [mpError, setMpError] = useState('');

    useEffect(() => {
        // Socket Listeners
        const onRoomCreated = (data: { roomId: string }) => {
            setMpRoomId(data.roomId);
            setIsHost(true);
            setMenuView('create-room'); // Re-use this view for "Lobby Waiting"
            setConnectedPlayers([{ id: socket.id, name: mpPlayerName, isHuman: true, hand: [] } as any]);
        };

        const onPlayerJoined = (data: { players: Player[] }) => {
            setConnectedPlayers(data.players);
            // If we just joined and are not host, ensure we are on the waiting screen
            if (menuView === 'lobby-browser') setMenuView('create-room');
        };

        const onError = (data: { message: string }) => {
            setMpError(data.message);
            setTimeout(() => setMpError(''), 3000);
        };

        const onConnect = () => {
            console.log("Connected to server");
            setMpError('');
        };

        const onConnectError = (err: Error) => {
            console.error("Connection error:", err);
            setMpError(`Failed to connect to server: ${err.message}`);
        };

        const onDisconnect = () => {
            console.log("Disconnected from server");
        };

        socket.on('room_created', onRoomCreated);
        socket.on('player_joined', onPlayerJoined);
        socket.on('error', onError);
        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('room_created', onRoomCreated);
            socket.off('player_joined', onPlayerJoined);
            socket.off('error', onError);
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('disconnect', onDisconnect);
        };
    }, [mpPlayerName, menuView]);

    const [isConnecting, setIsConnecting] = useState(false);

    const handleCreateRoom = () => {
        if (!mpPlayerName.trim()) {
            setMpError('Please enter your name');
            return;
        }
        setIsConnecting(true);
        if (!socket.connected) {
            socket.connect();
        }
        socket.emit('create_room', { playerName: mpPlayerName });
        // Timeout to stop loading if no response
        setTimeout(() => setIsConnecting(false), 5000);
    };

    const handleJoinRoom = () => {
        if (!joinRoomIdInput) return;
        if (!socket.connected) socket.connect();
        socket.emit('join_room', { roomId: joinRoomIdInput, playerName: mpPlayerName });
        sessionStorage.setItem('uno_room_id', joinRoomIdInput);
    };

    const handleStartMultiplayerGame = () => {
        if (isHost && mpRoomId) {
            // IMPORTANT: Generate initial state here (host authority)
            // For simplicity, we reuse the engine's startGame but logic needs to be server-aware
            // We will trigger the engine's startGame logic but we need to pass the "players" array from the lobby

            // Hack: we call startGame to generate state locally, then emit it
            // We need to modify startGame to accept players array or we construct state manually

            // Let's emit a signal and let the hook handle it? 
            // `startGame` in hook generates deck. 
            // We can call `startGame(connectedPlayers.length)` then immediately capture state... 
            // But `startGame` sets state and effects run.

            // Better: Emit 'start_game' to server with basic info, server or host generates state.
            // Let's do: Host generates state. 
            startGame(connectedPlayers.length, NORMAL_RULES); // This sets local state

            // synchronizing this is tricky with the current hook structure 
            // because `startGame` update is async/batched.
            // workaround: we'll trust the effect in useGameEngine regarding `status === DEALING`
            // but we need to inject the real player names/IDs.

            // Actually, let's just emit 'start_game' and let the hook's effect pick up the state change
            // BUT the hook doesn't expose the state *immediately* after generation for us to emit.

            // Alternative: We manually construct the start state here and emit it.
            // WE WILL DO THIS FOR ROBUSTNESS.
            // ... (Implemented inside handleStartGame logic below) ...
        }
    };

    const updateSetting = (key: string, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Menu Handlers
    const handleModeSelect = (mode: 'Normal' | 'No Mercy' | 'Custom') => {
        if (mode === 'Normal') {
            setSelectedRules(NORMAL_RULES);
            setMenuView('players');
        } else if (mode === 'No Mercy') {
            setSelectedRules(NO_MERCY_RULES);
            setMenuView('players');
        } else {
            // Go to custom config
            setMenuView('custom');
        }
    };

    const handleCustomStart = () => {
        setSelectedRules(customConfig);
        setMenuView('players');
    };

    const handleStartGame = (players: number) => {
        // If multiplayer host
        if (menuView === 'create-room' && isHost) {
            // We need to construct the initial state with the connected players
            // We can rely on the engine's `startGame` but we need to override the players list immediately after?
            // Or just let `startGame` run, and since we are host, *we* will be the one emitting the update in the next render cycle?
            // The hook's `executePlay` emits, but `startGame` logic was not modified to emit.

            // Let's modify the socketService/hook integration to emit 'start_game' event
            // For now, doing it here is cleaner.

            startGame(connectedPlayers.length, selectedRules);

            // We need to wait for state to update... 
            // This is the tricky part of React state.
            // We will add a `useEffect` in App that watches for `gameState.status === DEALING` AND `isHost`
            // and then emits the state to everyone.
            sessionStorage.setItem('uno_room_id', mpRoomId);

        } else {
            // Local game
            sessionStorage.removeItem('uno_room_id');
            startGame(players, selectedRules);
        }
    };


    // Effect to broadcast initial state if Host
    useEffect(() => {
        if (isHost && mpRoomId && gameState.status === GameStatus.DEALING && socket.connected) {
            // We just started the game locally, time to broadcast!
            // We must ensure the players array matches the connected players (socket IDs)
            // `startGame` creates generic "CPU" players. We need to patch them.

            const patchedPlayers = gameState.players.map((p, i) => {
                if (connectedPlayers[i]) {
                    return {
                        ...p,
                        id: connectedPlayers[i].id, // Use socket ID or similar
                        name: connectedPlayers[i].name,
                        isHuman: true
                    };
                }
                return p;
            });

            const initialState = {
                ...gameState,
                players: patchedPlayers,
                lastActionMessage: "Game Started by Host!"
            };

            // Update local to match
            // setGameState(initialState); // We don't have setGameState exposed here easily... 
            // Actually `startGame` passed from hook... 
            // We will just emit. The server broadcasts `game_started`.
            // The hook listens for `game_started` and updates local state. 
            // So we emit, server echoes, we update. Perfect.

            socket.emit('start_game', { roomId: mpRoomId, initialGameState: initialState });
        }
    }, [gameState.status, isHost, mpRoomId]);

    const handleRestart = () => {
        restartGame();
        setMenuView('main');
    };

    // ... (Helper functions: getPlayerScreenPosition, getOpponentConfig, getDeckPosition - SAME AS BEFORE)
    const getPlayerScreenPosition = (playerIndex: number, totalPlayers: number) => {
        if (playerIndex === 0) return { x: '50%', y: '100%' };
        if (totalPlayers === 2) {
            return { x: '50%', y: '0%' };
        } else if (totalPlayers === 3) {
            if (playerIndex === 1) return { x: '0%', y: '50%' };
            if (playerIndex === 2) return { x: '100%', y: '50%' };
        } else {
            if (playerIndex === 1) return { x: '0%', y: '50%' };
            if (playerIndex === 2) return { x: '50%', y: '0%' };
            if (playerIndex === 3) return { x: '100%', y: '50%' };
        }
        return { x: '50%', y: '50%' };
    };

    // ... (Effect for projectiles SAME AS BEFORE)
    useEffect(() => {
        const lastCard = gameState.discardPile[gameState.discardPile.length - 1];
        if (!lastCard) return;

        if (gameState.lastActionMessage.includes('played')) {
            let effectType: 'draw2' | 'draw4' | 'skip' | 'reverse' | 'wild' | null = null;
            if (lastCard.type === CardType.DRAW_TWO) effectType = 'draw2';
            if (lastCard.type === CardType.WILD_DRAW_FOUR) effectType = 'draw4';
            if (lastCard.type === CardType.SKIP) effectType = 'skip';
            if (lastCard.type === CardType.REVERSE) effectType = 'reverse';
            if (lastCard.type === CardType.WILD) effectType = 'wild';

            setLastEffect(effectType);

            if (effectType === 'draw2' || effectType === 'draw4') {
                const victimIndex = gameState.currentPlayerIndex;
                const targetPos = getPlayerScreenPosition(victimIndex, gameState.players.length);
                const adjustedTargetX = targetPos.x === '0%' ? '10%' : targetPos.x === '100%' ? '90%' : targetPos.x;
                const adjustedTargetY = targetPos.y === '0%' ? '10%' : targetPos.y === '100%' ? '90%' : targetPos.y;

                const count = effectType === 'draw4' ? 4 : 2;
                const color = effectType === 'draw4' ? '#EF4444' : '#EAB308';

                const newProjectiles = [];
                for (let i = 0; i < count; i++) {
                    newProjectiles.push({
                        id: Date.now() + i,
                        startX: '50%',
                        startY: '50%',
                        endX: adjustedTargetX,
                        endY: adjustedTargetY,
                        delay: i * 0.15,
                        color: color
                    });
                }
                setProjectiles(newProjectiles);
                setTimeout(() => setProjectiles([]), 2000);
                setShake(true);
                setTimeout(() => setShake(false), 500);
            }
            const t = setTimeout(() => setLastEffect(null), 1500);
            return () => clearTimeout(t);
        }
    }, [gameState.discardPile, gameState.lastActionMessage]);

    const getOpponentConfig = (index: number, totalPlayers: number) => {
        let position: 'top' | 'left' | 'right' = 'top';
        if (totalPlayers === 2) position = 'top';
        else if (totalPlayers === 3) {
            if (index === 0) position = 'left';
            if (index === 1) position = 'right';
        } else {
            if (index === 0) position = 'left';
            if (index === 1) position = 'top';
            if (index === 2) position = 'right';
        }

        switch (position) {
            case 'top':
                return {
                    wrapperClass: "absolute top-4 sm:top-6 md:top-10 left-1/2 -translate-x-1/2 flex flex-col items-center",
                    handRotation: 180,
                    infoClass: "mb-2 md:mb-3",
                    unoBadgeClass: "-bottom-4 left-1/2 -translate-x-1/2"
                };
            case 'left':
                return {
                    wrapperClass: "absolute left-2 sm:left-4 md:left-12 top-1/2 -translate-y-1/2 flex flex-row items-center",
                    handRotation: 90,
                    infoClass: "mr-3 md:mr-6",
                    unoBadgeClass: "top-1/2 -translate-y-1/2 -right-8"
                };
            case 'right':
                return {
                    wrapperClass: "absolute right-2 sm:right-4 md:right-12 top-1/2 -translate-y-1/2 flex flex-row-reverse items-center",
                    handRotation: -90,
                    infoClass: "ml-3 md:ml-6",
                    unoBadgeClass: "top-1/2 -translate-y-1/2 -left-8"
                };
        }
    };

    const getDeckPosition = () => {
        if (windowWidth < 768) {
            return { x: 24 + 16, y: 96 + 32 };
        }
        return { x: 48 + 32, y: 128 + 48 };
    };

    // --- LOBBY UI RENDERING ---

    if (gameState.status === GameStatus.LOBBY) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden font-fredoka">

                <FloatingBackground />

                {/* Settings Button */}
                <div className="absolute top-4 right-4 z-50">
                    <motion.button
                        onClick={() => setSettingsOpen(true)}
                        whileHover={{ rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        className="bg-slate-800/80 p-3 rounded-full border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-slate-700 transition-colors"
                    >
                        <Settings size={24} />
                    </motion.button>
                </div>

                <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onUpdate={updateSetting} />

                <div className="z-10 w-full max-w-lg flex flex-col items-center justify-center relative">

                    {/* Logo */}
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1, scale: [1, 1.02, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="mb-8 md:mb-12 text-center relative"
                    >
                        <div className="absolute inset-0 bg-yellow-500/20 blur-[50px] rounded-full" />
                        <h1 className="relative text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-pink-500 to-cyan-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]"
                            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)' }}>
                            UNO
                        </h1>
                        <h2 className="relative text-2xl md:text-3xl font-bold tracking-[0.5em] text-cyan-400 mt-2 animate-pulse drop-shadow-[0_0_8px_#0ff]">
                            LEGENDS
                        </h2>
                    </motion.div>

                    {/* Dynamic Menu Area */}
                    <div className="w-full relative min-h-[350px] flex items-center justify-center">
                        <AnimatePresence mode='wait'>

                            {/* 1. Main Menu */}
                            {menuView === 'main' && (
                                <motion.div
                                    key="main-menu"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
                                    className="relative group cursor-pointer"
                                    onClick={() => setMenuView('play-type')}
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                                    <button className="relative w-64 md:w-80 h-20 md:h-24 bg-slate-900 rounded-2xl border-2 border-white/10 flex items-center justify-center overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                        <motion.div
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }}
                                            className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                                        />
                                        <div className="flex items-center gap-4 z-10">
                                            <Play size={32} className="text-pink-500 fill-pink-500 group-hover:scale-110 transition-transform" />
                                            <span className="text-3xl md:text-4xl font-black italic text-white tracking-widest group-hover:text-pink-200 transition-colors">
                                                PLAY NOW
                                            </span>
                                        </div>
                                    </button>
                                </motion.div>
                            )}

                            {/* 2. Choose Play Type (Solo vs Multiplayer) */}
                            {menuView === 'play-type' && (
                                <motion.div
                                    key="play-type"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="w-full grid gap-4 px-4 max-w-sm"
                                >
                                    <h3 className="text-white/70 text-center mb-2 tracking-widest text-sm font-bold">CHOOSE PLAY STYLE</h3>

                                    <button onClick={() => setMenuView('modes')} className="bg-gradient-to-r from-cyan-900/80 to-slate-900/80 border border-cyan-500/30 text-white p-6 rounded-xl flex items-center justify-between group hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400"><User size={28} /></div>
                                            <div className="text-left">
                                                <div className="font-bold text-xl">SOLO</div>
                                                <div className="text-xs text-white/50">Play against AI</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/30 group-hover:text-white" />
                                    </button>

                                    <button onClick={() => setMenuView('multiplayer-menu')} className="bg-gradient-to-r from-orange-900/80 to-slate-900/80 border border-orange-500/30 text-white p-6 rounded-xl flex items-center justify-between group hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-orange-500/20 rounded-full text-orange-400"><Globe size={28} /></div>
                                            <div className="text-left">
                                                <div className="font-bold text-xl">MULTIPLAYER</div>
                                                <div className="text-xs text-white/50">Online with friends</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/30 group-hover:text-white" />
                                    </button>

                                    <button onClick={() => setMenuView('main')} className="mt-4 text-white/40 hover:text-white text-sm flex items-center justify-center gap-1 transition-colors">
                                        <ChevronLeft size={14} /> BACK
                                    </button>
                                </motion.div>
                            )}

                            {/* 2b. Multiplayer Menu (Find/Create) */}
                            {menuView === 'multiplayer-menu' && (
                                <motion.div
                                    key="multi-menu"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="w-full grid gap-4 px-4 max-w-sm"
                                >
                                    <h3 className="text-white/70 text-center mb-2 tracking-widest text-sm font-bold text-orange-400">MULTIPLAYER LOBBY</h3>

                                    <button onClick={() => setMenuView('lobby-browser')} className="bg-slate-800/80 border border-white/10 text-white p-5 rounded-xl flex items-center justify-between group hover:bg-slate-700 hover:border-white/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <Search size={24} className="text-white/70" />
                                            <span className="font-bold text-lg">FIND ROOM</span>
                                        </div>
                                    </button>

                                    <button onClick={() => setMenuView('create-room')} className="bg-slate-800/80 border border-white/10 text-white p-5 rounded-xl flex items-center justify-between group hover:bg-slate-700 hover:border-white/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <PlusCircle size={24} className="text-white/70" />
                                            <span className="font-bold text-lg">CREATE ROOM</span>
                                        </div>
                                    </button>

                                    <button onClick={() => setMenuView('play-type')} className="mt-4 text-white/40 hover:text-white text-sm flex items-center justify-center gap-1 transition-colors">
                                        <ChevronLeft size={14} /> BACK
                                    </button>
                                </motion.div>
                            )}

                            {/* 2c. Lobby Browser (Join Room) */}
                            {menuView === 'lobby-browser' && (
                                <motion.div
                                    key="lobby"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="w-full max-w-md bg-slate-900/90 border border-white/10 p-6 rounded-2xl shadow-xl min-h-[300px] flex flex-col"
                                >
                                    <h3 className="text-white font-bold text-center mb-4 flex items-center justify-center gap-2"><Search size={18} /> JOIN ROOM</h3>

                                    <div className="space-y-4 mb-4">
                                        <div>
                                            <label className="text-xs text-white/50 block mb-1">Your Name</label>
                                            <input
                                                value={mpPlayerName}
                                                onChange={(e) => setMpPlayerName(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-white/50 block mb-1">Room Code</label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={joinRoomIdInput}
                                                    onChange={(e) => setJoinRoomIdInput(e.target.value.toUpperCase())}
                                                    placeholder="X8A9Z1"
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white font-mono uppercase tracking-widest focus:border-cyan-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        {mpError && <div className="text-red-500 text-sm text-center animate-pulse">{mpError}</div>}
                                    </div>

                                    <button onClick={handleJoinRoom} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
                                        JOIN GAME
                                    </button>

                                    <button onClick={() => setMenuView('multiplayer-menu')} className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-sm">Cancel</button>
                                </motion.div>
                            )}

                            {/* 2d. Waiting Room / Create Room */}
                            {menuView === 'create-room' && (
                                <motion.div
                                    key="create"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="w-full max-w-md bg-slate-900/90 border border-white/10 p-6 rounded-2xl shadow-xl"
                                >
                                    <h3 className="text-white font-bold text-center mb-2">{mpRoomId ? 'LOBBY' : 'CREATE ROOM'}</h3>

                                    {!mpRoomId ? (
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="text-xs text-white/50 block mb-1">Your Name</label>
                                                <input
                                                    value={mpPlayerName}
                                                    onChange={(e) => setMpPlayerName(e.target.value)}
                                                    placeholder="Enter your name"
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                                />
                                            </div>
                                            {mpError && <div className="text-red-500 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">{mpError}</div>}
                                            <button
                                                onClick={handleCreateRoom}
                                                disabled={isConnecting}
                                                className={`w-full text-white font-bold py-3 rounded-xl transition-all ${isConnecting ? 'bg-orange-800 cursor-wait' : 'bg-orange-600 hover:bg-orange-500'}`}
                                            >
                                                {isConnecting ? 'CONNECTING...' : 'CREATE'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mb-6">
                                            <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-xl text-center mb-6">
                                                <div className="text-xs text-cyan-400 mb-1 uppercase tracking-widest">Room Code</div>
                                                <div className="text-4xl font-mono text-white font-bold tracking-widest select-all flex items-center justify-center gap-3">
                                                    {mpRoomId}
                                                    <Copy size={16} className="text-white/20 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(mpRoomId)} />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs text-white/40 mb-2">CONNECTED PLAYERS ({connectedPlayers.length}/4)</div>
                                                {connectedPlayers.map((p, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
                                                                {p.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="text-white font-bold">{p.name} {p.id === socket.id ? '(You)' : ''}</span>
                                                        </div>
                                                        {i === 0 && <Crown size={16} className="text-yellow-400" />}
                                                    </div>
                                                ))}
                                                {[...Array(4 - connectedPlayers.length)].map((_, i) => (
                                                    <div key={`empty-${i}`} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-dashed border-white/10 opacity-50">
                                                        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                                                        <span className="text-white/30 italic">Waiting...</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {mpRoomId && isHost && (
                                        <button
                                            onClick={() => handleStartGame(connectedPlayers.length)}
                                            disabled={connectedPlayers.length < 2}
                                            className={`w-full font-bold py-4 rounded-xl mb-3 transition-all ${connectedPlayers.length < 2 ? 'bg-slate-700 text-white/30 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50'}`}
                                        >
                                            START GAME
                                        </button>
                                    )}

                                    {mpRoomId && !isHost && (
                                        <div className="text-center text-white/50 py-4 italic animate-pulse">
                                            Waiting for host to start...
                                        </div>
                                    )}

                                    <button onClick={() => { setMenuView('multiplayer-menu'); setMpRoomId(''); setConnectedPlayers([]); setIsHost(false); }} className="w-full text-white/40 hover:text-white text-sm">
                                        Cancel
                                    </button>
                                </motion.div>
                            )}

                            {/* 3. Mode Selection (SOLO PATH) */}
                            {menuView === 'modes' && (
                                <motion.div
                                    key="mode-select"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="w-full grid gap-4 px-4 max-w-sm"
                                >
                                    <h3 className="text-white/70 text-center mb-2 tracking-widest text-sm font-bold">SELECT GAME MODE</h3>

                                    {/* Normal */}
                                    <button onClick={() => handleModeSelect('Normal')} className="bg-gradient-to-r from-green-900/80 to-slate-900/80 border border-green-500/30 text-white p-4 rounded-xl flex items-center justify-between group hover:border-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><CheckCircle size={20} /></div>
                                            <div className="text-left">
                                                <div className="font-bold">Normal</div>
                                                <div className="text-xs text-white/50">Classic Rules</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/30 group-hover:text-white" />
                                    </button>

                                    {/* No Mercy */}
                                    <button onClick={() => handleModeSelect('No Mercy')} className="bg-gradient-to-r from-red-900/80 to-slate-900/80 border border-red-500/30 text-white p-4 rounded-xl flex items-center justify-between group hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-500/20 rounded-lg text-red-400 animate-pulse"><Skull size={20} /></div>
                                            <div className="text-left">
                                                <div className="font-bold text-red-200">No Mercy</div>
                                                <div className="text-xs text-white/50">Aggressive Rules (+4/+10)</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/30 group-hover:text-white" />
                                    </button>

                                    {/* Custom */}
                                    <button onClick={() => handleModeSelect('Custom')} className="bg-gradient-to-r from-purple-900/80 to-slate-900/80 border border-purple-500/30 text-white p-4 rounded-xl flex items-center justify-between group hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Sliders size={20} /></div>
                                            <div className="text-left">
                                                <div className="font-bold">Custom</div>
                                                <div className="text-xs text-white/50">Configure Rules</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/30 group-hover:text-white" />
                                    </button>

                                    <button onClick={() => setMenuView('play-type')} className="mt-2 text-white/40 hover:text-white text-sm flex items-center justify-center gap-1 transition-colors">
                                        <ChevronLeft size={14} /> BACK
                                    </button>
                                </motion.div>
                            )}

                            {/* 4. Custom Settings */}
                            {menuView === 'custom' && (
                                <motion.div
                                    key="custom-settings"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="w-full max-w-md bg-slate-900/90 border border-purple-500/30 p-6 rounded-2xl shadow-xl"
                                >
                                    <h3 className="text-purple-400 text-center mb-4 tracking-widest font-black italic">CUSTOM RULES</h3>
                                    <div className="space-y-1 mb-6 max-h-[300px] overflow-y-auto no-scrollbar">
                                        <NeonToggle
                                            label="Stacking (+2 on +2)"
                                            icon={Users}
                                            value={customConfig.stacking}
                                            onChange={() => setCustomConfig(prev => ({ ...prev, stacking: !prev.stacking }))}
                                        />
                                        <NeonToggle
                                            label="Force Play"
                                            icon={Zap}
                                            value={customConfig.forcePlay}
                                            onChange={() => setCustomConfig(prev => ({ ...prev, forcePlay: !prev.forcePlay }))}
                                        />
                                        <NeonToggle
                                            label="Draw Until Play"
                                            icon={RotateCcw}
                                            value={customConfig.drawUntilPlay}
                                            onChange={() => setCustomConfig(prev => ({ ...prev, drawUntilPlay: !prev.drawUntilPlay }))}
                                        />
                                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                                            <span className="text-white/80 font-bold ml-8">UNO Penalty</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setCustomConfig(prev => ({ ...prev, unoPenaltyCount: Math.max(2, prev.unoPenaltyCount - 2) }))} className="w-8 h-8 bg-slate-700 rounded text-white">-</button>
                                                <span className="text-cyan-400 font-bold w-4 text-center">{customConfig.unoPenaltyCount}</span>
                                                <button onClick={() => setCustomConfig(prev => ({ ...prev, unoPenaltyCount: Math.min(10, prev.unoPenaltyCount + 2) }))} className="w-8 h-8 bg-slate-700 rounded text-white">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleCustomStart} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                                        CONFIRM
                                    </button>
                                    <button onClick={() => setMenuView('modes')} className="w-full mt-2 text-white/40 hover:text-white text-sm">Cancel</button>
                                </motion.div>
                            )}

                            {/* 5. Player Count Selection */}
                            {menuView === 'players' && (
                                <motion.div
                                    key="players"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="w-full grid gap-4 px-4"
                                >
                                    <h3 className="text-white/70 text-center mb-2 tracking-widest text-sm font-bold uppercase">
                                        {selectedRules.modeName} - Select Players
                                    </h3>
                                    <button onClick={() => handleStartGame(2)} className="bg-gradient-to-r from-blue-900/80 to-slate-900/80 border border-blue-500/30 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-between group hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                        <span className="flex items-center gap-3"><User className="text-blue-400" /> VS <Cpu className="text-red-400" /></span>
                                        <span className="text-sm bg-black/40 px-2 py-1 rounded text-blue-200">1 v 1</span>
                                    </button>
                                    <button onClick={() => handleStartGame(3)} className="bg-gradient-to-r from-purple-900/80 to-slate-900/80 border border-purple-500/30 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-between group hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                        <span className="flex items-center gap-3"><Users className="text-purple-400" /> CLASSIC</span>
                                        <span className="text-sm bg-black/40 px-2 py-1 rounded text-purple-200">3 PLAYERS</span>
                                    </button>
                                    <button onClick={() => handleStartGame(4)} className="bg-gradient-to-r from-pink-900/80 to-slate-900/80 border border-pink-500/30 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-between group hover:border-pink-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                                        <span className="flex items-center gap-3"><Users className="text-pink-400" /> CHAOS</span>
                                        <span className="text-sm bg-black/40 px-2 py-1 rounded text-pink-200">4 PLAYERS</span>
                                    </button>

                                    <button onClick={() => setMenuView(selectedRules.modeName === 'Custom' ? 'custom' : 'modes')} className="mt-2 text-white/40 hover:text-white text-sm flex items-center justify-center gap-1 transition-colors">
                                        <ChevronLeft size={14} /> BACK
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    // --- GAME RENDERING (Playing / Game Over) ---

    const humanPlayer = gameState.players[0];
    const opponents = gameState.players.slice(1);
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const isDealing = gameState.status === GameStatus.DEALING;
    const isPlayerTurn = gameState.currentPlayerIndex === humanPlayer.id && !gameState.winner && !isDealing;

    return (
        <motion.div
            animate={shake ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } : {}}
            className={`min-h-screen relative overflow-hidden transition-colors duration-1000 ease-in-out
        ${gameState.activeColor === CardColor.RED ? 'bg-red-950' :
                    gameState.activeColor === CardColor.BLUE ? 'bg-blue-950' :
                        gameState.activeColor === CardColor.GREEN ? 'bg-green-950' : 'bg-yellow-950'}
    `}>
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />

            {/* Turn Indicator: Ambient Screen Glow */}
            <AnimatePresence>
                {isPlayerTurn && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-yellow-500/30 via-yellow-500/5 to-transparent pointer-events-none z-0"
                    />
                )}
            </AnimatePresence>

            {isDealing && <DealingAnimation totalPlayers={gameState.players.length} getPlayerPos={getPlayerScreenPosition} />}

            <EffectOverlay type={lastEffect} />
            <DirectionIndicator direction={gameState.direction} />

            {/* Projectiles */}
            {projectiles.map(p => (
                <FlyingCard
                    key={p.id}
                    startX={p.startX}
                    startY={p.startY}
                    endX={p.endX}
                    endY={p.endY}
                    delay={p.delay}
                    color={p.color}
                />
            ))}

            {/* Top UI Bar */}
            <div className="absolute top-0 left-0 right-0 p-3 md:p-6 flex justify-between items-start z-10 text-white/80 pointer-events-none">
                {/* Settings Button */}
                <div className="pointer-events-auto flex gap-2">
                    <button onClick={() => setSettingsOpen(true)} className="p-2 bg-black/30 rounded-full border border-white/10 text-white/70 hover:text-white backdrop-blur-md">
                        <Settings size={20} />
                    </button>
                    {/* Mode Indicator */}
                    <div className="px-3 py-1 bg-black/30 rounded-full border border-white/10 text-xs flex items-center text-white/50">
                        {gameState.rules.modeName} Mode
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 animate-pulse text-sm md:text-lg shadow-lg">
                    Turn: <span className="font-bold text-yellow-400">{gameState.players[gameState.currentPlayerIndex].name}</span>
                </div>
            </div>

            {/* Draw Pile - Top Left Corner with Stack Effect */}
            {!isDealing && (
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-32 md:left-12 z-30 pointer-events-none opacity-0 md:opacity-100">
                    <div className="relative group cursor-pointer pointer-events-auto" onClick={humanDrawCard}>
                        {/* Visual Stack Cards (Background) */}
                        <div className="absolute top-0 left-0 bg-white border border-gray-400 rounded-lg md:rounded-xl w-20 sm:w-24 md:w-28 lg:w-32 h-28 sm:h-36 md:h-40 lg:h-48 transform -rotate-6 translate-x-2 translate-y-2 opacity-60 shadow-sm" />
                        <div className="absolute top-0 left-0 bg-white border border-gray-400 rounded-lg md:rounded-xl w-20 sm:w-24 md:w-28 lg:w-32 h-28 sm:h-36 md:h-40 lg:h-48 transform -rotate-3 translate-x-1 translate-y-1 opacity-80 shadow-sm" />

                        {/* Main Deck Card */}
                        <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                            <Card card={{ id: 'deck', color: CardColor.WILD, type: CardType.NUMBER, score: 0 }} isHidden hoverEffect={false} />
                        </motion.div>

                        {/* Label */}
                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2">
                            <span className="bg-black/70 px-3 py-1.5 rounded-full text-white font-bold text-[10px] md:text-xs tracking-[0.15em] border border-white/20 whitespace-nowrap shadow-xl backdrop-blur-sm">
                                DRAW CARD
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Draw Pile for Mobile */}
            {!isDealing && (
                <div className="md:hidden absolute top-24 left-6 z-30 scale-125 origin-top-left">
                    <div className="relative group cursor-pointer" onClick={humanDrawCard}>
                        <motion.div whileTap={{ scale: 0.95 }}>
                            <Card card={{ id: 'deck-mobile', color: CardColor.WILD, type: CardType.NUMBER, score: 0 }} isHidden isSmall hoverEffect={false} />
                        </motion.div>
                        <div className="absolute top-full mt-1 left-0">
                            <span className="bg-black/70 px-2 py-0.5 rounded text-white font-bold text-[8px] border border-white/20 whitespace-nowrap">
                                DRAW
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Opponents */}
            {opponents.map((player, idx) => {
                const config = getOpponentConfig(idx, gameState.players.length);
                const isActive = gameState.currentPlayerIndex === player.id;
                const cardCount = player.hand.length;
                const isUno = cardCount === 1;

                return (
                    <div key={player.id} className={config.wrapperClass}>
                        <motion.div
                            animate={{ scale: isActive ? 1.15 : 1, opacity: isActive ? 1 : 0.7 }}
                            className={`flex flex-col items-center ${config.infoClass}`}
                        >
                            <div className="relative mb-1.5">
                                <div className={`w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl border-4 transition-colors duration-300 ${isActive ? 'bg-yellow-500 border-white animate-pulse' : 'bg-slate-700 border-slate-600'}`}>
                                    <Cpu className="text-white w-1/2 h-1/2" strokeWidth={2.5} />
                                </div>

                                {/* Card Count Badge */}
                                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-slate-900 text-cyan-400 border border-cyan-500/50 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-xs md:text-sm shadow-[0_0_10px_rgba(6,182,212,0.4)] z-20">
                                    {cardCount}
                                </div>

                                {/* UNO Indicator */}
                                <AnimatePresence>
                                    {isUno && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full border border-white shadow-[0_0_15px_rgba(220,38,38,0.8)] z-30 animate-bounce whitespace-nowrap"
                                        >
                                            UNO!
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <span className="text-white font-bold text-xs md:text-base bg-black/50 px-3 py-0.5 rounded-full border border-white/10">{player.name}</span>
                        </motion.div>
                        <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center" style={{ transform: `rotate(${config.handRotation}deg)` }}>
                            <div className="absolute flex -space-x-8 md:-space-x-10">
                                {/* Hide real cards during dealing */}
                                <AnimatePresence>
                                    {!isDealing && player.hand.map((card, i) => (
                                        <motion.div
                                            key={card.id}
                                            layoutId={card.id}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 0.6, rotate: (i - player.hand.length / 2) * 5, y: Math.abs(i - player.hand.length / 2) * 2 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            style={{ zIndex: i }}
                                            className="shadow-md"
                                        >
                                            <Card card={card} isHidden isSmall hoverEffect={false} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Board - Center Area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="relative flex items-center justify-center pointer-events-auto">
                    <div className="relative w-20 h-28 sm:w-24 sm:h-36 md:w-32 md:h-48 flex items-center justify-center z-10">
                        <AnimatePresence mode='popLayout'>
                            {/* Only show discard pile if not dealing (or just first card) */}
                            {!isDealing && gameState.discardPile.slice(-5).map((card, i) => (
                                <motion.div
                                    key={card.id}
                                    layoutId={card.id}
                                    className="absolute"
                                    style={{ zIndex: i, marginTop: i === 4 ? 0 : (i * 1.5), rotate: `${(i - 2) * 4}deg` }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                >
                                    <Card card={card} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Message Toast */}
            <div className="absolute top-20 sm:top-24 md:top-32 left-0 right-0 flex justify-center items-center pointer-events-none z-20">
                <AnimatePresence mode='wait'>
                    <motion.p
                        key={gameState.lastActionMessage}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="text-white font-bold bg-black/60 px-5 py-2 md:px-8 md:py-3 rounded-2xl backdrop-blur-sm border border-white/10 text-xs md:text-lg text-center shadow-2xl max-w-[90%]"
                    >
                        {gameState.lastActionMessage}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Player Hand - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-40 h-[180px] sm:h-[220px] md:h-[280px] flex justify-center items-end pb-4 md:pb-8 overflow-visible pointer-events-none">

                {/* Turn Indicator */}
                {isPlayerTurn && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 text-yellow-400 font-black tracking-[0.2em] animate-bounce z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-xs md:text-lg uppercase"
                    >
                        YOUR TURN
                    </motion.div>
                )}

                {/* UNO BUTTON - Neon style */}
                <AnimatePresence>
                    {isPlayerTurn && humanPlayer.hand.length === 2 && !gameState.winner && (
                        <motion.button
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{
                                scale: 1,
                                rotate: 0,
                                boxShadow: isUnoCalled
                                    ? "0 0 20px #39ff14, 0 0 40px #39ff14"
                                    : ["0 0 0px #ff0000", "0 0 20px #ff0000", "0 0 0px #ff0000"]
                            }}
                            exit={{ scale: 0, rotate: 20 }}
                            transition={{
                                boxShadow: { duration: 1, repeat: Infinity }
                            }}
                            onClick={callUno}
                            className={`pointer-events-auto absolute bottom-[180px] md:bottom-[240px] right-4 md:right-16 z-50 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 font-black italic text-xl md:text-2xl transform active:scale-95 transition-transform ${isUnoCalled ? 'bg-[#39ff14] border-white text-black' : 'bg-red-600 border-yellow-400 text-white'}`}
                        >
                            {isUnoCalled ? "CALLED!" : "UNO!"}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* UNO Alert for Player (Status) */}
                <AnimatePresence>
                    {humanPlayer.hand.length === 1 && !gameState.winner && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: [-5, 5, -5] }}
                            exit={{ scale: 0 }}
                            transition={{ rotate: { duration: 0.2, repeat: Infinity } }}
                            className="absolute bottom-[200px] md:bottom-[280px] left-1/2 ml-[60px] md:ml-[100px] z-50 pointer-events-auto"
                        >
                            <div className="bg-red-600 text-white font-black text-2xl md:text-4xl px-4 py-2 rounded-xl border-4 border-white shadow-[0_0_30px_rgba(220,38,38,0.6)] transform rotate-12 flex items-center gap-2">
                                <AlertTriangle className="fill-yellow-400 text-yellow-400" />
                                UNO!
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex justify-center items-end w-full max-w-[100vw] px-2 pointer-events-auto">
                    <div className="relative h-[150px] sm:h-[200px] md:h-[240px] flex items-end justify-center perspective-1000">
                        <AnimatePresence>
                            {!isDealing && humanPlayer.hand.map((card, index) => {
                                const total = humanPlayer.hand.length;
                                const isMobile = windowWidth < 768;

                                // Fan Logic
                                const center = (total - 1) / 2;
                                const distFromCenter = index - center;
                                const rotation = distFromCenter * 3;

                                // Lift Logic
                                let baseLift = isMobile ? -30 : -20;
                                if (isMobile && total > 5) baseLift = -50;
                                if (isMobile && total > 10) baseLift = -70;

                                const yOffset = baseLift + Math.abs(distFromCenter) * (isMobile ? 3 : 5);

                                // Width/Overlap Logic
                                const availableWidth = isMobile ? windowWidth - 20 : 800;
                                let marginLeft = isMobile ? -30 : -40;
                                if (total * 40 > availableWidth) marginLeft = -50;
                                if (total * 30 > availableWidth) marginLeft = -60;
                                const maxOverlap = isMobile ? -65 : -80;
                                marginLeft = Math.max(marginLeft, maxOverlap);

                                const isPlayable = gameState.currentPlayerIndex === humanPlayer.id && !gameState.winner &&
                                    (card.type === 'wild' || card.type === 'wild_draw_four' ||
                                        gameState.activeColor === card.color ||
                                        (card.value !== undefined && card.value === topCard.value) ||
                                        (card.type === topCard.type && card.type !== 'number'));

                                // DRAW ANIMATION CONFIG
                                const deckPos = getDeckPosition();
                                const handCenterX = windowWidth / 2;
                                const handCenterY = window.innerHeight - 100; // Approx bottom area
                                const drawStartX = deckPos.x - handCenterX;
                                const drawStartY = deckPos.y - handCenterY;

                                return (
                                    <motion.div
                                        key={card.id}
                                        layoutId={card.id}
                                        initial={{ x: drawStartX, y: drawStartY, opacity: 0, scale: 0.2, rotate: 180 }}
                                        animate={{
                                            x: 0,
                                            y: yOffset,
                                            rotate: rotation,
                                            scale: isPlayable ? [1, 1.1, 1] : 1, // Increased scale range
                                            opacity: 1,
                                            marginLeft: index === 0 ? 0 : marginLeft,
                                            zIndex: index,
                                            filter: isPlayable ? "drop-shadow(0 0 15px rgba(250,204,21,0.8)) brightness(1.1)" : "brightness(0.5) grayscale(0.5)" // More contrast
                                        }}
                                        whileHover={{
                                            y: yOffset - 40,
                                            rotate: 0,
                                            zIndex: 100,
                                            scale: 1.2,
                                            marginLeft: index === 0 ? 0 : marginLeft + 30,
                                            filter: "drop-shadow(0 0 15px rgba(255,255,255,0.4))"
                                        }}
                                        whileTap={{
                                            y: yOffset - 40,
                                            scale: 1.15,
                                            zIndex: 100,
                                            rotate: 0
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 260,
                                            damping: 20,
                                            mass: 1,
                                            scale: isPlayable ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined
                                        }}
                                        className={`relative origin-bottom ${!isPlayable ? 'brightness-50 grayscale-[0.3]' : 'cursor-pointer hover:brightness-110'}`}
                                    >
                                        <Card card={card} isPlayable={isPlayable} onClick={() => humanPlayCard(card)} hoverEffect={false} />

                                        {/* Playable Indicator Arrow/Dot */}
                                        {isPlayable && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 0 }}
                                                animate={{ opacity: 1, y: -15 }}
                                                transition={{
                                                    y: { duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                                                }}
                                                className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50"
                                            >
                                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {wildPickerOpen && <ColorPicker onSelect={humanSelectWildColor} />}

            {/* Settings Modal - Moved to root level */}
            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onUpdate={updateSetting} />

            {/* Redesigned Win Screen */}
            {gameState.status === GameStatus.GAME_OVER && (
                <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center backdrop-blur-xl p-4">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(255,255,255,0.1)] max-w-sm w-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full"
                                />
                                <div className="relative bg-yellow-500 rounded-full p-4 md:p-5 shadow-lg">
                                    <Crown size={32} className="text-white md:w-12 md:h-12" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-xs md:text-sm font-bold tracking-[0.3em] text-yellow-400 uppercase mb-2">Victory</h2>
                        <h3 className="text-2xl md:text-4xl font-black text-white mb-2">{gameState.winner?.name}</h3>
                        <p className="text-slate-400 mb-6 md:mb-10 font-light text-sm md:text-base">The champion of the Neon Arena!</p>

                        <button
                            onClick={handleRestart}
                            className="w-full bg-white text-slate-950 font-black py-3 md:py-4 rounded-2xl text-base md:text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                        >
                            <RotateCcw size={18} className="md:w-5 md:h-5 group-hover:rotate-180 transition-transform duration-500" />
                            PLAY AGAIN
                        </button>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}