// state.js — 全局状态 + THEMES配置 + localStorage工具
const PPTX_VERSION = '3.12.0';
const PPTX_STORAGE_KEY = `pptxgen_${PPTX_VERSION}`;

// 全局状态
const state = {
  theme: localStorage.getItem('preferred_theme') || 'silkroad',
  activeTab: 'basic',
  activeDay: 0,
  apiKey: localStorage.getItem('deepseek_api_key') || '',
  isGenerating: false,
  days: [
    { title: '', description: '', hotel: '', food: '', imageData: null, highlights: '' }
  ],
  meta: {
    title: '七日舒适游：丝路·秦风之旅',
    subtitle: '古道千年·丝路万里',
    totalDays: 7,
    totalKm: 2800,
    cities: ['西安', '兰州', '张掖', '嘉峪关', '敦煌', '西安'],
  },
  food: [{ name: '', desc: '', imageData: null }],
  tips: [{ icon: '☀️', text: '' }],
  cost: { included: [], excluded: [] },
  contact: { name: '', phone: '', address: '', qrcode: '' },
};

// 5套主题配置
const THEMES = {
  silkroad: {
    name: '丝路风',
    css: { primary: '#8B4513', secondary: '#D4A96A', accent: '#4A7C7C', bg: '#FDF8F0', text: '#2D1B0E', card: '#FFFFFF', border: '#E0D5C5' },
    pptx: { primary: '8B4513', secondary: 'D4A96A', accent: '4A7C7C', bg: 'FDF8F0', text: '2D1B0E', title: 'FFFFFF' }
  },
  seaside: {
    name: '海滨风',
    css: { primary: '#1A5276', secondary: '#5DADE2', accent: '#76D7C4', bg: '#EBF5FB', text: '#1A252F', card: '#FFFFFF', border: '#D4E6F1' },
    pptx: { primary: '1A5276', secondary: '5DADE2', accent: '76D7C4', bg: 'EBF5FB', text: '1A252F', title: 'FFFFFF' }
  },
  ice: {
    name: '冰雪风',
    css: { primary: '#2C3E50', secondary: '#AED6F1', accent: '#85C1E9', bg: '#F8FBFD', text: '#1C2833', card: '#FFFFFF', border: '#D6EAF8' },
    pptx: { primary: '2C3E50', secondary: 'AED6F1', accent: '85C1E9', bg: 'F8FBFD', text: '1C2833', title: 'FFFFFF' }
  },
  ancient: {
    name: '古镇风',
    css: { primary: '#6E2C00', secondary: '#C0392B', accent: '#808B96', bg: '#FAF0E6', text: '#3E2723', card: '#FFFFFF', border: '#D7CCC8' },
    pptx: { primary: '6E2C00', secondary: 'C0392B', accent: '808B96', bg: 'FAF0E6', text: '3E2723', title: 'FFFFFF' }
  },
  business: {
    name: '商务风',
    css: { primary: '#1B4F72', secondary: '#2874A6', accent: '#F0F3F4', bg: '#FDFEFE', text: '#17202A', card: '#FFFFFF', border: '#D5D8DC' },
    pptx: { primary: '1B4F72', secondary: '2874A6', accent: 'F0F3F4', bg: 'FDFEFE', text: '17202A', title: 'FFFFFF' }
  }
};

// localStorage 工具
function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('localStorage写入失败:', e); }
}

function loadFromStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}

// 应用主题（更新CSS变量 + 切换按钮激活态）
function applyTheme(themeKey) {
  const t = THEMES[themeKey];
  if (!t) return;
  const root = document.documentElement;
  Object.entries(t.css).forEach(([k, v]) => root.style.setProperty(`--color-${k}`, v));
  state.theme = themeKey;
  localStorage.setItem('preferred_theme', themeKey);
  // 更新主题按钮激活态
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeKey);
  });
}
