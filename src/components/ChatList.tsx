import { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { db, Character, Group, ChatMessage } from '../lib/db';
import { motion } from 'framer-motion';

interface ChatItem {
  type: 'chat' | 'group';
  id: number;
  name: string;
  avatar: string;
  lastMsg?: ChatMessage;
}

export default function ChatList({ onSelectChat, onSelectGroup }: { onSelectChat: (id: number) => void, onSelectGroup: (id: number) => void }) {
  const [chats, setChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      const chars = await db.characters.toArray();
      const groups = await db.groups.toArray();
      
      const chatItems = await Promise.all([
        ...chars.map(async c => {
          const lastMsg = await db.messages
            .where('characterId').equals(c.id!)
            .filter(m => !m.groupId)
            .last();
          return { type: 'chat', id: c.id!, name: c.name, avatar: c.avatar, lastMsg } as ChatItem;
        }),
        ...groups.map(async g => {
          const lastMsg = await db.messages
            .where('groupId').equals(g.id!)
            .last();
          return { type: 'group', id: g.id!, name: g.name, avatar: g.avatar, lastMsg } as ChatItem;
        })
      ]);

      chatItems.sort((a, b) => (b.lastMsg?.timestamp || 0) - (a.lastMsg?.timestamp || 0));
      setChats(chatItems);
    };
    fetchChats();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-2 pb-2 flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-slate-900">聊天</h1>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2">
        <div className="bg-[#F2F2F2] rounded-lg flex items-center justify-center py-1.5 gap-1.5 text-slate-400">
          <Search className="w-3.5 h-3.5" />
          <span className="text-[13px]">搜索</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[#F0F0F0]">
          {chats.map((item) => (
            <motion.button
              key={`${item.type}-${item.id}`}
              whileTap={{ backgroundColor: '#F2F2F2' }}
              onClick={() => item.type === 'chat' ? onSelectChat(item.id) : onSelectGroup(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2 transition-colors"
            >
              <div className="relative">
                <img 
                  src={item.avatar} 
                  className={`w-12 h-12 rounded-xl object-cover border border-black/5 ${item.type === 'group' ? 'bg-slate-100' : ''}`} 
                  referrerPolicy="no-referrer"
                />
                {!item.lastMsg?.read && item.lastMsg?.sender === 'ai' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">1</span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[16px] font-medium text-slate-900 truncate">{item.name}</span>
                  <span className="text-[11px] text-slate-400">
                    {item.lastMsg ? new Date(item.lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-[13px] text-slate-400 truncate">
                  {item.lastMsg ? (item.lastMsg.isRecalled ? '消息已撤回' : item.lastMsg.text) : '暂无消息'}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
