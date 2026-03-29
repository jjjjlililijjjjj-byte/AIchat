import { useState, useEffect } from 'react';
import { db, Character, Group } from '../lib/db';
import { ChevronLeft, Search, Check, Save, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GroupCreate({ onBack, onCreate }: { onBack: () => void, onCreate: (groupId: number) => void }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadCharacters = async () => {
      const all = await db.characters.toArray();
      setCharacters(all);
    };
    loadCharacters();
  }, []);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCreate = async () => {
    if (selectedIds.size < 2) {
      alert('请至少选择两个角色');
      return;
    }
    if (!groupName.trim()) {
      alert('请输入群聊名称');
      return;
    }

    setIsCreating(true);
    try {
      const group: Group = {
        name: groupName,
        avatar: `https://picsum.photos/seed/group-${Date.now()}/200/200`,
        characterIds: Array.from(selectedIds),
        createdAt: Date.now()
      };
      const id = await db.groups.add(group);
      onCreate(Number(id));
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#F7F7F7] z-[60]">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
        <button onClick={onBack} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900">发起群聊</h1>
        <div className="flex-1" />
        <button 
          onClick={handleCreate}
          disabled={selectedIds.size < 2 || !groupName.trim() || isCreating}
          className="bg-[#007AFF] text-white px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
        >
          确定({selectedIds.size})
        </button>
      </div>

      {/* Group Info */}
      <div className="p-4 bg-white border-b border-black/5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <input 
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="群聊名称"
            className="flex-1 bg-transparent border-none outline-none text-[16px] font-medium"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 bg-white">
        <div className="bg-[#F2F2F2] rounded-lg flex items-center px-3 py-1.5 gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索" 
            className="bg-transparent text-[13px] outline-none w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Character List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[#F0F0F0]">
          {filteredCharacters.map((char) => (
            <button
              key={char.id}
              onClick={() => char.id && toggleSelect(char.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white active:bg-black/5 transition-colors"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(char.id!) ? 'bg-[#007AFF] border-[#007AFF]' : 'border-slate-200'}`}>
                {selectedIds.has(char.id!) && <Check className="w-3 h-3 text-white" />}
              </div>
              <img 
                src={char.avatar} 
                className="w-10 h-10 rounded-lg object-cover border border-black/5" 
                referrerPolicy="no-referrer"
              />
              <span className="text-[15px] text-slate-900 font-medium">{char.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Avatars Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-white border-t border-black/5 p-3 flex items-center gap-2 overflow-x-auto">
          {Array.from(selectedIds).map((id: number) => {
            const char = characters.find(c => c.id === id);
            return (
              <div key={id} className="relative flex-shrink-0">
                <img src={char?.avatar} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => toggleSelect(id)}
                  className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-0.5"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
