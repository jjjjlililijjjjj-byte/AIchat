import { useState, useEffect, useMemo, useRef } from 'react';
import { db, Character, Group } from '../lib/db';
import { Search, UserPlus, ChevronRight, UserCircle, Settings, Users, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CharacterWarehouse from './CharacterWarehouse';
import CharacterSettings from './CharacterSettings';
import GroupCreate from './GroupCreate';
import { pinyin } from 'pinyin-pro';

export default function Contacts({ onSelectCharacter, onSelectGroup }: { onSelectCharacter: (id: number) => void, onSelectGroup: (id: number) => void }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWarehouse, setShowWarehouse] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [showCreateSettings, setShowCreateSettings] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const allCharacters = await db.characters.toArray();
    setCharacters(allCharacters);
    const allGroups = await db.groups.toArray();
    setGroups(allGroups);
  };

  useEffect(() => {
    loadData();
  }, [showWarehouse, editingCharacterId, showGroupCreate]);

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedCharacters = useMemo(() => {
    const groupsMap: Record<string, Character[]> = {};
    filteredCharacters.forEach(char => {
      let firstLetter = '#';
      if (char.name) {
        const py = pinyin(char.name, { pattern: 'first', type: 'array' })[0];
        if (py && /^[a-zA-Z]$/.test(py[0])) {
          firstLetter = py[0].toUpperCase();
        }
      }
      if (!groupsMap[firstLetter]) groupsMap[firstLetter] = [];
      groupsMap[firstLetter].push(char);
    });

    const sortedKeys = Object.keys(groupsMap).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(letter => ({
      letter,
      characters: groupsMap[letter].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    }));
  }, [filteredCharacters]);

  const alphabet = ['↑', '☆', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

  const scrollToLetter = (letter: string) => {
    if (letter === '↑') {
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(`letter-${letter}`);
    if (element && listRef.current) {
      const top = element.offsetTop - listRef.current.offsetTop;
      listRef.current.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <AnimatePresence>
        {showWarehouse && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50"
          >
            <CharacterWarehouse onBack={() => setShowWarehouse(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGroupCreate && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[60]"
          >
            <GroupCreate 
              onBack={() => setShowGroupCreate(false)} 
              onCreate={(id) => {
                setShowGroupCreate(false);
                onSelectGroup(id);
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGroupList && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[60] bg-white flex flex-col"
          >
            <div className="px-4 pt-6 pb-2 flex items-center gap-3 border-b border-black/5">
              <button onClick={() => setShowGroupList(false)} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-[17px] font-bold text-slate-900">群聊</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-[#F0F0F0]">
                {groups.map(group => (
                  <motion.button
                    key={group.id}
                    whileTap={{ backgroundColor: '#F2F2F2' }}
                    onClick={() => {
                      setShowGroupList(false);
                      onSelectGroup(group.id!);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <img 
                      src={group.avatar} 
                      className="w-10 h-10 rounded-xl object-cover border border-black/5 bg-slate-100" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[16px] text-slate-900 font-medium">{group.name}</span>
                  </motion.button>
                ))}
                {groups.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-sm">暂无群聊</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateSettings && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50"
          >
            <CharacterSettings 
              characterId={null} 
              onBack={() => setShowCreateSettings(false)} 
              onUpdate={loadData}
              onSelect={onSelectCharacter}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCharacterId && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50"
          >
            <CharacterSettings 
              characterId={editingCharacterId} 
              onBack={() => setEditingCharacterId(null)} 
              onUpdate={loadData}
              onSelect={onSelectCharacter}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-4 pt-2 pb-2 flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-slate-900">联系人</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGroupList(true)} className="p-1 -mr-1 hover:bg-black/5 rounded-full transition-colors">
            <Users className="w-6 h-6 text-slate-800" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2">
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

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20" ref={listRef}>
        {/* Special Items */}
        <div className="divide-y divide-[#F0F0F0]">
          <button 
            onClick={() => setShowCreateSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-2 active:bg-black/5 transition-colors"
          >
            <div className="w-10 h-10 bg-[#FA9D3B] rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <span className="text-[15px] text-slate-900">新的角色</span>
          </button>
          <button 
            onClick={() => setShowGroupCreate(true)}
            className="w-full flex items-center gap-3 px-4 py-2 active:bg-black/5 transition-colors"
          >
            <div className="w-10 h-10 bg-[#007AFF] rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-[15px] text-slate-900">新的群聊</span>
          </button>
          <button 
            onClick={() => setShowWarehouse(true)}
            className="w-full flex items-center gap-3 px-4 py-2 active:bg-black/5 transition-colors"
          >
            <div className="w-10 h-10 bg-[#007AFF] rounded-lg flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[15px] text-slate-900">角色仓库</span>
          </button>
        </div>

        {/* Character List */}
        <div className="mt-4">
          {groupedCharacters.map((group) => (
            <div key={group.letter} id={`letter-${group.letter}`}>
              <div className="px-4 py-1 bg-[#F7F7F7] text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                {group.letter}
              </div>
              <div className="divide-y divide-[#F0F0F0]">
                {group.characters.map((char) => (
                  <motion.button
                    key={char.id}
                    whileTap={{ backgroundColor: '#F2F2F2' }}
                    onClick={() => char.id && setEditingCharacterId(char.id)}
                    className="w-full flex items-center gap-3 px-4 py-2 transition-colors"
                  >
                    <img 
                      src={char.avatar} 
                      className="w-10 h-10 rounded-full object-cover border border-black/5" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 text-left">
                      <div className="text-[15px] text-slate-900 font-medium">{char.name}</div>
                      {char.tags && char.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {char.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="py-8 text-center text-slate-300 text-sm">
          {filteredCharacters.length} 位角色
        </div>
      </div>

      {/* Alphabet Sidebar */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-20">
        {alphabet.map(letter => (
          <button 
            key={letter} 
            onClick={() => scrollToLetter(letter)}
            className="text-[9px] font-bold text-slate-400 w-4 h-4 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors"
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
