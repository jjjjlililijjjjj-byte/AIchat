import { useEffect, useState, useRef } from 'react';
import { db, ChatMessage, Character, Group } from '../lib/db';
import { GoogleGenAI } from '@google/genai';
import { ChevronLeft, Plus, Smile, Settings as SettingsIcon, Users, Mic, MicOff, Image as ImageIcon, Search, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleImageUpload } from '../lib/utils';

export default function GroupChatView({ groupId, onBack, setIsAiProcessing, isAiProcessing }: { groupId: number, onBack: () => void, setIsAiProcessing: (is: boolean) => void, isAiProcessing: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Character[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userAvatar, setUserAvatar] = useState('https://picsum.photos/seed/user/100/100');
  const [globalBackground, setGlobalBackground] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, messageId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    messageId: null
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await db.settings.get('user_settings');
      if (settings?.globalBackground) setGlobalBackground(settings.globalBackground);
      if (settings?.userAvatar) setUserAvatar(settings.userAvatar);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const g = await db.groups.get(groupId);
      if (g) {
        setGroup(g);
        const chars = await db.characters.where('id').anyOf(g.characterIds).toArray();
        setParticipants(chars);
      }

      const msgs = await db.messages.where({ groupId }).toArray();
      setMessages(msgs);
      
      if (msgs.some(m => !m.read)) {
        await db.messages.where({ groupId }).modify({ read: true });
      }
    };
    fetchData();
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages]);

  const handleUpdateGroup = async (newName: string, newAvatar: string) => {
    if (!group?.id) return;
    const updated = { ...group, name: newName, avatar: newAvatar };
    await db.groups.update(group.id, updated);
    setGroup(updated);
  };

  const handleSend = async () => {
    if (!input.trim() || !group) return;
    
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('请先在“我”页面配置 API 秘钥！');
      return;
    }

    const userMsg: ChatMessage = { 
      groupId, 
      text: input, 
      sender: 'user', 
      timestamp: Date.now(), 
      read: true,
      quote: replyingTo ? {
        text: replyingTo.text,
        sender: replyingTo.sender,
        senderName: replyingTo.sender === 'user' ? '我' : (participants.find(p => p.id === replyingTo.characterId)?.name || '未知')
      } : undefined
    };
    const userMsgId = await db.messages.add(userMsg);
    let currentMessages = [...messages, { ...userMsg, id: Number(userMsgId) }];
    setMessages(currentMessages);
    const currentInput = input;
    setInput('');
    setReplyingTo(null);
    setIsAiProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '' });
      
      // Pick 1-2 random participants to respond
      const responderCount = Math.min(participants.length, Math.floor(Math.random() * 2) + 1);
      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      const responders = shuffled.slice(0, responderCount);

      for (const char of responders) {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

        const context = `你现在是${char.name}，在一个名为"${group.name}"的群聊中。群成员有：${participants.map(p => p.name).join(', ')}。${char.worldview}。请用简短、口语化的中文回复。不要带任何格式，直接输出对话内容。`;
        const history = currentMessages.slice(-10).map(m => {
          const senderName = m.sender === 'user' ? '用户' : (participants.find(p => p.id === m.characterId)?.name || '未知');
          return `${senderName}: ${m.text}`;
        }).join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `${context}\n对话历史：\n${history}\n用户：${currentInput}\n${char.name}的回复：`,
        });

        const text = response.text || '...';
        const aiMsg: ChatMessage = { groupId, characterId: char.id, text, sender: 'ai', timestamp: Date.now(), read: true };
        const aiMsgId = await db.messages.add(aiMsg);
        const newAiMsg = { ...aiMsg, id: Number(aiMsgId) };
        currentMessages = [...currentMessages, newAiMsg];
        setMessages(currentMessages);
      }
    } catch (error) {
      console.error("Group AI Processing Error:", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSendImage = async (imageUrl: string) => {
    if (!group) return;
    
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('请先在“我”页面配置 API 秘钥！');
      return;
    }

    const userMsg: ChatMessage = { 
      groupId, 
      text: '[图片]', 
      image: imageUrl,
      sender: 'user', 
      timestamp: Date.now(), 
      read: true
    };
    const userMsgId = await db.messages.add(userMsg);
    let currentMessages = [...messages, { ...userMsg, id: Number(userMsgId) }];
    setMessages(currentMessages);
    setIsAiProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '' });
      
      // Pick 1 random participant to respond to the image
      const responderCount = 1;
      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      const responders = shuffled.slice(0, responderCount);

      for (const char of responders) {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

        const aiMsg: ChatMessage = { groupId, characterId: char.id, text: '收到图片啦！', sender: 'ai', timestamp: Date.now(), read: true };
        const aiMsgId = await db.messages.add(aiMsg);
        const newAiMsg = { ...aiMsg, id: Number(aiMsgId) };
        currentMessages = [...currentMessages, newAiMsg];
        setMessages(currentMessages);
      }
    } catch (error) {
      console.error("Group AI Processing Error:", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('不支持语音识别');
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        console.warn('Speech recognition: no speech detected.');
      } else {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-[#EDEDED]">
      <div className="absolute inset-0 z-0 opacity-30">
        <img src={globalBackground || "https://picsum.photos/seed/group-bg/800/1200?blur=10"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>

      {/* Header */}
      <div className="glass h-14 border-b border-black/5 flex items-center px-4 z-20 sticky top-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-[16px] font-bold text-slate-900 leading-tight">
              {group?.name} ({participants.length})
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {isAiProcessing ? '有人正在输入...' : '群聊中'}
          </span>
        </div>

        <button onClick={() => setShowSettings(true)} className="p-2 -mr-2 hover:bg-black/5 rounded-full transition-colors">
          <SettingsIcon className="w-5 h-5 text-slate-800" />
        </button>
      </div>

      {/* Sidebar Settings */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-[#F7F7F7] z-50 shadow-2xl flex flex-col"
            >
              <div className="bg-white px-4 h-14 flex items-center justify-between border-b border-black/5">
                <h3 className="text-[17px] font-bold text-slate-900">群聊设置</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6 text-slate-700 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Search Chat History */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-black/5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[13px] font-bold text-slate-800">搜索聊天记录</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F2F2F2] rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        if (e.target.value) setIsSearching(true);
                        else setIsSearching(false);
                      }}
                      placeholder="输入关键词..."
                      className="bg-transparent border-none outline-none text-[13px] w-full text-slate-700 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button onClick={() => { setSearchQuery(''); setIsSearching(false); }} className="p-1">
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">群信息</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 px-1">群名称</label>
                      <input 
                        type="text" 
                        value={group?.name || ''} 
                        onChange={(e) => handleUpdateGroup(e.target.value, group?.avatar || '')}
                        className="w-full p-3 bg-[#F7F7F7] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 px-1">群头像 URL</label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleImageUpload((url) => handleUpdateGroup(group?.name || '', url))}
                          className="p-3 bg-[#F7F7F7] text-slate-500 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
                        >
                          <Upload className="w-5 h-5" />
                        </button>
                        <input 
                          type="text" 
                          value={group?.avatar || ''} 
                          onChange={(e) => handleUpdateGroup(group?.name || '', e.target.value)}
                          className="w-full p-3 bg-[#F7F7F7] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">群成员 ({participants.length})</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {participants.map(p => (
                      <div key={p.id} className="flex flex-col items-center gap-1">
                        <img src={p.avatar} className="w-12 h-12 rounded-lg object-cover border border-black/5" referrerPolicy="no-referrer" />
                        <span className="text-[10px] text-slate-500 truncate w-full text-center">{p.name}</span>
                      </div>
                    ))}
                    <button className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:bg-slate-50 transition-colors">
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={async () => {
                      if (confirm('确定要清空群聊天记录吗？')) {
                        await db.messages.where({ groupId }).delete();
                        setMessages([]);
                        setShowSettings(false);
                      }
                    }}
                    className="w-full py-4 bg-white text-red-500 rounded-2xl font-bold text-[15px] border border-red-100 active:bg-red-50 transition-colors shadow-sm"
                  >
                    清空聊天记录
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 z-10" 
        ref={scrollRef}
        onClick={() => setContextMenu({ ...contextMenu, visible: false })}
      >
        {messages.filter(m => !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase())).map((msg, idx) => {
          const char = participants.find(p => p.id === msg.characterId);
          const showName = msg.sender === 'ai';
          
          return (
            <div key={msg.id || idx} className={`flex ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5 mb-4`}>
              <img 
                src={msg.sender === 'user' ? userAvatar : char?.avatar} 
                className="w-10 h-10 rounded-lg object-cover border border-black/5 shadow-sm" 
                referrerPolicy="no-referrer"
              />
              <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[70%]`}>
                {showName && (
                  <span className="text-[11px] text-slate-500 mb-1 ml-1">{char?.name}</span>
                )}
                <div 
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const container = e.currentTarget.closest('.flex-1.overflow-y-auto');
                    const rect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
                    setContextMenu({
                      visible: true,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      messageId: msg.id || null
                    });
                  }}
                  className={`py-2 px-3 rounded-xl text-[15px] leading-snug shadow-sm cursor-pointer select-none ${
                    msg.sender === 'user' ? 'bg-[#007AFF] text-white' : 'bg-white text-slate-900'
                  }`}
                >
                  {msg.quote && (
                    <div className={`text-xs p-1.5 rounded mb-1.5 border-l-2 line-clamp-2 ${msg.sender === 'user' ? 'bg-white/20 border-white/40 text-white/90' : 'bg-black/5 border-black/20 text-slate-500'}`}>
                      {msg.quote.senderName}: {msg.quote.text}
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ 
              position: 'absolute', 
              left: Math.min(contextMenu.x, window.innerWidth > 390 ? 390 - 120 : window.innerWidth - 120), 
              top: Math.min(contextMenu.y, window.innerHeight > 844 ? 844 - 60 : window.innerHeight - 60),
              zIndex: 100 
            }}
            className="bg-white/90 backdrop-blur-md border border-black/5 rounded-xl shadow-2xl overflow-hidden min-w-[100px]"
          >
            <button 
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.messageId);
                if (msg) setReplyingTo(msg);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full px-4 py-3 text-sm text-slate-700 hover:bg-black/5 flex items-center gap-2 transition-colors border-b border-black/5"
            >
              回复
            </button>
            {messages.find(m => m.id === contextMenu.messageId)?.sender === 'user' && (
              <button 
                onClick={async () => {
                  if (contextMenu.messageId) {
                    await db.messages.update(contextMenu.messageId, { isRecalled: true, text: '消息已撤回' });
                    setMessages(prev => prev.map(m => m.id === contextMenu.messageId ? { ...m, isRecalled: true, text: '消息已撤回' } : m));
                  }
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full px-4 py-3 text-sm text-slate-700 hover:bg-black/5 flex items-center gap-2 transition-colors"
              >
                撤回消息
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="bg-[#F7F7F7] border-t border-black/5 p-3 safe-pb z-20 flex flex-col">
        {replyingTo && (
          <div className="flex items-center justify-between bg-black/5 rounded-lg px-3 py-1.5 mb-2 text-xs text-slate-500">
            <span className="truncate flex-1">
              回复 {replyingTo.sender === 'user' ? '我' : (participants.find(p => p.id === replyingTo.characterId)?.name || '未知')}: {replyingTo.text}
            </span>
            <button onClick={() => setReplyingTo(null)} className="ml-2 p-1 hover:bg-black/10 rounded-full">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => handleImageUpload(handleSendImage)} className="p-1.5 rounded-full text-slate-600 hover:bg-black/5 transition-colors">
            <ImageIcon className="w-6 h-6" />
          </button>
          <button onClick={toggleListening} className={`p-1.5 rounded-full ${isListening ? 'text-red-500' : 'text-slate-600 hover:bg-black/5 transition-colors'}`}>
            <Mic className="w-6 h-6" />
          </button>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="发送消息..."
            className="flex-1 bg-white border border-black/5 rounded-lg px-3 py-2 text-[15px] outline-none"
          />
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-slate-600">
            <Smile className="w-6 h-6" />
          </button>
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${input.trim() ? 'bg-[#007AFF] text-white' : 'bg-slate-200 text-slate-400'}`}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
