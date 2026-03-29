import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

export default function MusicPlayer({ title, artist, isPlaying }: { title: string, artist: string, isPlaying: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-14 left-4 right-4 z-40 bg-white/70 backdrop-blur-lg border border-white/50 rounded-full px-4 py-2 flex items-center gap-3 shadow-lg"
    >
      <motion.div 
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden"
      >
        <Music className="w-4 h-4 text-slate-500" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#4C4C4C] truncate">{title}</div>
        <div className="text-xs text-[#4C4C4C]/70 truncate">{artist}</div>
      </div>
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3].map(i => (
          <motion.div 
            key={i}
            animate={{ height: isPlaying ? [10, 16, 8, 14, 10] : 4 }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            className="w-1 bg-[#007AFF] rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}
