import { useState, useEffect } from 'react';
import { db, Character } from '../lib/db';
import { ChevronLeft, Plus, Search, UserCircle, Check, UserPlus, Camera, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_CHARACTERS = [
  {
    name: '张楚岚',
    avatar: 'https://picsum.photos/seed/zhangchulan/200/200',
    worldview: '《一人之下》主角，外号“不摇碧莲”。表面圆滑世故，实则心思缜密，重情重义。',
    openingMessage: '哟，这不是那谁吗？找我有啥事啊？',
    tags: ['一人之下', '不摇碧莲', '哪都通']
  },
  {
    name: '冯宝宝',
    avatar: 'https://picsum.photos/seed/fengbaobao/200/200',
    worldview: '《一人之下》女主角，身世神秘，长生不老。性格单纯直接，武力值爆表，说话带四川口音。',
    openingMessage: '你晓得不？我一直在找我的家人。',
    tags: ['一人之下', '宝儿姐', '四川话']
  },
  {
    name: '诸葛青',
    avatar: 'https://picsum.photos/seed/zhugeqing/200/200',
    worldview: '《一人之下》角色，武侯奇门传人。外表优雅迷人，实则是个腹黑的乐子人。',
    openingMessage: '奇门遁甲，皆在掌握。你想算一卦吗？',
    tags: ['一人之下', '武侯奇门', '腹黑']
  },
  {
    name: '老天师',
    avatar: 'https://picsum.photos/seed/laotianshi/200/200',
    worldview: '《一人之下》天师府第六十五代天师，凡夫俗子张之维。异人界绝顶，性格随和但威严十足。',
    openingMessage: '年轻人，凡事不要太执着。',
    tags: ['一人之下', '绝顶', '天师府']
  },
  {
    name: '孙悟空',
    avatar: 'https://picsum.photos/seed/goku/200/200',
    worldview: '《龙珠》主角，赛亚人，性格单纯善良，热爱战斗和美食，为了保护地球不断突破极限。',
    openingMessage: '哟！我是悟空！你看起来挺强的嘛，要不要跟我打一场？',
    tags: ['龙珠', '赛亚人', '战斗狂']
  },
  {
    name: '漩涡鸣人',
    avatar: 'https://picsum.photos/seed/naruto/200/200',
    worldview: '《火影忍者》主角，木叶村的第七代火影，体内封印着九尾妖狐，性格阳光开朗，永不言弃。',
    openingMessage: '我是漩涡鸣人！我可是要成为火影的男人！',
    tags: ['火影忍者', '九尾人柱力', '火之意志']
  },
  {
    name: '蒙奇·D·路飞',
    avatar: 'https://picsum.photos/seed/luffy/200/200',
    worldview: '《海贼王》主角，草帽一伙船长，橡胶果实能力者，梦想是找到传说中的大秘宝并成为海贼王。',
    openingMessage: '我是路飞！是要成为海贼王的男人！你也要上我的船吗？',
    tags: ['海贼王', '草帽', '橡胶人']
  },
  {
    name: '坂田银时',
    avatar: 'https://picsum.photos/seed/gintoki/200/200',
    worldview: '《银魂》主角，万事屋老板，平时懒散无厘头，爱吃甜食，但在关键时刻非常可靠，坚守自己的武士道。',
    openingMessage: '啊...好麻烦啊。有没有草莓牛奶喝？万事屋今天休息哦。',
    tags: ['银魂', '万事屋', '白夜叉']
  },
  {
    name: '灶门炭治郎',
    avatar: 'https://picsum.photos/seed/tanjiro/200/200',
    worldview: '《鬼灭之刃》主角，鬼杀队剑士，为了让变成鬼的妹妹祢豆子变回人类而战斗，性格极其温柔善良。',
    openingMessage: '你好！我是灶门炭治郎。如果有需要帮忙的地方请尽管说！',
    tags: ['鬼灭之刃', '水之呼吸', '温柔']
  },
  {
    name: '五条悟',
    avatar: 'https://picsum.photos/seed/gojo/200/200',
    worldview: '《咒术回战》角色，现代最强的咒术师，性格轻浮随性，但实力深不可测，戴着黑色眼罩。',
    openingMessage: '哟！没关系，因为我是最强的嘛。',
    tags: ['咒术回战', '最强', '无下限']
  },
  {
    name: '利威尔·阿克曼',
    avatar: 'https://picsum.photos/seed/levi/200/200',
    worldview: '《进击的巨人》角色，调查兵团兵长，被称为“人类最强士兵”，性格冷酷、有严重洁癖，但极其重视同伴。',
    openingMessage: '啧...这里怎么这么脏。快点打扫干净。',
    tags: ['进击的巨人', '兵长', '人类最强']
  },
  {
    name: '芙莉莲',
    avatar: 'https://picsum.photos/seed/frieren/200/200',
    worldview: '《葬送的芙莉莲》主角，活了千年的精灵魔法使，曾经是讨伐魔王勇者小队的一员，性格平淡，喜欢收集魔法。',
    openingMessage: '我是魔法使芙莉莲。你有什么有趣的魔法书吗？',
    tags: ['葬送的芙莉莲', '精灵', '魔法使']
  }
];

export default function CharacterWarehouse({ onBack }: { onBack: () => void }) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newChar, setNewChar] = useState<Partial<Character>>({
    name: '',
    avatar: 'https://picsum.photos/seed/custom/200/200',
    worldview: '',
    openingMessage: '',
    tags: [],
    isCustom: true
  });

  useEffect(() => {
    const checkAdded = async () => {
      const all = await db.characters.toArray();
      const names = new Set(all.map(c => c.name));
      setAddedIds(names);
    };
    checkAdded();
  }, []);

  const handleAdd = async (preset: any) => {
    if (addedIds.has(preset.name)) return;
    
    await db.characters.add({
      ...preset,
      longMemory: true,
      regexRules: [],
      isCustom: preset.isCustom || false
    });
    
    setAddedIds(new Set([...Array.from(addedIds), preset.name]));
  };

  const handleCreateCustom = async () => {
    if (!newChar.name || !newChar.worldview) {
      alert('请填写名字和世界观设定');
      return;
    }
    await db.characters.add({
      name: newChar.name!,
      avatar: newChar.avatar || 'https://picsum.photos/seed/custom/200/200',
      worldview: newChar.worldview!,
      openingMessage: newChar.openingMessage || '你好！',
      tags: newChar.tags || ['自定义'],
      longMemory: true,
      isCustom: true,
      regexRules: []
    });
    alert('自定义角色已创建');
    setShowCreateModal(false);
    setAddedIds(new Set([...Array.from(addedIds), newChar.name!]));
  };

  const filteredPresets = PRESET_CHARACTERS.filter(p => 
    p.name.includes(searchQuery) || p.tags.some(t => t.includes(searchQuery))
  );

  return (
    <div className="flex flex-col h-full bg-[#F7F7F7]">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
        <button onClick={onBack} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900">角色仓库</h1>
        <div className="flex-1" />
        <button 
          onClick={() => setShowCreateModal(true)}
          className="p-2 bg-[#007AFF]/10 text-[#007AFF] rounded-full hover:bg-[#007AFF]/20 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 bg-white">
        <div className="bg-[#F2F2F2] rounded-lg flex items-center px-3 py-1.5 gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索预设角色" 
            className="bg-transparent text-[13px] outline-none w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Custom Create Entry */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#007AFF] hover:text-[#007AFF] transition-all"
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm font-bold">创建自定义角色</span>
        </motion.button>

        {filteredPresets.map((preset, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm border border-black/5"
          >
            <img 
              src={preset.avatar} 
              className="w-16 h-16 rounded-xl object-cover border border-black/5"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900">{preset.name}</h3>
                <button 
                  onClick={() => handleAdd(preset)}
                  disabled={addedIds.has(preset.name)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    addedIds.has(preset.name) 
                    ? 'bg-slate-100 text-slate-400' 
                    : 'bg-[#007AFF] text-white active:scale-95'
                  }`}
                >
                  {addedIds.has(preset.name) ? (
                    <>
                      <Check className="w-3 h-3" />
                      已添加
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      添加
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preset.worldview}</p>
              <div className="flex gap-1 mt-2">
                {preset.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-md border border-black/5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
        
        {filteredPresets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <UserCircle className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">未找到相关角色</p>
          </div>
        )}
      </div>
      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">创建新角色</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-black/5 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-black/5 shadow-inner">
                      <img src={newChar.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <button className="absolute -right-2 -bottom-2 bg-white p-1.5 rounded-full shadow-md border border-black/5 text-slate-400">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">角色名字</label>
                    <input 
                      value={newChar.name || ''}
                      onChange={e => setNewChar({...newChar, name: e.target.value})}
                      placeholder="例如: 齐天大圣"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">头像 URL</label>
                    <input 
                      value={newChar.avatar || ''}
                      onChange={e => setNewChar({...newChar, avatar: e.target.value})}
                      placeholder="输入图片链接"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">世界观 / 设定</label>
                    <textarea 
                      value={newChar.worldview || ''}
                      onChange={e => setNewChar({...newChar, worldview: e.target.value})}
                      placeholder="描述角色的性格、背景、说话风格..."
                      rows={4}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">开场白</label>
                    <input 
                      value={newChar.openingMessage || ''}
                      onChange={e => setNewChar({...newChar, openingMessage: e.target.value})}
                      placeholder="角色第一句话会说什么？"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleCreateCustom}
                  className="flex-1 py-3 bg-[#007AFF] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  创建角色
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
