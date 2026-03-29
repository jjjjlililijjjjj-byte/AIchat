/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, Compass, User, Signal, Battery, Wifi, Cloud, ChevronRight, Search } from 'lucide-react';
import { db, ChatMessage } from './lib/db';
import { GoogleGenAI } from '@google/genai';
import ChatList from './components/ChatList';
import ChatView from './components/ChatView';
import GroupChatView from './components/GroupChatView';
import Contacts from './components/Contacts';
import Settings from './components/Settings';
import Moments from './components/Moments';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    return apiKey ? 'chats' : 'settings';
  });
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showMoments, setShowMoments] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Random character chat initiation
  useEffect(() => {
    const randomChatTimer = setInterval(async () => {
      const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      if (!apiKey) return;

      // 10% chance every 2 minutes (120000ms) to trigger a random message
      if (Math.random() > 0.1) return;

      try {
        const characters = await db.characters.toArray();
        if (characters.length === 0) return;

        // Pick a random character
        const char = characters[Math.floor(Math.random() * characters.length)];

        // Generate a random greeting/message
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `你现在是${char.name}，${char.worldview}。请主动给我发一条简短的微信消息（20字以内），像朋友一样找我聊天，不要带任何格式。`,
        });

        const text = response.text || '在干嘛呢？';
        
        const aiMsg: ChatMessage = {
          characterId: char.id!,
          text: text,
          sender: 'ai',
          timestamp: Date.now(),
          read: false
        };
        await db.messages.add(aiMsg);
        
        // Optionally show a notification if not in that chat
        if (selectedChatId !== char.id) {
          console.log(`New message from ${char.name}: ${text}`);
        }
      } catch (e) {
        console.error("Random chat error:", e);
      }
    }, 120000); // Check every 2 minutes

    return () => clearInterval(randomChatTimer);
  }, [selectedChatId]);

  useEffect(() => {
    const initDb = async () => {
      const count = await db.characters.count();
      if (count === 0) {
        await db.characters.bulkAdd([
          {
            name: '王也',
            avatar: 'https://picsum.photos/seed/wangye/200/200',
            worldview: '《一人之下》中的角色，武当派弟子，八奇技之一风后奇门的继承人。性格懒散但实力极强，看透世事。',
            tags: ['道士', '慵懒', '风后奇门'],
            regexRules: [{ match: '我', replace: '小道' }],
            mandatorySuffix: '，您看这事儿闹的。'
          },
          {
            name: '苏沐橙',
            avatar: 'https://picsum.photos/seed/sumucheng/200/200',
            worldview: '《全职高手》中的职业选手，号称第一枪炮师。性格温柔体贴，但比赛中极具攻击性。',
            tags: ['电竞', '温柔', '枪炮师']
          }
        ]);
      } else {
        // If characters already exist, ensure no duplicates of '王也'
        const wangye = await db.characters.where('name').equals('王也').toArray();
        if (wangye.length > 1) {
          const idsToDelete = wangye.slice(1).map(c => c.id!);
          await db.characters.bulkDelete(idsToDelete);
        }
      }
    };
    initDb();
  }, []);

  const renderContent = () => {
    if (showMoments) {
      return <Moments onBack={() => setShowMoments(false)} />;
    }

    if (selectedChatId) {
      return (
        <ChatView 
          characterId={selectedChatId} 
          onBack={() => setSelectedChatId(null)} 
          setIsAiProcessing={setIsAiProcessing}
          isAiProcessing={isAiProcessing}
        />
      );
    }

    if (selectedGroupId) {
      return (
        <GroupChatView 
          groupId={selectedGroupId} 
          onBack={() => setSelectedGroupId(null)} 
          setIsAiProcessing={setIsAiProcessing}
          isAiProcessing={isAiProcessing}
        />
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-1 overflow-hidden"
        >
          {activeTab === 'chats' && <ChatList onSelectChat={setSelectedChatId} onSelectGroup={setSelectedGroupId} />}
          {activeTab === 'contacts' && <Contacts onSelectCharacter={(id) => { setSelectedChatId(id); setActiveTab('chats'); }} onSelectGroup={(id) => { setSelectedGroupId(id); setActiveTab('chats'); }} />}
          {activeTab === 'moments' && <Moments onBack={() => setActiveTab('chats')} isTabMode={true} />}
          {activeTab === 'settings' && <Settings />}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center sm:p-4 font-sans overflow-hidden">
      {/* Phone Mockup */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-white sm:rounded-[55px] sm:shadow-[0_0_0_12px_#333,0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col sm:border-[8px] sm:border-black">
        
        {/* Status Bar */}
        <div className="safe-pt py-2 flex items-center justify-between px-8 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
          <span className="text-[14px] font-bold text-slate-900">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 text-slate-900" />
            <Wifi className="w-3.5 h-3.5 text-slate-900" />
            <Battery className="w-4 h-4 text-slate-900" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {renderContent()}
        </div>

        {/* Navigation Bar */}
        {!selectedChatId && !selectedGroupId && (
          <div className="glass pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 border-t border-black/5 flex items-center justify-around px-2 z-40">
            <NavButton 
              active={activeTab === 'chats'} 
              onClick={() => { setActiveTab('chats'); setSelectedChatId(null); }} 
              icon={<MessageSquare className="w-6 h-6" />} 
              label="聊天" 
            />
            <NavButton 
              active={activeTab === 'contacts'} 
              onClick={() => setActiveTab('contacts')} 
              icon={<Users className="w-6 h-6" />} 
              label="联系人" 
            />
            <NavButton 
              active={activeTab === 'moments'} 
              onClick={() => setActiveTab('moments')} 
              icon={<Compass className="w-6 h-6" />} 
              label="圈子" 
            />
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
              icon={<User className="w-6 h-6" />} 
              label="我" 
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-[#007AFF]' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className={`p-1 rounded-xl transition-all ${active ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
}
