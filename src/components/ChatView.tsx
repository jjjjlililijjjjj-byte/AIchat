import { useEffect, useState, useRef } from 'react';
import { db, ChatMessage, Character, UserSettings } from '../lib/db';
import { generateAIResponse } from '../lib/api';
import { ChevronLeft, Plus, Smile, Settings as SettingsIcon, Sliders, Book, Filter, Cloud, Mic, MicOff, Palette, Image as ImageIcon, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleImageUpload } from '../lib/utils';

export default function ChatView({ characterId, onBack, setIsAiProcessing, isAiProcessing }: { characterId: number, onBack: () => void, setIsAiProcessing: (is: boolean) => void, isAiProcessing: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memoryDepth, setMemoryDepth] = useState(5);
  const [worldbookEnabled, setWorldbookEnabled] = useState(true);
  const [regexEnabled, setRegexEnabled] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState('在线');

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, messageId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    messageId: null
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editWorldview, setEditWorldview] = useState('');
  const [editOpening, setEditOpening] = useState('');
  const [editBackground, setEditBackground] = useState('');
  const [globalBackground, setGlobalBackground] = useState('');
  const [userAvatar, setUserAvatar] = useState('https://picsum.photos/seed/user/100/100');
  const [longMemory, setLongMemory] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await db.settings.get('user_settings');
      if (settings?.globalBackground) {
        setGlobalBackground(settings.globalBackground);
      }
      if (settings?.userAvatar) {
        setUserAvatar(settings.userAvatar);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const statuses = ['在线', '正在修行...', '发呆中', '听歌中', '忙碌', '信号不佳', '正在思考人生', '隐身'];
    setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
  }, [characterId]);

  useEffect(() => {
    const fetchMessages = async () => {
      const msgs = await db.messages.where({ characterId }).toArray();
      setMessages(msgs);
      
      // Mark all unread messages as read when opening the chat
      if (msgs.some(m => !m.read)) {
        await db.messages.where({ characterId }).modify({ read: true });
      }

      const char = await db.characters.get(characterId);
      if (char) {
        setCharacter(char);
        setEditName(char.name);
        setEditAvatar(char.avatar);
        setEditWorldview(char.worldview);
        setEditOpening(char.openingMessage || '');
        setEditBackground(char.background || '');
        setLongMemory(char.longMemory || false);
      }
    };
    fetchMessages();
  }, [characterId]);

  useEffect(() => {
    if (scrollRef.current) {
      // Use a small timeout to ensure DOM has updated
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages]);

  const handleUpdateCharacter = async () => {
    if (!character?.id) return;
    const updated = {
      ...character,
      name: editName,
      avatar: editAvatar,
      worldview: editWorldview,
      openingMessage: editOpening,
      background: editBackground,
      longMemory: longMemory
    };
    await db.characters.update(character.id, updated);
    setCharacter(updated);
    setIsEditing(false);
  };

  const handleRecall = async (messageId: number) => {
    await db.messages.update(messageId, { isRecalled: true, text: '消息已撤回' });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRecalled: true, text: '消息已撤回' } : m));
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleSendImage = async (imageUrl: string) => {
    if (!character) return;
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('请先在“我”页面配置 API 秘钥！');
      return;
    }
    const msg: ChatMessage = {
      characterId: character.id!,
      text: '[图片]',
      image: imageUrl,
      sender: 'user',
      timestamp: Date.now(),
      read: false
    };
    const id = await db.messages.add(msg);
    setMessages(prev => [...prev, { ...msg, id }]);
    
    // AI response logic
    setIsAiProcessing(true);
    setTimeout(async () => {
      const aiMsg: ChatMessage = {
        characterId: character.id!,
        text: '收到图片啦！',
        sender: 'ai',
        timestamp: Date.now(),
        read: false
      };
      const aiId = await db.messages.add(aiMsg);
      setMessages(prev => [...prev, { ...aiMsg, id: aiId }]);
      setIsAiProcessing(false);
    }, 1500);
  };

  const handleSendSticker = async (stickerUrl: string, sender: 'user' | 'ai' = 'user') => {
    if (!character) return;
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey && sender === 'user') {
      alert('请先在“我”页面配置 API 秘钥！');
      return;
    }
    const msg: ChatMessage = {
      characterId: character.id!,
      text: '[表情包]',
      image: stickerUrl,
      sender: sender,
      timestamp: Date.now(),
      read: sender === 'user' ? true : false
    };
    const id = await db.messages.add(msg);
    setMessages(prev => [...prev, { ...msg, id }]);
    setShowEmojiPicker(false);
    
    if (sender === 'user') {
      // AI response logic
      setIsAiProcessing(true);
      setTimeout(async () => {
        const aiMsg: ChatMessage = {
          characterId: character.id!,
          text: '好可爱的表情包！',
          sender: 'ai',
          timestamp: Date.now(),
          read: false
        };
        const aiId = await db.messages.add(aiMsg);
        setMessages(prev => [...prev, { ...aiMsg, id: aiId }]);
        setIsAiProcessing(false);
      }, 1500);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音识别。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return;
    if (!character) return;
    
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('请先在“我”页面配置 API 秘钥！');
      return;
    }

    const userMsg: ChatMessage = { 
      characterId, 
      text: input.trim() || '[图片]', 
      image: pendingImage || undefined,
      sender: 'user', 
      timestamp: Date.now(), 
      read: false,
      quote: replyingTo ? {
        text: replyingTo.text,
        sender: replyingTo.sender,
        senderName: replyingTo.sender === 'user' ? '我' : character.name
      } : undefined
    };
    await db.messages.add(userMsg);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    setReplyingTo(null);
    setIsAiProcessing(true);

    // Simulate AI "reading" the message
    setTimeout(async () => {
      const lastMsg = await db.messages.where({ characterId }).last();
      if (lastMsg && lastMsg.id) {
        await db.messages.update(lastMsg.id, { read: true });
        setMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, read: true } : m));
      }
    }, 1500);

    try {
      // Context logic
      let context = `你现在是${character.name}，${character.worldview}。请用简短、口语化的中文回复。`;
      
      if (longMemory) {
        const history = messages.slice(-memoryDepth).map(m => `${m.sender === 'user' ? '用户' : character.name}: ${m.text}`).join('\n');
        context += `\n对话历史：\n${history}`;
      }
      
      let text = await generateAIResponse(context, `回复：${userMsg.text}`);
      
      // Apply Regex if enabled
      if (regexEnabled && character.regexRules) {
        character.regexRules.forEach(rule => {
          const regex = new RegExp(rule.match, 'g');
          text = text.replace(regex, rule.replace);
        });
      }
      
      // Add Suffix if enabled
      if (character.mandatorySuffix) {
        text += character.mandatorySuffix;
      }
      
      const aiMsg: ChatMessage = { characterId, text, sender: 'ai', timestamp: Date.now(), read: true };
      
      // Occasionally send a sticker too
      if (Math.random() > 0.7) {
        const stickers = [
          'https://api.iconify.design/twemoji:grinning-face-with-sweat.svg',
          'https://api.iconify.design/twemoji:face-with-tears-of-joy.svg',
          'https://api.iconify.design/twemoji:smiling-face-with-heart-eyes.svg',
          'https://api.iconify.design/twemoji:thinking-face.svg'
        ];
        aiMsg.image = stickers[Math.floor(Math.random() * stickers.length)];
      }

      await db.messages.add(aiMsg);
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Processing Error:", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background Wallpaper */}
      <div className="absolute inset-0 z-0">
        <img 
          src={character?.background || globalBackground || "https://picsum.photos/seed/zen-landscape/800/1200?blur=10"} 
          className="w-full h-full object-cover opacity-40 transition-all duration-700" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/40"></div>
      </div>

      {/* Header */}
      <div className="glass h-14 border-b border-black/5 flex items-center px-4 z-20 sticky top-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-[16px] font-bold text-slate-900 leading-tight">
              {isAiProcessing ? '正在输入中...' : character?.name}
            </span>
            {isAiProcessing && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[16px] font-bold text-slate-900">...</motion.span>}
          </div>
          {!isAiProcessing && (
            <div className="flex items-center gap-1">
              {isListening && <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
              <span className="text-[10px] text-slate-500 font-medium">{isListening ? '正在聆听...' : status}</span>
            </div>
          )}
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
                <h3 className="text-[17px] font-bold text-slate-900">聊天设置</h3>
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

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-800">编辑角色</h3>
                      <button onClick={() => setIsEditing(false)} className="text-xs text-[#007AFF] font-bold">返回</button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block px-1">角色名字</label>
                        <input 
                          type="text" value={editName || ''} onChange={(e) => setEditName(e.target.value)}
                          placeholder="输入名字..." className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block px-1">头像 URL</label>
                        <input 
                          type="text" value={editAvatar || ''} onChange={(e) => setEditAvatar(e.target.value)}
                          placeholder="输入图片链接..." className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block px-1">角色设定 / 世界观</label>
                        <textarea 
                          value={editWorldview || ''} onChange={(e) => setEditWorldview(e.target.value)}
                          placeholder="描述角色的人设、说话风格等..." className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block px-1">开场白</label>
                        <input 
                          type="text" value={editOpening || ''} onChange={(e) => setEditOpening(e.target.value)}
                          placeholder="进入聊天时的第一句话..." className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block px-1">聊天背景 URL</label>
                        <div className="relative">
                          <input 
                            type="text" value={editBackground || ''} onChange={(e) => setEditBackground(e.target.value)}
                            placeholder="留空使用全局背景..." className="w-full p-3 pr-10 bg-white border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
                          />
                          <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdateCharacter}
                        className="w-full py-3.5 bg-[#007AFF] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all mt-2"
                      >
                        保存修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">角色管理</h3>
                        <button onClick={() => setIsEditing(true)} className="text-xs text-[#007AFF] font-bold">编辑信息</button>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-[#F7F7F7] rounded-xl">
                        <img src={character?.avatar} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{character?.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{character?.worldview}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-6 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">对话配置</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Sliders className="w-4 h-4" />
                            <span className="text-sm font-medium">记忆深度</span>
                          </div>
                          <span className="text-xs font-bold text-[#007AFF] bg-blue-50 px-2 py-0.5 rounded-full">{memoryDepth} 条</span>
                        </div>
                        <input 
                          type="range" min="1" max="20" value={memoryDepth} 
                          onChange={(e) => setMemoryDepth(parseInt(e.target.value))}
                          className="w-full accent-[#007AFF] h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-3">
                        <button 
                          onClick={() => setWorldbookEnabled(!worldbookEnabled)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${worldbookEnabled ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-[#F7F7F7] border-transparent text-slate-500'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Book className="w-4 h-4" />
                            <span className="text-sm font-bold">世界书 (设定增强)</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${worldbookEnabled ? 'bg-blue-500 shadow-[0_0_8px_rgba(0,122,255,0.5)]' : 'bg-slate-300'}`}></div>
                        </button>
                        
                        <button 
                          onClick={() => setRegexEnabled(!regexEnabled)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${regexEnabled ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-[#F7F7F7] border-transparent text-slate-500'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-bold">正则过滤 (输出优化)</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${regexEnabled ? 'bg-blue-500 shadow-[0_0_8px_rgba(0,122,255,0.5)]' : 'bg-slate-300'}`}></div>
                        </button>

                        <button 
                          onClick={() => setLongMemory(!longMemory)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${longMemory ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-[#F7F7F7] border-transparent text-slate-500'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Cloud className="w-4 h-4" />
                            <span className="text-sm font-bold">长记忆模式 (联系上下文)</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${longMemory ? 'bg-blue-500 shadow-[0_0_8px_rgba(0,122,255,0.5)]' : 'bg-slate-300'}`}></div>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={async () => {
                          if (confirm('确定要清空与该角色的聊天记录吗？')) {
                            await db.messages.where({ characterId }).delete();
                            setMessages([]);
                            setShowSettings(false);
                          }
                        }}
                        className="w-full py-4 bg-white text-red-500 rounded-2xl font-bold text-[15px] border border-red-100 active:bg-red-50 transition-colors shadow-sm"
                      >
                        清空聊天记录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-5 space-y-6 z-10 scroll-smooth" 
        ref={scrollRef}
        onClick={() => setContextMenu({ ...contextMenu, visible: false })}
      >
        <div className="pb-10"> {/* Extra padding to prevent last message from being blocked */}
          {messages.filter(m => !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase())).map(msg => (
            <div key={msg.id}>
              {msg.isRecalled ? (
                <div className="flex justify-center w-full my-4">
                  <span className="text-[11px] text-slate-400 bg-black/5 px-3 py-1 rounded-full">
                    {msg.sender === 'user' ? '你撤回了一条消息' : `${character?.name} 撤回了一条消息`}
                  </span>
                </div>
              ) : (
                <div className={`flex ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 mb-6`}>
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (character?.name === '王也') {
                        // Ripple effect logic could go here
                      }
                    }}
                    className="relative"
                  >
                    <img 
                      src={msg.sender === 'ai' ? character?.avatar : userAvatar} 
                      className="w-10 h-10 rounded-xl shadow-sm border border-black/5 object-cover cursor-pointer" 
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <motion.div 
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const container = e.currentTarget.closest('.flex-1.flex.flex-col.overflow-hidden.relative');
                        const rect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
                        setContextMenu({
                          visible: true,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          messageId: msg.id || null
                        });
                      }}
                      className={`py-1.5 px-3.5 rounded-2xl text-[15px] leading-snug bubble-shadow ${
                        msg.sender === 'user' 
                        ? 'bg-[#007AFF] text-white rounded-tr-none' 
                        : 'bg-white text-slate-900 rounded-tl-none'
                      } shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer select-none`}
                    >
                      {msg.quote && (
                        <div className={`text-xs p-1.5 rounded mb-1.5 border-l-2 line-clamp-2 ${msg.sender === 'user' ? 'bg-white/20 border-white/40 text-white/90' : 'bg-black/5 border-black/20 text-slate-500'}`}>
                          {msg.quote.senderName}: {msg.quote.text}
                        </div>
                      )}
                      {msg.image ? (
                        <img src={msg.image} className="max-w-[150px] rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        msg.text
                      )}
                    </motion.div>
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                      <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.sender === 'user' && (
                        <span className={`text-[10px] font-medium ${msg.read ? 'text-slate-400' : 'text-[#007AFF]'}`}>
                          {msg.read ? '已读' : '未读'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
                onClick={() => contextMenu.messageId && handleRecall(contextMenu.messageId)}
                className="w-full px-4 py-3 text-sm text-slate-700 hover:bg-black/5 flex items-center gap-2 transition-colors"
              >
                撤回消息
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="glass border-t border-black/5 p-3 safe-pb z-20 relative flex flex-col">
        {replyingTo && (
          <div className="flex items-center justify-between bg-black/5 rounded-lg px-3 py-1.5 mb-2 text-xs text-slate-500">
            <span className="truncate flex-1">
              回复 {replyingTo.sender === 'user' ? '我' : character?.name}: {replyingTo.text}
            </span>
            <button onClick={() => setReplyingTo(null)} className="ml-2 p-1 hover:bg-black/10 rounded-full">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-0 right-0 bg-white/95 backdrop-blur-md border-t border-black/5 p-4 shadow-2xl z-30 max-h-[300px] overflow-y-auto"
            >
              <div>
                <div className="grid grid-cols-8 gap-2">
                  {['😊', '😂', '🥰', '🤔', '🥺', '😭', '😎', '👍', '🙏', '🔥', '✨', '🎉', '💔', '👀', '🤐', '🤡', '🙄', '😴', '🤯', '🥳', '😡', '😱', '🤫', '🤝', '👏', '🙌', '💪', '🌹', '🎂', '🎈', '🌟', '🌈', '⚡'].map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => {
                        setInput(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl hover:bg-black/5 p-1 rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleImageUpload(handleSendImage)}
            className="p-2 rounded-full bg-black/5 text-slate-400 hover:bg-black/10 transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleListening}
            className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-black/5 text-slate-400 hover:bg-black/10'}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <div className="flex-1 relative">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? '请说话...' : `想对${character?.name || '他'}说点什么...`}
              className={`w-full bg-white/80 border border-black/5 rounded-2xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all placeholder:text-slate-400 ${isListening ? 'ring-2 ring-red-500/20' : ''}`} 
            />
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Smile className={`w-5 h-5 transition-colors ${showEmojiPicker ? 'text-[#007AFF]' : 'text-slate-400 hover:text-slate-600'}`} />
            </button>
          </div>

          <button 
            onClick={handleSend} 
            disabled={!input.trim() && !pendingImage}
            className={`px-5 py-2.5 rounded-2xl font-bold text-[15px] transition-all ${
              (input.trim() || pendingImage)
              ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 active:scale-95' 
              : 'bg-black/5 text-slate-300'
            }`}
          >
            发送
          </button>
        </div>

        {pendingImage && (
          <div className="px-4 pt-2">
            <div className="relative inline-block">
              <img src={pendingImage} className="w-20 h-20 rounded-lg object-cover" referrerPolicy="no-referrer" />
              <button 
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 bg-black/60 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
