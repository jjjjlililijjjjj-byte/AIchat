import { motion } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Share2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function NetEaseMusicPlayer({ song, onClose }: { song: { title: string, url: string }, onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const audio = new Audio(song.url);
    audioRef.current = audio;

    // Basic URL validation check (very simple)
    if (!song.url || song.url.includes('music.163.com')) {
      console.warn("Invalid audio source or webpage URL provided:", song.url);
      setIsPlaying(false);
      return;
    }

    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (isMounted) setIsPlaying(true);
        })
        .catch(error => {
          if (isMounted) {
            console.error("Playback failed:", error);
            setIsPlaying(false);
          }
        });
    }

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [song.url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.error("Resume playback failed", e));
        setIsPlaying(true);
      }
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col w-full h-full"
    >
      {/* Background Blur */}
      <div className="absolute inset-0 bg-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 opacity-90" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 text-white">
        <button onClick={onClose}><ChevronDown className="w-8 h-8" /></button>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold">{song.title}</span>
          <span className="text-xs opacity-70">一人之下</span>
        </div>
        <Share2 className="w-6 h-6" />
      </div>

      {/* Disc Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-72 h-72 rounded-full bg-black border-8 border-slate-700 flex items-center justify-center shadow-2xl"
        >
          <div className="w-48 h-48 rounded-full bg-slate-500 flex items-center justify-center text-white text-4xl font-bold">
            ♪
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="relative z-10 p-6 space-y-6 text-white shrink-0">
        <div className="flex justify-between items-center text-sm opacity-80">
          <span>0:00</span>
          <div className="flex-1 h-1 bg-white/30 mx-4 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-white" />
          </div>
          <span>3:45</span>
        </div>
        
        <div className="flex justify-between items-center px-4">
          <SkipBack className="w-8 h-8" />
          <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center">
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          <SkipForward className="w-8 h-8" />
        </div>
      </div>
    </motion.div>
  );
}
