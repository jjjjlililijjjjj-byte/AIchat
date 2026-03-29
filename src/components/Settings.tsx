import { useState, useEffect } from 'react';
import { Key, Database, Info, ChevronRight, Camera, ShieldCheck, LogOut, Github, Eye, EyeOff, Download, Upload, ChevronLeft, User, Palette, Image as ImageIcon, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, UserSettings } from '../lib/db';
import { handleImageUpload } from '../lib/utils';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [apiPlatform, setApiPlatform] = useState('gemini');
  const [apiModel, setApiModel] = useState('gemini-3-flash-preview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [activePanel, setActivePanel] = useState<string | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserSettings>({
    id: 'user_settings',
    userName: '开发者 01',
    userNickname: 'AI Engine Pro',
    userAvatar: 'https://picsum.photos/seed/user-avatar/200/200',
    userSignature: '探索 AI 的无限可能',
    momentsBackground: 'https://picsum.photos/seed/cover/1000/600',
    globalBackground: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      const storedKey = localStorage.getItem('GEMINI_API_KEY');
      const storedPlatform = localStorage.getItem('API_PLATFORM') || 'gemini';
      const storedModel = localStorage.getItem('API_MODEL') || 'gemini-3-flash-preview';
      
      if (storedKey) {
        setApiKey(storedKey);
        setApiStatus('connected');
      } else {
        setActivePanel('api');
      }
      setApiPlatform(storedPlatform);
      setApiModel(storedModel);

      const settings = await db.settings.get('user_settings');
      if (settings) {
        setUserProfile(settings);
      } else {
        await db.settings.add(userProfile);
      }
    };
    loadSettings();
  }, []);

  const handleSaveProfile = async () => {
    await db.settings.put(userProfile);
    alert('个人信息已保存');
    setActivePanel(null);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    localStorage.setItem('API_PLATFORM', apiPlatform);
    localStorage.setItem('API_MODEL', apiModel);
    setApiStatus(apiKey ? 'connected' : 'disconnected');
    alert('API 配置已保存至本地。');
    setActivePanel(null);
  };

  const exportData = async () => {
    const characters = await db.characters.toArray();
    const messages = await db.messages.toArray();
    const data = JSON.stringify({ characters, messages });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_phone_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const settingsGroups = [
    {
      title: '个人设置',
      items: [
        { icon: <User className="w-5 h-5" />, label: '个人信息', color: 'bg-blue-400', action: 'profile' },
        { icon: <Palette className="w-5 h-5" />, label: '聊天背景', color: 'bg-indigo-400', action: 'background' },
        { icon: <Camera className="w-5 h-5" />, label: '圈子背景', color: 'bg-orange-400', action: 'moments_bg' },
      ]
    },
    {
      title: '系统配置',
      items: [
        { icon: <Key className="w-5 h-5" />, label: 'API 密钥管理', color: 'bg-blue-500', action: 'api' },
        { icon: <Database className="w-5 h-5" />, label: '数据与存储', color: 'bg-blue-500', action: 'data' },
      ]
    },
    {
      title: '关于与支持',
      items: [
        { icon: <Music className="w-5 h-5" />, label: '听歌排行', color: 'bg-pink-400', action: 'music_ranking' },
        { icon: <Info className="w-5 h-5" />, label: '关于 AI 小手机', color: 'bg-orange-500', action: 'about' },
        { icon: <ShieldCheck className="w-5 h-5" />, label: '隐私协议', color: 'bg-purple-500', action: 'privacy' },
        { icon: <Github className="w-5 h-5" />, label: '开源地址', color: 'bg-slate-800', action: 'github' },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F7F7F7] relative overflow-hidden">
      <AnimatePresence>
        {activePanel === 'profile' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-50 bg-[#F7F7F7] flex flex-col"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
              <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-[17px] font-bold text-slate-900">个人信息</h1>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">昵称</label>
                  <input
                    value={userProfile.userName || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, userName: e.target.value })}
                    className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">个性签名</label>
                  <textarea
                    value={userProfile.userSignature || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, userSignature: e.target.value })}
                    rows={3}
                    className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">头像</label>
                  <div className="flex items-center gap-3">
                    <img src={userProfile.userAvatar} className="w-16 h-16 rounded-xl object-cover border border-black/5" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => handleImageUpload((base64) => setUserProfile({ ...userProfile, userAvatar: base64 }))}
                      className="px-4 py-2 bg-[#F7F7F7] text-slate-700 rounded-lg text-sm font-medium hover:bg-black/5 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" /> 上传本地图片
                    </button>
                  </div>
                  <input
                    value={userProfile.userAvatar || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, userAvatar: e.target.value })}
                    placeholder="或输入图片 URL"
                    className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all mt-3"
                  />
                </div>
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-[#007AFF] text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  保存修改
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activePanel === 'background' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-50 bg-[#F7F7F7] flex flex-col"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
              <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-[17px] font-bold text-slate-900">全局聊天背景</h1>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">背景图片</label>
                {userProfile.globalBackground && (
                  <img src={userProfile.globalBackground} className="w-full h-32 object-cover rounded-xl mb-3" referrerPolicy="no-referrer" />
                )}
                <button 
                  onClick={() => handleImageUpload((base64) => setUserProfile({ ...userProfile, globalBackground: base64 }))}
                  className="w-full py-3 bg-[#F7F7F7] text-slate-700 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <Upload className="w-4 h-4" /> 上传本地图片
                </button>
                <input
                  value={userProfile.globalBackground || ''}
                  onChange={(e) => setUserProfile({ ...userProfile, globalBackground: e.target.value })}
                  placeholder="或输入图片 URL (留空使用默认)"
                  className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'https://picsum.photos/seed/bg1/1080/1920',
                    'https://picsum.photos/seed/bg2/1080/1920',
                    'https://picsum.photos/seed/bg3/1080/1920',
                    'https://picsum.photos/seed/bg4/1080/1920'
                  ].map((url, i) => (
                    <button 
                      key={i}
                      onClick={() => setUserProfile({ ...userProfile, globalBackground: url })}
                      className="aspect-[9/16] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#007AFF] transition-all"
                    >
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-[#007AFF] text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  保存背景
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activePanel === 'moments_bg' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-50 bg-[#F7F7F7] flex flex-col"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
              <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-[17px] font-bold text-slate-900">圈子背景</h1>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">背景图片</label>
                {userProfile.momentsBackground && (
                  <img src={userProfile.momentsBackground} className="w-full h-32 object-cover rounded-xl mb-3" referrerPolicy="no-referrer" />
                )}
                <button 
                  onClick={() => handleImageUpload((base64) => setUserProfile({ ...userProfile, momentsBackground: base64 }))}
                  className="w-full py-3 bg-[#F7F7F7] text-slate-700 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <Upload className="w-4 h-4" /> 上传本地图片
                </button>
                <input
                  value={userProfile.momentsBackground || ''}
                  onChange={(e) => setUserProfile({ ...userProfile, momentsBackground: e.target.value })}
                  placeholder="或输入图片 URL (留空使用默认)"
                  className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'https://picsum.photos/seed/moments1/1000/600',
                    'https://picsum.photos/seed/moments2/1000/600',
                    'https://picsum.photos/seed/moments3/1000/600',
                    'https://picsum.photos/seed/moments4/1000/600'
                  ].map((url, i) => (
                    <button 
                      key={i}
                      onClick={() => setUserProfile({ ...userProfile, momentsBackground: url })}
                      className="aspect-[16/9] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#007AFF] transition-all"
                    >
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-[#007AFF] text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  保存背景
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activePanel === 'api' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-50 bg-[#F7F7F7] flex flex-col"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
              <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-[17px] font-bold text-slate-900">API 密钥管理</h1>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">API 配置</h3>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${apiStatus === 'connected' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {apiStatus === 'connected' ? '已配置' : '未配置'}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">模型平台</label>
                    <select 
                      value={apiPlatform}
                      onChange={(e) => setApiPlatform(e.target.value)}
                      className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all outline-none"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI (暂未实现)</option>
                      <option value="anthropic">Anthropic (暂未实现)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">模型选择</label>
                    <select 
                      value={apiModel}
                      onChange={(e) => setApiModel(e.target.value)}
                      className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all outline-none"
                    >
                      <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                      <option value="gemini-3.1-flash-preview">gemini-3.1-flash-preview</option>
                      <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">API 密钥</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="输入 API Key"
                        className="w-full bg-[#F7F7F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveApiKey}
                    className="w-full bg-[#007AFF] text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                  >
                    保存配置
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 px-2">
                密钥将仅保存在您的浏览器本地存储中，不会上传到任何服务器。配置好 API 后才能进行 AI 聊天。
              </p>
            </div>
          </motion.div>
        )}

        {activePanel === 'data' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-50 bg-[#F7F7F7] flex flex-col"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
              <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-[17px] font-bold text-slate-900">数据与存储</h1>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-white rounded-2xl overflow-hidden border border-black/5 divide-y divide-[#F0F0F0]">
                <button onClick={exportData} className="w-full px-5 py-4 flex items-center gap-4 active:bg-black/5 transition-colors">
                  <div className="bg-blue-400 p-2 rounded-lg text-white">
                    <Download className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left text-[16px] text-slate-800">导出备份数据</span>
                  <ChevronRight className="text-slate-300 w-5 h-5" />
                </button>
                <button className="w-full px-5 py-4 flex items-center gap-4 active:bg-black/5 transition-colors">
                  <div className="bg-blue-400 p-2 rounded-lg text-white">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left text-[16px] text-slate-800">导入备份数据</span>
                  <ChevronRight className="text-slate-300 w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-white rounded-2xl overflow-hidden border border-black/5 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2">存储占用</h3>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#007AFF] h-full w-[15%]"></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-400">已使用 1.2MB</span>
                  <span className="text-[10px] text-slate-400">剩余 50MB</span>
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (confirm('确定要清除所有聊天记录吗？此操作不可撤销。')) {
                    await db.messages.clear();
                    alert('聊天记录已清除。');
                  }
                }}
                className="w-full bg-white text-red-500 font-bold py-4 rounded-2xl border border-red-100 active:bg-red-50 transition-colors"
              >
                清除所有聊天记录
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header */}
      <div className="bg-white px-6 pt-4 pb-6 mb-2">
        <div className="flex items-center gap-5" onClick={() => setActivePanel('profile')}>
          <div className="relative group">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-black/5">
              <img 
                src={userProfile.userAvatar || "https://picsum.photos/seed/user-avatar/200/200"} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 shadow-sm border border-black/5">
              <Camera className="w-3 h-3 text-slate-400" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-start pt-1">
            <h2 className="text-[22px] font-bold text-slate-900 leading-tight">{userProfile.userName}</h2>
            <p className="text-slate-400 text-[13px] mt-1 line-clamp-1">签名: {userProfile.userSignature || '未设置个性签名'}</p>
          </div>
          <ChevronRight className="text-slate-300 w-5 h-5" />
        </div>
      </div>

      {/* Settings List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {settingsGroups.map((group, gIdx) => (
          <div key={gIdx} className="mb-2">
            <div className="bg-white divide-y divide-[#F0F0F0]">
              {group.items.map((item, iIdx) => (
                <motion.button
                  key={iIdx}
                  whileTap={{ backgroundColor: '#F2F2F2' }}
                  onClick={() => setActivePanel(item.action)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors"
                >
                  <div className={`${item.color} p-2 rounded-lg text-white`}>
                    {item.icon}
                  </div>
                  <span className="flex-1 text-left text-[16px] text-slate-800">{item.label}</span>
                  <ChevronRight className="text-slate-300 w-5 h-5" />
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        <div className="px-6 py-8">
          <button className="w-full bg-white text-red-500 font-bold py-4 rounded-xl border border-red-100 active:bg-red-50 transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" />
            退出当前账号
          </button>
        </div>
      </div>
    </div>
  );
}
