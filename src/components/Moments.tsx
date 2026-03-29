import React, { useState, useEffect } from 'react';
import { db, Moment, Character, UserSettings, Group } from '../lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Camera, X, Send, ChevronLeft, Upload } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { handleImageUpload } from '../lib/utils';

export default function Moments({ onBack, isTabMode = false }: { onBack: () => void, isTabMode?: boolean }) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [userProfile, setUserProfile] = useState<UserSettings | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [shareMoment, setShareMoment] = useState<Moment | null>(null);
  const [shareTargets, setShareTargets] = useState<{chars: Character[], groups: Group[]}>({ chars: [], groups: [] });

  useEffect(() => {
    if (shareMoment) {
      Promise.all([db.characters.toArray(), db.groups.toArray()]).then(([chars, groups]) => {
        setShareTargets({ chars, groups });
      });
    }
  }, [shareMoment]);

  const handleShare = async (moment: Moment, targetId: number, type: 'character' | 'group') => {
    const text = `[分享动态]\n${moment.content}`;
    const msg: any = {
      text,
      image: moment.image,
      sender: 'user',
      timestamp: Date.now(),
      read: true
    };
    if (type === 'character') {
      msg.characterId = targetId;
    } else {
      msg.groupId = targetId;
    }
    await db.messages.add(msg);
    alert('已分享');
    setShareMoment(null);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await db.settings.get('user_settings');
      if (settings) setUserProfile(settings);
    };
    fetchSettings();
  }, []);

  const fetchMoments = async () => {
    const all = await db.moments.orderBy('timestamp').reverse().toArray();
    setMoments(all);
  };

  useEffect(() => {
    const init = async () => {
      await fetchMoments();
      const count = await db.moments.count();
      if (count === 0) {
        generateAiMoment();
      }
    };
    init();
  }, []);

  // Randomly trigger AI post or interaction
  useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.1) { // 10% chance to generate AI post
        generateAiMoment();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const generateAiMoment = async () => {
    const characters = await db.characters.toArray();
    if (characters.length === 0) return;
    const char = characters[Math.floor(Math.random() * characters.length)];

    try {
      const ai = new GoogleGenAI({ apiKey: localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你现在是${char.name}，${char.worldview}。请发一条简短的朋友圈动态，分享你的生活或感悟（30字以内）。`,
      });

      const content = response.text || '今天天气不错。';
      
      // Generate random likes
      const numLikes = Math.floor(Math.random() * 5);
      const shuffledChars = [...characters].sort(() => 0.5 - Math.random());
      const likedByNames = shuffledChars.slice(0, numLikes).map(c => c.name);

      const moment: Moment = {
        characterId: char.id!,
        content: content,
        image: `https://picsum.photos/seed/${Date.now()}/800/600`,
        timestamp: Date.now(),
        likes: numLikes,
        likedByNames: likedByNames,
        replies: []
      };

      await db.moments.add(moment);
      fetchMoments();
    } catch (e) {
      console.error("AI Moment error:", e);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setIsPosting(true);
    
    const moment: Moment = {
      userId: 'me',
      content: newContent,
      image: newImage || '', // No automatic AI image for user posts
      timestamp: Date.now(),
      likes: 0,
      replies: []
    };

    const id = await db.moments.add(moment);
    setMoments([ { ...moment, id }, ...moments]);
    setNewContent('');
    setNewImage('');
    setShowPostModal(false);
    setIsPosting(false);

    // Trigger random character interaction
    setTimeout(() => handleAiInteraction(id as number, newContent), 3000);
  };

  const handleAiInteraction = async (momentId: number, content: string) => {
    const characters = await db.characters.toArray();
    if (characters.length === 0) return;

    // Pick 1-3 random characters to interact
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = characters.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    for (const char of selected) {
      // Randomly like
      if (Math.random() > 0.3) {
        const moment = await db.moments.get(momentId);
        if (moment) {
          const currentLikedByNames = moment.likedByNames || [];
          if (!currentLikedByNames.includes(char.name)) {
            const newLikedByNames = [...currentLikedByNames, char.name];
            await db.moments.update(momentId, { 
              likes: moment.likes + 1,
              likedByNames: newLikedByNames
            });
            setMoments(prev => prev.map(m => m.id === momentId ? { ...m, likes: m.likes + 1, likedByNames: newLikedByNames } : m));
          }
        }
      }

      // Randomly comment
      if (Math.random() > 0.5) {
        try {
          const ai = new GoogleGenAI({ apiKey: localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '' });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `你现在是${char.name}，${char.worldview}。你的朋友发了一条朋友圈：“${content}”。请给这条朋友圈写一条简短、符合你人设的评论（20字以内）。`,
          });

          const replyText = response.text || '点赞！';
          const moment = await db.moments.get(momentId);
          if (moment) {
            const newReply = {
              characterId: char.id!,
              text: replyText,
              timestamp: Date.now()
            };
            await db.moments.update(momentId, {
              replies: [...moment.replies, newReply]
            });
            setMoments(prev => prev.map(m => m.id === momentId ? { ...m, replies: [...m.replies, newReply] } : m));
          }
        } catch (e) {
          console.error("AI Interaction error:", e);
        }
      }
    }
  };

  const handleLike = async (id: number) => {
    const moment = await db.moments.get(id);
    if (!moment) return;
    const newLiked = !moment.likedByMe;
    const newLikes = newLiked ? moment.likes + 1 : moment.likes - 1;
    await db.moments.update(id, { likes: newLikes, likedByMe: newLiked });
    setMoments(prev => prev.map(m => m.id === id ? { ...m, likes: newLikes, likedByMe: newLiked } : m));
  };

  const handleAiReplyToComment = async (momentId: number, characterId: number, userComment: string) => {
    const char = await db.characters.get(characterId);
    if (!char) return;

    try {
      const ai = new GoogleGenAI({ apiKey: localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你现在是${char.name}，${char.worldview}。你在朋友圈发了一条动态，你的朋友评论了你：“${userComment}”。请给这条评论写一条简短、符合你人设的回复（20字以内）。`,
      });

      const replyText = response.text || '谢谢评论！';
      const moment = await db.moments.get(momentId);
      if (moment) {
        const newReply = {
          characterId: char.id!,
          text: replyText,
          timestamp: Date.now()
        };
        await db.moments.update(momentId, {
          replies: [...moment.replies, newReply]
        });
        setMoments(prev => prev.map(m => m.id === momentId ? { ...m, replies: [...m.replies, newReply] } : m));
      }
    } catch (e) {
      console.error("AI Reply to Comment error:", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="pt-2 pb-2 flex items-center justify-between px-4 border-b border-black/5 glass sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {!isTabMode && (
            <button onClick={onBack} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-slate-700" />
            </button>
          )}
          <span className="text-lg font-bold text-slate-800">圈子</span>
        </div>
        <button 
          onClick={() => setShowPostModal(true)}
          className="p-2 hover:bg-black/5 rounded-full transition-colors"
        >
          <Camera className="w-6 h-6 text-slate-700" />
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Cover Image */}
        <div className="relative h-64 w-full mb-12">
          <img 
            src={userProfile?.momentsBackground || "https://picsum.photos/seed/cover/1000/600"} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-8 right-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-lg drop-shadow-md">{userProfile?.userName || '我'}</span>
              <img 
                src={userProfile?.userAvatar || "https://picsum.photos/seed/user/100/100"} 
                className="w-20 h-20 rounded-xl shadow-lg object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {userProfile?.userSignature && (
              <span className="text-slate-400 text-[11px] pr-2 mt-1">{userProfile.userSignature}</span>
            )}
          </div>
        </div>

        <div className="px-4 space-y-8">
          {moments.map(moment => (
            <div key={moment.id} className="flex gap-3 py-1">
              <MomentAvatar moment={moment} userProfile={userProfile} />
              <div className="flex-1 space-y-2">
                <div className="flex flex-col">
                  <span className="text-[#576B95] font-bold text-[15px]">
                    <MomentAuthor moment={moment} userProfile={userProfile} />
                  </span>
                  <p className="text-slate-800 text-[15px] leading-relaxed mt-0.5">{moment.content}</p>
                </div>

                {moment.image && (
                  <div className="rounded-lg overflow-hidden border border-black/5 max-w-[80%]">
                    <img src={moment.image} className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">{new Date(moment.timestamp).toLocaleString()}</span>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => moment.id && handleLike(moment.id)}
                      className={`flex items-center gap-1 transition-colors ${moment.likedByMe ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                    >
                      <Heart className={`w-4 h-4 ${moment.likedByMe ? 'fill-current' : ''}`} />
                      <span className="text-xs">{moment.likes}</span>
                    </button>
                    <button 
                      onClick={() => setShareMoment(moment)}
                      className="text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveCommentId(activeCommentId === moment.id ? null : moment.id!)}
                      className="text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Likes Names */}
                {(moment.likedByNames && moment.likedByNames.length > 0 || moment.likedByMe) && (
                  <div className="bg-[#F7F7F7] rounded-t-lg px-3 py-1.5 flex items-center gap-2 border-b border-black/5">
                    <Heart className="w-3.5 h-3.5 text-[#576B95] fill-current" />
                    <span className="text-[#576B95] font-bold text-[13px]">
                      {[...(moment.likedByMe ? [userProfile?.userName || '我'] : []), ...(moment.likedByNames || [])].join(', ')}
                    </span>
                  </div>
                )}

                {/* Replies */}
                {(moment.replies.length > 0 || activeCommentId === moment.id) && (
                  <div className={`bg-[#F7F7F7] ${ (moment.likedByNames && moment.likedByNames.length > 0 || moment.likedByMe) ? 'rounded-b-lg' : 'rounded-lg'} p-3 space-y-1.5`}>
                    {moment.replies.map((reply, idx) => (
                      <div key={idx} className="text-[14px] leading-snug">
                        <span className="text-[#576B95] font-bold mr-1">
                          {reply.userId === 'me' ? (userProfile?.userName || '我') : <CharacterName id={reply.characterId!} />}:
                        </span>
                        <span className="text-slate-700">{reply.text}</span>
                      </div>
                    ))}
                    <AnimatePresence>
                      {activeCommentId === moment.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`flex items-center gap-2 ${moment.replies.length > 0 ? 'mt-2 border-t border-black/5 pt-2' : ''} overflow-hidden`}
                        >
                          <input 
                            autoFocus
                            type="text"
                            placeholder="评论..."
                            className="flex-1 bg-white border border-black/5 rounded-md px-2 py-1.5 text-xs outline-none"
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                const text = (e.target as HTMLInputElement).value.trim();
                                (e.target as HTMLInputElement).value = '';
                                const momentId = moment.id!;
                                const newReply = { userId: 'me', text, timestamp: Date.now() };
                                const m = await db.moments.get(momentId);
                                if (m) {
                                  await db.moments.update(momentId, { replies: [...m.replies, newReply] });
                                  setMoments(prev => prev.map(item => item.id === momentId ? { ...item, replies: [...item.replies, newReply] } : item));
                                  setActiveCommentId(null);
                                  
                                  // If it's an AI post, the AI might reply back
                                  if (moment.characterId) {
                                    setTimeout(() => handleAiReplyToComment(momentId, moment.characterId!, text), 2000);
                                  }
                                }
                              }
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareMoment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/60 flex flex-col justify-end"
            onClick={() => setShareMoment(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full max-h-[70vh] rounded-t-2xl overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]"
            >
              <div className="p-4 border-b border-black/5 flex items-center justify-between">
                <span className="font-bold text-slate-900">发送给...</span>
                <button onClick={() => setShareMoment(null)} className="text-slate-500"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {shareTargets.groups.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase">群聊</div>
                    {shareTargets.groups.map(g => (
                      <button key={`g-${g.id}`} onClick={() => handleShare(shareMoment, g.id!, 'group')} className="w-full flex items-center gap-3 p-3 hover:bg-black/5 rounded-xl transition-colors">
                        <img src={g.avatar} className="w-10 h-10 rounded-xl object-cover bg-slate-100" referrerPolicy="no-referrer" />
                        <span className="font-medium text-slate-900">{g.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase">联系人</div>
                  {shareTargets.chars.map(c => (
                    <button key={`c-${c.id}`} onClick={() => handleShare(shareMoment, c.id!, 'character')} className="w-full flex items-center gap-3 p-3 hover:bg-black/5 rounded-xl transition-colors">
                      <img src={c.avatar} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-black/5 flex items-center justify-between">
                <button onClick={() => setShowPostModal(false)} className="text-slate-500"><X /></button>
                <span className="font-bold">发表动态</span>
                <button 
                  onClick={handlePost}
                  disabled={isPosting || !newContent.trim()}
                  className="bg-[#007AFF] text-white px-4 py-1.5 rounded-lg font-bold disabled:opacity-50"
                >
                  发表
                </button>
              </div>
              <div className="p-4 space-y-4">
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="这一刻的想法..."
                  className="w-full h-32 p-3 bg-slate-50 rounded-xl resize-none focus:outline-none text-slate-800"
                />
                <div className="flex items-center gap-3">
                  {newImage ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/5">
                      <img src={newImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setNewImage('')}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => handleImageUpload(setNewImage)}
                      className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">添加图片</span>
                    </div>
                  )}
                  <input 
                    value={newImage}
                    onChange={e => setNewImage(e.target.value)}
                    placeholder="或输入图片 URL (可选)"
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all outline-none"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CharacterName({ id }: { id: number }) {
  const [name, setName] = useState('...');
  useEffect(() => {
    db.characters.get(id).then(c => setName(c?.name || '未知'));
  }, [id]);
  return <>{name}</>;
}

function MomentAvatar({ moment, userProfile }: { moment: Moment, userProfile: any }) {
  const [avatar, setAvatar] = useState('https://picsum.photos/seed/user/100/100');
  
  useEffect(() => {
    if (moment.userId === 'me') {
      setAvatar(userProfile?.userAvatar || 'https://picsum.photos/seed/user/100/100');
    } else if (moment.characterId) {
      db.characters.get(moment.characterId).then(c => setAvatar(c?.avatar || 'https://picsum.photos/seed/user/100/100'));
    }
  }, [moment, userProfile]);

  return <img src={avatar} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />;
}

function MomentAuthor({ moment, userProfile }: { moment: Moment, userProfile: any }) {
  const [name, setName] = useState('...');
  
  useEffect(() => {
    if (moment.userId === 'me') {
      setName(userProfile?.userName || '我');
    } else if (moment.characterId) {
      db.characters.get(moment.characterId).then(c => setName(c?.name || '未知'));
    }
  }, [moment, userProfile]);

  return <>{name}</>;
}
