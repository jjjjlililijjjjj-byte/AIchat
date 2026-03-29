import { useState, useEffect } from 'react';
import { db, Character } from '../lib/db';
import { ChevronLeft, Save, Trash2, Image as ImageIcon, Sliders, Book, Filter, Cloud, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { handleImageUpload } from '../lib/utils';

export default function CharacterSettings({ characterId, onBack, onUpdate, onSelect }: { characterId: number | null, onBack: () => void, onUpdate?: () => void, onSelect?: (id: number) => void }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editWorldview, setEditWorldview] = useState('');
  const [editOpening, setEditOpening] = useState('');
  const [editBackground, setEditBackground] = useState('');
  const [longMemory, setLongMemory] = useState(false);
  const [memoryDepth, setMemoryDepth] = useState(5);

  useEffect(() => {
    if (characterId === null) {
      // Creation mode
      setCharacter({
        name: '',
        avatar: 'https://picsum.photos/seed/new-char/200/200',
        worldview: '',
        tags: ['新朋友']
      });
      setEditName('');
      setEditAvatar('https://picsum.photos/seed/new-char/200/200');
      setEditWorldview('');
      setEditOpening('');
      setEditBackground('');
      setLongMemory(false);
      return;
    }

    const fetchChar = async () => {
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
    fetchChar();
  }, [characterId]);

  const handleSave = async () => {
    if (!editName.trim()) return alert('请输入名字');
    
    const charData = {
      name: editName,
      avatar: editAvatar || 'https://picsum.photos/seed/new-char/200/200',
      worldview: editWorldview,
      openingMessage: editOpening,
      background: editBackground,
      longMemory: longMemory,
      tags: character?.tags || ['新朋友']
    };

    if (characterId === null) {
      const id = await db.characters.add(charData);
      alert('角色创建成功');
      onUpdate?.();
      onBack();
    } else {
      await db.characters.update(characterId, charData);
      alert('角色信息已更新');
      onUpdate?.();
      onBack();
    }
  };

  const handleDelete = async () => {
    if (characterId === null) {
      onBack();
      return;
    }
    if (confirm('确定要删除该角色吗？相关的聊天记录也将被永久删除。')) {
      await db.characters.delete(characterId);
      await db.messages.where({ characterId }).delete();
      alert('角色已删除');
      onUpdate?.();
      onBack();
    }
  };

  if (!character && characterId !== null) return null;

  return (
    <div className="flex flex-col h-full bg-[#F7F7F7] z-[60]">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
        <button onClick={onBack} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900">{characterId === null ? '创建角色' : '角色设置'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
              <img src={editAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <button 
              onClick={() => handleImageUpload(setEditAvatar)}
              className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-black/5 text-slate-600 hover:text-[#007AFF] transition-colors"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block px-1">角色名字</label>
            <input 
              value={editName || ''}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block px-1">头像 URL</label>
            <input 
              value={editAvatar || ''}
              onChange={e => setEditAvatar(e.target.value)}
              placeholder="或输入图片 URL"
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block px-1">世界观 / 设定</label>
            <textarea 
              value={editWorldview || ''}
              onChange={e => setEditWorldview(e.target.value)}
              rows={12}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all resize-y"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block px-1">开场白</label>
            <input 
              value={editOpening || ''}
              onChange={e => setEditOpening(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block px-1">聊天背景</label>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleImageUpload(setEditBackground)}
                className="w-full py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> 上传本地图片
              </button>
              <div className="relative">
                <input 
                  value={editBackground || ''}
                  onChange={e => setEditBackground(e.target.value)}
                  placeholder="或输入图片 URL (留空使用全局背景)"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all pr-10"
                />
                <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Config */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 mb-2">AI 行为配置</h3>
          <button 
            onClick={() => setLongMemory(!longMemory)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${longMemory ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span className="text-xs font-bold">长记忆模式 (联系上下文)</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${longMemory ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {characterId !== null && (
            <button 
              onClick={() => {
                onSelect?.(characterId);
                onBack();
              }}
              className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Cloud className="w-5 h-5" />
              开始聊天
            </button>
          )}
          <button 
            onClick={handleSave}
            className="w-full bg-[#007AFF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {characterId === null ? '立即创建' : '保存修改'}
          </button>
          {characterId !== null && (
            <button 
              onClick={handleDelete}
              className="w-full bg-white text-red-500 font-bold py-4 rounded-2xl border border-red-100 active:bg-red-50 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              删除角色
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
