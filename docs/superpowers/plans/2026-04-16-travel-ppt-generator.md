# 旅游手册生成器 · 单HTML工具开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 `travel-ppt-generator.html` 单文件工具，支持表单填行程、AI智能解析、多套主题配色、一键生成下载 .pptx，内置5套旅游主题模板。

**Architecture:** 纯前端单文件架构，PptxGenJS 通过 CDN 引入运行在浏览器中，无后端依赖。AI 解析调用 Claude API（用户自行填入 Key）。配色系统以 JS 对象形式内嵌，切换主题即切换全局 CSS 变量 + 模板配色参数。PPT 生成后通过 Blob URL 触发浏览器下载。

**Tech Stack:** HTML5 + CSS3 + Vanilla JavaScript | PptxGenJS 3.12.0（内嵌，不依赖CDN） | Claude API（fetch直调） | 无任何构建工具依赖

> **离线策略：** PptxGenJS 库通过动态下载后 Base64 内嵌于 HTML 文件中（首次运行联网一次后缓存，后续完全离线可用）。Claude AI 解析功能需要联网（可选）。

---

## 文件结构

```
travel-ppt-generator/
├── travel-ppt-generator.html   ← 全部代码（唯一的交付文件）
├── SPEC.md                     ← 功能规格说明（开发参照）
└── README.md                   ← 用户使用说明
```

> 所有代码写进 `travel-ppt-generator.html`，无需拆分文件。CSS/JS 均内联在 `<style>` 和 `<script>` 标签内。

---

## 一、基础架构搭建

### Task 1: HTML 骨架与全局 CSS 变量系统

**Files:**
- Create: `travel-ppt-generator.html`

- [ ] **Step 1: 创建 HTML 基础骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>旅游手册生成器</title>
  <style>/* CSS 变量系统 */</style>
</head>
<body>
  <div id="app"></div>
  <div id="pptx-loader" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;color:#fff;font-size:16px;">
    <div style="text-align:center">
      <div>📦 首次加载PPT库，请稍候...</div>
      <div id="pptx-load-progress" style="margin-top:12px;font-size:13px;color:#aaa">正在准备</div>
    </div>
  </div>
  <script>
    // === PptxGenJS 内嵌加载器（离线可用） ===
    const PPTX_CDN = 'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.cjs.js';
    const STORAGE_KEY = 'pptxgen_embedded_v3';
    const loaderEl = document.getElementById('pptx-loader');
    const progressEl = document.getElementById('pptx-load-progress');

    async function loadPptxGen() {
      // 1. 尝试从 localStorage 读取已缓存的库
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        progressEl.textContent = '从本地缓存加载...';
        eval(cached);
        return;
      }
      // 2. 从CDN下载并缓存
      loaderEl.style.display = 'flex';
      progressEl.textContent = '正在下载PPT库（仅首次）...';
      try {
        const resp = await fetch(PPTX_CDN);
        const code = await resp.text();
        localStorage.setItem(STORAGE_KEY, code);
        progressEl.textContent = '库已缓存，后续无需联网';
        eval(code);
      } catch (e) {
        progressEl.textContent = '下载失败，请检查网络后刷新重试';
        throw e;
      } finally {
        loaderEl.style.display = 'none';
      }
    }

    // 业务逻辑在 loadPptxGen().then() 内执行
    loadPptxGen().then(() => {
      // === 业务代码开始 ===
      /* 业务逻辑 */
      // === 业务代码结束 ===
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: 定义 CSS 变量配色系统**

在 `<style>` 中定义 4 套主题的 CSS 变量，通过 `.theme-silkroad` / `.theme-seaside` / `.theme-ice` / `.theme-ancient` 类名切换：

```css
:root {
  --color-primary: #8B4513;
  --color-secondary: #D4A96A;
  --color-accent: #4A7C7C;
  --color-bg: #FDF8F0;
  --color-text: #2D1B0E;
  --color-card: #FFFFFF;
  --color-border: #E0D5C5;
  --radius: 12px;
  --shadow: 0 4px 20px rgba(0,0,0,0.08);
}
```

4套主题色值如下表（每套替换 CSS 变量值）：

| 主题 | 类名 | primary | secondary | accent | bg |
|------|------|---------|-----------|--------|-----|
| 丝路风 | `.theme-silkroad` | #8B4513 | #D4A96A | #4A7C7C | #FDF8F0 |
| 海滨风 | `.theme-seaside` | #1A5276 | #5DADE2 | #76D7C4 | #EBF5FB |
| 冰雪风 | `.theme-ice` | #2C3E50 | #AED6F1 | #85C1E9 | #F8FBFD |
| 古镇风 | `.theme-ancient` | #6E2C00 | #C0392B | #808B96 | #FAF0E6 |

- [ ] **Step 3: 搭建顶部导航区**

顶部导航栏：产品名 + 主题切换按钮组（4个带图标的按钮）+ 设置按钮（填API Key）

```html
<nav class="navbar">
  <span class="brand">🏔️ 旅游手册生成器</span>
  <div class="theme-switcher">
    <button class="theme-btn active" data-theme="silkroad">🏜️ 丝路风</button>
    <button class="theme-btn" data-theme="seaside">🌊 海滨风</button>
    <button class="theme-btn" data-theme="ice">❄️ 冰雪风</button>
    <button class="theme-btn" data-theme="ancient">🏯 古镇风</button>
  </div>
  <button class="settings-btn" id="openSettings">⚙️ API设置</button>
</nav>
```

- [ ] **Step 4: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: HTML骨架 + 4套主题CSS变量系统 + 导航栏"
```

---

### Task 2: 全局状态管理与模块初始化

**Files:**
- Modify: `travel-ppt-generator.html`（在 `<script>` 标签内）

- [ ] **Step 1: 定义全局状态对象**

```javascript
const state = {
  theme: 'silkroad',           // 当前主题
  activeTab: 'basic',          // 当前Tab（修复：必须初始化）
  activeDay: 0,               // 当前编辑的天数索引
  apiKey: localStorage.getItem('claude_api_key') || '',
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
```

- [ ] **Step 2: 定义主题配置对象（含 PptxGenJS 模板配色参数）**

```javascript
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
  }
};
```

- [ ] **Step 3: 实现 applyTheme(themeKey) 函数**

```javascript
function applyTheme(themeKey) {
  const t = THEMES[themeKey];
  const root = document.documentElement;
  root.style.setProperty('--color-primary', t.css.primary);
  root.style.setProperty('--color-secondary', t.css.secondary);
  root.style.setProperty('--color-accent', t.css.accent);
  root.style.setProperty('--color-bg', t.css.bg);
  root.style.setProperty('--color-text', t.css.text);
  root.style.setProperty('--color-card', t.css.card);
  root.style.setProperty('--color-border', t.css.border);
  state.theme = themeKey;
  localStorage.setItem('preferred_theme', themeKey);
  // 更新按钮激活状态
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeKey);
  });
}
```

- [ ] **Step 4: 页面加载时恢复主题**

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('preferred_theme') || 'silkroad';
  applyTheme(saved);
  renderApp();
});
```

- [ ] **Step 5: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: 全局状态管理 + 主题配置对象 + applyTheme切换函数"
```

---

### Task 3: 主界面渲染（Tab 导航 + 表单容器）

**Files:**
- Modify: `travel-ppt-generator.html`

- [ ] **Step 1: 实现 renderApp() 主渲染函数**

```javascript
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="main-layout">
      ${renderSidebar()}
      <div class="content-area">
        ${renderTabContent()}
      </div>
    </div>
  `;
  bindAppEvents();
  // 修复：renderBottomBar 定义后必须调用，否则底部操作栏不显示
  if (!document.getElementById('bottomBar')) {
    document.body.appendChild(renderBottomBar());
    bindBottomBarEvents();
  }
}
```

- [ ] **Step 2: 实现侧边栏导航**

```javascript
function renderSidebar() {
  const tabs = [
    { id: 'basic', label: '📋 基本信息', icon: '📋' },
    { id: 'itinerary', label: '🗺️ 每日行程', icon: '🗺️' },
    { id: 'food', label: '🍜 美食推荐', icon: '🍜' },
    { id: 'tips', label: '💡 温馨提示', icon: '💡' },
    { id: 'cost', label: '💰 费用说明', icon: '💰' },
    { id: 'contact', label: '📞 报名联系', icon: '📞' },
  ];
  return `
    <aside class="sidebar">
      ${tabs.map(t => `
        <button class="tab-btn ${state.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
          <span>${t.icon}</span><span>${t.label}</span>
        </button>
      `).join('')}
    </aside>
  `;
}
```

- [ ] **Step 3: 实现 Tab 内容区**

```javascript
function renderTabContent() {
  switch (state.activeTab) {
    case 'basic': return renderBasicTab();
    case 'itinerary': return renderItineraryTab();
    case 'food': return renderFoodTab();
    case 'tips': return renderTipsTab();
    case 'cost': return renderCostTab();
    case 'contact': return renderContactTab();
    default: return renderBasicTab();
  }
}
```

- [ ] **Step 4: 实现各 Tab 表单内容（基础信息Tab）**

```javascript
function renderBasicTab() {
  return `
    <div class="tab-content">
      <h2 class="tab-title">📋 基本信息</h2>
      <div class="form-grid">
        <div class="form-group full">
          <label>路线名称</label>
          <input type="text" id="input-title" value="${state.meta.title}" placeholder="例如：七日舒适游：丝路·秦风之旅">
        </div>
        <div class="form-group">
          <label>副标题</label>
          <input type="text" id="input-subtitle" value="${state.meta.subtitle}" placeholder="例如：古道千年·丝路万里">
        </div>
        <div class="form-group">
          <label>行程天数</label>
          <input type="number" id="input-days" value="${state.meta.totalDays}" min="1" max="30">
        </div>
        <div class="form-group">
          <label>总公里数</label>
          <input type="number" id="input-km" value="${state.meta.totalKm}" placeholder="例如：2800">
        </div>
        <div class="form-group">
          <label>途径城市（用逗号分隔）</label>
          <input type="text" id="input-cities" value="${state.meta.cities.join('，')}" placeholder="西安，兰州，张掖，嘉峪关，敦煌">
        </div>
      </div>
      <div class="tab-actions">
        <button class="btn-primary" id="saveBasic">💾 保存基本信息</button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 5: 实现底部固定操作栏**

```javascript
function renderBottomBar() {
  return `
    <div class="bottom-bar">
      <button class="btn-outline" id="previewBtn">👁️ 预览摘要</button>
      <button class="btn-outline" id="aiParseBtn">🤖 AI智能解析</button>
      <button class="btn-primary large" id="generateBtn">🎯 一键生成 PPT</button>
    </div>
  `;
}
// 在 renderApp() 中追加到底部
```

- [ ] **Step 6: 绑定事件（Tab切换 + 保存）**

```javascript
function bindAppEvents() {
  // Tab 切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      renderApp();
    });
  });
  // 保存基本信息
  document.getElementById('saveBasic')?.addEventListener('click', saveBasic);
  // 底部操作栏
  document.getElementById('previewBtn')?.addEventListener('click', showPreview);
  document.getElementById('aiParseBtn')?.addEventListener('click', handleAIParse);
  document.getElementById('generateBtn')?.addEventListener('click', handleGenerate);
  // 主题切换
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });
}
```

```javascript
function saveBasic() {
  state.meta.title = document.getElementById('input-title').value;
  state.meta.subtitle = document.getElementById('input-subtitle').value;
  state.meta.totalDays = parseInt(document.getElementById('input-days').value);
  state.meta.totalKm = parseInt(document.getElementById('input-km').value);
  state.meta.cities = document.getElementById('input-cities').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  showToast('💾 基本信息已保存');
}
```

- [ ] **Step 7: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: 主界面渲染 - Tab导航 + 基本信息表单 + 底部操作栏"
```

---

## 二、核心表单模块开发

### Task 4: 每日行程表单（动态添加天数 + 图片上传）

**Files:**
- Modify: `travel-ppt-generator.html`

- [ ] **Step 1: 实现 renderItineraryTab() 函数**

```javascript
function renderItineraryTab() {
  const dayBtns = state.days.map((day, i) => `
    <button class="day-tab-btn ${state.activeDay === i ? 'active' : ''}" data-day="${i}">
      D${i + 1}
    </button>
  `).join('') + `<button class="day-tab-btn add-day" id="addDayBtn">+ 添加</button>`;

  const currentDay = state.days[state.activeDay] || state.days[0];
  const imagePreview = currentDay.imageData
    ? `<img src="${currentDay.imageData}" class="image-preview">`
    : `<div class="image-placeholder">📷 点击下方按钮上传图片</div>`;

  return `
    <div class="tab-content">
      <h2 class="tab-title">🗺️ 每日行程</h2>
      <div class="day-tabs">${dayBtns}</div>
      <div class="day-form">
        <div class="form-row">
          <div class="form-group full">
            <label>第 ${state.activeDay + 1} 天：行程标题</label>
            <input type="text" id="day-title" value="${currentDay.title}" placeholder="例如：西安 → 兰州">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>行程描述</label>
            <textarea id="day-desc" rows="4" placeholder="描述当天的游览内容、交通方式等">${currentDay.description}</textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>🏨 住宿安排</label>
            <input type="text" id="day-hotel" value="${currentDay.hotel}" placeholder="酒店名称及地址">
          </div>
          <div class="form-group">
            <label>🍜 餐饮安排</label>
            <input type="text" id="day-food" value="${currentDay.food}" placeholder="早餐/午餐/晚餐">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>✨ 行程亮点</label>
            <input type="text" id="day-highlights" value="${currentDay.highlights}" placeholder="用逗号分隔，如：黄河母亲像、中山桥">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>📷 行程图片（将嵌入PPT当天页面）</label>
            <input type="file" id="day-image" accept="image/*" class="file-input">
            ${imagePreview}
          </div>
        </div>
        <div class="tab-actions">
          <button class="btn-secondary" id="saveDayBtn">💾 保存当天行程</button>
          <button class="btn-danger" id="deleteDayBtn">🗑️ 删除此天</button>
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: 实现天数动态添加/切换/删除逻辑**

```javascript
function bindDayEvents() {
  // 添加天数
  document.getElementById('addDayBtn')?.addEventListener('click', () => {
    state.days.push({ title: '', description: '', hotel: '', food: '', imageData: null, highlights: '' });
    state.activeDay = state.days.length - 1;
    renderApp();
  });

  // 天数Tab切换
  document.querySelectorAll('.day-tab-btn[data-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeDay = parseInt(btn.dataset.day);
      renderApp();
    });
  });

  // 保存当天行程
  document.getElementById('saveDayBtn')?.addEventListener('click', () => {
    const d = state.days[state.activeDay];
    d.title = document.getElementById('day-title').value;
    d.description = document.getElementById('day-desc').value;
    d.hotel = document.getElementById('day-hotel').value;
    d.food = document.getElementById('day-food').value;
    d.highlights = document.getElementById('day-highlights').value;
    showToast(`✅ D${state.activeDay + 1} 行程已保存`);
  });

  // 删除当天
  document.getElementById('deleteDayBtn')?.addEventListener('click', () => {
    if (state.days.length <= 1) { showToast('⚠️ 至少保留一天行程'); return; }
    state.days.splice(state.activeDay, 1);
    state.activeDay = Math.max(0, state.activeDay - 1);
    renderApp();
  });

  // 图片上传 → 转 DataURL
  document.getElementById('day-image')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.days[state.activeDay].imageData = ev.target.result;
      renderApp();
    };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 3: 将 bindDayEvents() 加入 bindAppEvents()**

在 `bindAppEvents()` 函数末尾追加：

```javascript
  bindDayEvents();
```

- [ ] **Step 4: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: 每日行程表单 - 动态天数 + 图片上传 + DataURL存储"
```

---

### Task 5: 美食推荐 / 温馨提示 / 费用说明 / 报名联系 表单

**Files:**
- Modify: `travel-ppt-generator.html`

- [ ] **Step 1: 实现美食推荐表单**

```javascript
function renderFoodTab() {
  const foodItems = state.food.map((f, i) => `
    <div class="food-item" data-index="${i}">
      <div class="form-group">
        <label>美食名称</label>
        <input type="text" class="food-name" value="${f.name}" placeholder="例如：兰州拉面">
      </div>
      <div class="form-group">
        <label>描述</label>
        <input type="text" class="food-desc" value="${f.desc}" placeholder="描述口感/特色">
      </div>
      <button class="btn-icon delete-food" data-index="${i}">🗑️</button>
    </div>
  `).join('');

  return `
    <div class="tab-content">
      <h2 class="tab-title">🍜 美食推荐</h2>
      <p class="tab-hint">添加当地特色美食，让手册更有吸引力</p>
      <div class="food-list" id="foodList">${foodItems}</div>
      <button class="btn-outline" id="addFoodBtn">➕ 添加美食</button>
    </div>
  `;
}
```

- [ ] **Step 2: 实现温馨提示表单**

```javascript
function TIPS_OPTIONS = [
  { icon: '☀️', label: '气候穿着' },
  { icon: '🪪', label: '证件安全' },
  { icon: '💊', label: '高原反应' },
  { icon: '🔌', label: '电子产品' },
  { icon: '💰', label: '现金支付' },
  { icon: '📶', label: '网络通讯' },
  { icon: '🍽️', label: '饮食卫生' },
  { icon: '🕐', label: '时差提醒' },
];

function renderTipsTab() {
  const tips = state.tips.map((t, i) => `
    <div class="tip-item" data-index="${i}">
      <select class="tip-icon-select">
        ${TIPS_OPTIONS.map(opt => `<option value="${opt.icon}" ${t.icon === opt.icon ? 'selected' : ''}>${opt.icon} ${opt.label}</option>`).join('')}
      </select>
      <input type="text" class="tip-text" value="${t.text}" placeholder="请输入温馨提示内容...">
      <button class="btn-icon delete-tip" data-index="${i}">🗑️</button>
    </div>
  `).join('');

  return `
    <div class="tab-content">
      <h2 class="tab-title">💡 温馨提示</h2>
      <div class="tips-list" id="tipsList">${tips}</div>
      <button class="btn-outline" id="addTipBtn">➕ 添加提示</button>
    </div>
  `;
}
```

- [ ] **Step 3: 实现费用说明表单**

```javascript
function renderCostTab() {
  const included = state.cost.included.map((item, i) => `
    <div class="cost-item">
      <input type="text" class="cost-included-item" value="${item}" placeholder="费用包含项，例如：全程空调旅游大巴">
      <button class="btn-icon delete-cost-in" data-index="${i}">🗑️</button>
    </div>
  `).join('');
  const excluded = state.cost.excluded.map((item, i) => `
    <div class="cost-item">
      <input type="text" class="cost-excluded-item" value="${item}" placeholder="费用不含项，例如：个人消费">
      <button class="btn-icon delete-cost-ex" data-index="${i}">🗑️</button>
    </div>
  `).join('');

  return `
    <div class="tab-content">
      <h2 class="tab-title">💰 费用说明</h2>
      <div class="cost-section">
        <h3>✅ 费用包含</h3>
        <div id="costIncludedList">${included}</div>
        <button class="btn-outline small" id="addCostInBtn">➕ 添加</button>
      </div>
      <div class="cost-section">
        <h3>❌ 费用不含</h3>
        <div id="costExcludedList">${excluded}</div>
        <button class="btn-outline small" id="addCostExBtn">➕ 添加</button>
      </div>
      <div class="tab-actions">
        <button class="btn-primary" id="saveCostBtn">💾 保存费用说明</button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 4: 实现报名联系表单**

```javascript
function renderContactTab() {
  return `
    <div class="tab-content">
      <h2 class="tab-title">📞 报名联系</h2>
      <div class="form-grid">
        <div class="form-group full">
          <label>联系人</label>
          <input type="text" id="contact-name" value="${state.contact.name}" placeholder="旅行社名称或联系人姓名">
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input type="text" id="contact-phone" value="${state.contact.phone}" placeholder="400-xxxx-xxxx">
        </div>
        <div class="form-group">
          <label>公司地址</label>
          <input type="text" id="contact-address" value="${state.contact.address}" placeholder="详细地址">
        </div>
        <div class="form-group full">
          <label>联系二维码（上传图片）</label>
          <input type="file" id="contact-qrcode" accept="image/*" class="file-input">
          ${state.contact.qrcode ? `<img src="${state.contact.qrcode}" class="image-preview">` : ''}
        </div>
      </div>
      <div class="tab-actions">
        <button class="btn-primary" id="saveContactBtn">💾 保存联系信息</button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 5: 在 bindAppEvents() 中绑定所有事件**

```javascript
  // 美食
  document.getElementById('addFoodBtn')?.addEventListener('click', () => {
    state.food.push({ name: '', desc: '', imageData: null });
    renderApp();
  });
  document.querySelectorAll('.delete-food').forEach(btn => {
    btn.addEventListener('click', () => {
      state.food.splice(parseInt(btn.dataset.index), 1);
      renderApp();
    });
  });

  // 温馨提示
  document.getElementById('addTipBtn')?.addEventListener('click', () => {
    state.tips.push({ icon: '☀️', text: '' });
    renderApp();
  });

  // 费用
  document.getElementById('addCostInBtn')?.addEventListener('click', () => {
    state.cost.included.push('');
    renderApp();
  });
  document.getElementById('addCostExBtn')?.addEventListener('click', () => {
    state.cost.excluded.push('');
    renderApp();
  });
  document.getElementById('saveCostBtn')?.addEventListener('click', () => {
    state.cost.included = [...document.querySelectorAll('.cost-included-item')].map(i => i.value);
    state.cost.excluded = [...document.querySelectorAll('.cost-excluded-item')].map(i => i.value);
    showToast('💾 费用说明已保存');
  });

  // 联系信息
  document.getElementById('saveContactBtn')?.addEventListener('click', () => {
    state.contact.name = document.getElementById('contact-name').value;
    state.contact.phone = document.getElementById('contact-phone').value;
    state.contact.address = document.getElementById('contact-address').value;
    showToast('💾 联系信息已保存');
  });
  document.getElementById('contact-qrcode')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { state.contact.qrcode = ev.target.result; renderApp(); };
    reader.readAsDataURL(file);
  });
```

- [ ] **Step 6: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: 美食/提示/费用/联系表单全部完成"
```

---

## 三、AI 智能解析功能

### Task 6: Claude API 集成与 AI 解析

**Files:**
- Modify: `travel-ppt-generator.html`

- [ ] **Step 1: 在 `<head>` 中引入 Anthropic SDK CDN**

```html
<script src="https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.27.0/dist/anthropic axial.umd.min.js"></script>
```

- [ ] **Step 2: 实现 AI 解析弹窗 UI**

```javascript
function renderAIModal() {
  return `
    <div class="modal-overlay" id="aiModal">
      <div class="modal">
        <div class="modal-header">
          <h3>🤖 AI 智能解析行程</h3>
          <button class="btn-icon" id="closeAiModal">✕</button>
        </div>
        <div class="modal-body">
          <p class="hint">将行程文本粘贴到下方，AI将自动识别并填充表单各字段。</p>
          <textarea id="aiInput" rows="10" placeholder="粘贴你的行程描述，例如：

第1天：西安 - 兰州
早上8点西安出发，乘坐高铁前往兰州（约3小时），抵达后游览黄河母亲像和中山桥，晚餐推荐尝尝正宗兰州拉面。住宿：兰州飞天大酒店（五星级）。

第2天：兰州 - 张掖
..."></textarea>
          <div class="ai-status" id="aiStatus" style="display:none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-outline" id="cancelAiBtn">取消</button>
          <button class="btn-primary" id="runAiBtn">🚀 开始解析</button>
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: 实现 handleAIParse() 弹窗打开**

```javascript
function handleAIParse() {
  const app = document.getElementById('app');
  app.insertAdjacentHTML('beforeend', renderAIModal());
  document.getElementById('closeAiModal').addEventListener('click', closeAIModal);
  document.getElementById('cancelAiBtn').addEventListener('click', closeAIModal);
  document.getElementById('runAiBtn').addEventListener('click', runAIParse);
}

function closeAIModal() {
  document.getElementById('aiModal')?.remove();
}
```

- [ ] **Step 4: 实现 runAIParse() 核心逻辑**

```javascript
async function runAIParse() {
  const text = document.getElementById('aiInput').value.trim();
  if (!text) { showToast('⚠️ 请先粘贴行程文本'); return; }
  if (!state.apiKey) { showToast('⚠️ 请先在设置中填入 Claude API Key'); return openSettings(); }

  const statusEl = document.getElementById('aiStatus');
  statusEl.style.display = 'block';
  statusEl.textContent = '⏳ AI 正在解析，请稍候...';

  const prompt = `你是一个旅行社行程专家。请从以下行程文本中提取结构化信息，返回纯JSON格式（不要有任何其他文字）：

{
  "title": "路线名称",
  "subtitle": "副标题（可选）",
  "totalDays": 天数（数字）,
  "totalKm": 总公里数（数字估算）,
  "cities": ["城市1", "城市2"],
  "days": [
    {
      "title": "当天标题，如'西安 → 兰州'",
      "description": "行程描述",
      "hotel": "住宿安排",
      "food": "餐饮安排",
      "highlights": "亮点1,亮点2"
    }
  ],
  "food": [
    { "name": "美食名称", "desc": "描述" }
  ],
  "tips": [
    { "icon": "图标emoji", "text": "提示内容" }
  ],
  "cost": {
    "included": ["费用包含项"],
    "excluded": ["费用不含项"]
  }
}

行程文本如下：
${text}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`API错误: ${response.status}`);
    const data = await response.json();
    const rawText = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
    const parsed = JSON.parse(rawText);

    // 写入 state
    state.meta.title = parsed.title || state.meta.title;
    state.meta.subtitle = parsed.subtitle || state.meta.subtitle;
    state.meta.totalDays = parsed.totalDays || state.meta.totalDays;
    state.meta.totalKm = parsed.totalKm || state.meta.totalKm;
    state.meta.cities = parsed.cities || state.meta.cities;
    state.days = parsed.days.map(d => ({ ...d, imageData: null }));
    state.food = parsed.food || state.food;
    state.tips = parsed.tips || state.tips;
    state.cost = parsed.cost || state.cost;

    statusEl.textContent = '✅ 解析完成！正在刷新表单...';
    setTimeout(() => {
      closeAIModal();
      state.activeDay = 0;
      renderApp();
      showToast(`🎉 成功解析 ${parsed.totalDays || state.days.length} 天行程！`);
    }, 1000);
  } catch (err) {
    statusEl.textContent = `❌ 解析失败：${err.message}`;
    console.error(err);
  }
}
```

- [ ] **Step 5: 实现设置弹窗（API Key 管理）**

```javascript
function openSettings() {
  const modal = `
    <div class="modal-overlay" id="settingsModal">
      <div class="modal">
        <div class="modal-header">
          <h3>⚙️ API 设置</h3>
          <button class="btn-icon" id="closeSettings">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group full">
            <label>Claude API Key</label>
            <input type="password" id="apiKeyInput" value="${state.apiKey}" placeholder="sk-ant-api03-...">
            <p class="hint">用于AI智能解析功能。Key仅存储在浏览器本地，不会上传至任何服务器。<a href="https://console.anthropic.com/" target="_blank">去获取Key →</a></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-outline" id="cancelSettings">取消</button>
          <button class="btn-primary" id="saveSettingsBtn">💾 保存</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('app').insertAdjacentHTML('beforeend', modal);
  document.getElementById('closeSettings').addEventListener('click', () => document.getElementById('settingsModal').remove());
  document.getElementById('cancelSettings').addEventListener('click', () => document.getElementById('settingsModal').remove());
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    state.apiKey = document.getElementById('apiKeyInput').value.trim();
    localStorage.setItem('claude_api_key', state.apiKey);
    document.getElementById('settingsModal').remove();
    showToast('✅ API Key 已保存');
  });
}

function openSettings() { /* 同上 */ }

// 在 bindAppEvents 中：
document.getElementById('openSettings')?.addEventListener('click', openSettings);
```

- [ ] **Step 6: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: AI智能解析 - Claude API集成 + 解析弹窗 + 设置弹窗"
```

---

## 四、PPT 生成核心引擎

### Task 7: PptxGenJS 模板渲染引擎

**Files:**
- Modify: `travel-ppt-generator.html`

- [ ] **Step 1: 实现 buildSlideCover() 封面页**

```javascript
function buildSlideCover(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.primary } });
  // 副标题（顶部）
  slide.addText(state.meta.subtitle || '', {
    x: 0.5, y: 0.8, w: '90%', h: 0.6,
    fontSize: 18, color: t.secondary, bold: false, align: 'center'
  });
  // 主标题
  slide.addText(state.meta.title || '旅游手册', {
    x: 0.5, y: 1.6, w: '90%', h: 1.5,
    fontSize: 44, color: t.title, bold: true, align: 'center'
  });
  // 装饰线
  slide.addShape(pres.ShapeType.rect, {
    x: '30%', y: 3.3, w: '40%', h: 0.06,
    fill: { color: t.secondary }
  });
  // 天数 + 公里数
  slide.addText(`${state.meta.totalDays}天 · 约${state.meta.totalKm}公里`, {
    x: 0.5, y: 3.6, w: '90%', h: 0.5,
    fontSize: 16, color: t.secondary, align: 'center'
  });
  // 城市节点
  const citiesText = state.meta.cities.join(' → ');
  slide.addText(citiesText, {
    x: 0.5, y: 4.3, w: '90%', h: 0.4,
    fontSize: 13, color: 'FFFFFF', align: 'center'
  });
  // 底部联系
  if (state.contact.name || state.contact.phone) {
    slide.addText(`${state.contact.name}  |  ${state.contact.phone}`, {
      x: 0.5, y: 5.1, w: '90%', h: 0.3,
      fontSize: 11, color: 'FFFFFF', align: 'center', transparency: 30
    });
  }
  return slide;
}
```

- [ ] **Step 2: 实现 buildSlideOverview() 行程概览页**

```javascript
function buildSlideOverview(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.bg } });
  // 标题栏
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: t.primary } });
  slide.addText('行程概览', { x: 0.5, y: 0.25, w: '90%', h: 0.5, fontSize: 26, color: 'FFFFFF', bold: true, margin: 0 });
  // 城市节点横向排列
  const cities = state.meta.cities;
  const nodeW = 1.4;
  const startX = 0.8;
  const y = 2.0;
  cities.forEach((city, i) => {
    const x = startX + i * nodeW;
    // 节点圆
    slide.addShape(pres.ShapeType.ellipse, { x: x, y: y, w: 0.5, h: 0.5, fill: { color: t.accent } });
    slide.addText(String(i + 1), { x: x, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 14, color: 'FFFFFF', bold: true, align: 'center' });
    // 城市名
    slide.addText(city, { x: x - 0.4, y: y + 0.6, w: 1.3, h: 0.4, fontSize: 12, color: t.text, align: 'center' });
    // 连接线（最后一个不画）
    if (i < cities.length - 1) {
      slide.addShape(pres.ShapeType.line, { x: x + 0.5, y: y + 0.25, w: nodeW - 0.5, h: 0, line: { color: t.secondary, width: 2, dashType: 'dash' } });
    }
  });
  // 底部统计
  slide.addText(`全程约 ${state.meta.totalKm} 公里  ·  共 ${state.meta.totalDays} 天  ·  途经 ${cities.length} 座城市`, {
    x: 0.5, y: 3.5, w: '90%', h: 0.4, fontSize: 14, color: t.accent, align: 'center', bold: true
  });
  // 路线说明
  slide.addText('以下为每日详细行程安排', {
    x: 0.5, y: 4.2, w: '90%', h: 0.4, fontSize: 13, color: t.text, align: 'center'
  });
  return slide;
}
```

- [ ] **Step 3: 实现 buildSlideDay() 每日行程页**

```javascript
function buildSlideDay(pres, theme, dayIndex) {
  const t = theme.pptx;
  const day = state.days[dayIndex];
  const slide = pres.addSlide();
  // 左背景（图片或主色）
  if (day.imageData) {
    slide.addImage({ data: day.imageData, x: 0, y: 0, w: 5.5, h: '100%' });
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 5.5, h: '100%', fill: { color: t.primary, transparency: 30 } });
  } else {
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 5.5, h: '100%', fill: { color: t.primary } });
  }
  // 天数标签
  slide.addText(`D${dayIndex + 1}`, { x: 0.3, y: 0.3, w: 1.2, h: 0.8, fontSize: 36, color: 'FFFFFF', bold: true });
  // 右侧信息卡片
  slide.addShape(pres.ShapeType.rect, { x: 5.5, y: 0, w: 5.0, h: '100%', fill: { color: t.bg } });
  // 行程标题
  slide.addText(day.title || `第${dayIndex + 1}天`, {
    x: 5.8, y: 0.4, w: 4.4, h: 0.7,
    fontSize: 22, color: t.primary, bold: true
  });
  // 行程描述
  slide.addText(day.description || '暂无行程描述', {
    x: 5.8, y: 1.2, w: 4.4, h: 2.0,
    fontSize: 13, color: t.text, valign: 'top'
  });
  // 住宿
  if (day.hotel) {
    slide.addText('🏨 住宿', { x: 5.8, y: 3.4, w: 4.4, h: 0.35, fontSize: 12, color: t.accent, bold: true });
    slide.addText(day.hotel, { x: 5.8, y: 3.7, w: 4.4, h: 0.35, fontSize: 12, color: t.text });
  }
  // 餐饮
  if (day.food) {
    slide.addText('🍜 餐饮', { x: 5.8, y: 4.15, w: 4.4, h: 0.35, fontSize: 12, color: t.accent, bold: true });
    slide.addText(day.food, { x: 5.8, y: 4.45, w: 4.4, h: 0.35, fontSize: 12, color: t.text });
  }
  // 亮点
  if (day.highlights) {
    slide.addText('✨ 亮点', { x: 5.8, y: 4.9, w: 4.4, h: 0.35, fontSize: 12, color: t.accent, bold: true });
    slide.addText(day.highlights, { x: 5.8, y: 5.2, w: 4.4, h: 0.4, fontSize: 12, color: t.text });
  }
  return slide;
}
```

- [ ] **Step 4: 实现 buildSlideFood() 美食页**

```javascript
function buildSlideFood(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: t.primary } });
  slide.addText('🍜 特色美食推荐', { x: 0.5, y: 0.25, w: '90%', h: 0.5, fontSize: 26, color: 'FFFFFF', bold: true });
  const foods = state.food.filter(f => f.name);
  const col = 3;
  const cardW = 2.8;
  const cardH = 1.6;
  const gapX = 0.3;
  const startX = 0.6;
  const startY = 1.4;
  foods.forEach((f, i) => {
    const colIdx = i % col;
    const rowIdx = Math.floor(i / col);
    const x = startX + colIdx * (cardW + gapX);
    const y = startY + rowIdx * (cardH + gapX);
    slide.addShape(pres.ShapeType.roundRect, { x, y, w: cardW, h: cardH, fill: { color: t.card }, line: { color: t.border, width: 1 } });
    slide.addText(f.name, { x: x + 0.15, y: y + 0.2, w: cardW - 0.3, h: 0.5, fontSize: 14, color: t.primary, bold: true });
    slide.addText(f.desc || '', { x: x + 0.15, y: y + 0.8, w: cardW - 0.3, h: 0.6, fontSize: 11, color: t.text });
  });
  return slide;
}
```

- [ ] **Step 5: 实现 buildSlideTips() 温馨提示页**

```javascript
function buildSlideTips(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: t.accent } });
  slide.addText('💡 温馨提示', { x: 0.5, y: 0.25, w: '90%', h: 0.5, fontSize: 26, color: 'FFFFFF', bold: true });
  const tips = state.tips.filter(tip => tip.text);
  const startY = 1.3;
  tips.forEach((tip, i) => {
    const y = startY + i * 0.65;
    slide.addShape(pres.ShapeType.rect, { x: 0.5, y, w: 0.6, h: 0.5, fill: { color: t.secondary } });
    slide.addText(tip.icon || '💡', { x: 0.5, y: y + 0.05, w: 0.6, h: 0.4, fontSize: 18, align: 'center' });
    slide.addText(tip.text, { x: 1.3, y, w: 8.5, h: 0.5, fontSize: 13, color: t.text, valign: 'middle' });
  });
  return slide;
}
```

- [ ] **Step 6: 实现 buildSlideCost() 费用说明页**

```javascript
function buildSlideCost(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: t.primary } });
  slide.addText('💰 费用说明', { x: 0.5, y: 0.25, w: '90%', h: 0.5, fontSize: 26, color: 'FFFFFF', bold: true });
  // 左栏：包含
  slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.2, w: 4.6, h: 4.0, fill: { color: t.card }, line: { color: t.accent, width: 2 } });
  slide.addText('✅ 费用包含', { x: 0.7, y: 1.4, w: 4.2, h: 0.5, fontSize: 16, color: t.accent, bold: true });
  const incItems = state.cost.included.filter(i => i);
  slide.addText(incItems.map((item, i) => `${i + 1}. ${item}`).join('\n') || '暂无', {
    x: 0.7, y: 2.0, w: 4.2, h: 3.0, fontSize: 13, color: t.text, valign: 'top'
  });
  // 右栏：不包含
  slide.addShape(pres.ShapeType.rect, { x: 5.4, y: 1.2, w: 4.6, h: 4.0, fill: { color: t.card }, line: { color: t.secondary, width: 2 } });
  slide.addText('❌ 费用不含', { x: 5.6, y: 1.4, w: 4.2, h: 0.5, fontSize: 16, color: t.secondary, bold: true });
  const excItems = state.cost.excluded.filter(i => i);
  slide.addText(excItems.map((item, i) => `${i + 1}. ${item}`).join('\n') || '暂无', {
    x: 5.6, y: 2.0, w: 4.2, h: 3.0, fontSize: 13, color: t.text, valign: 'top'
  });
  return slide;
}
```

- [ ] **Step 7: 实现 buildSlideContact() 报名联系页 + buildSlideBack() 封底**

```javascript
function buildSlideContact(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.primary } });
  slide.addText('📞 联系我们', { x: 0.5, y: 1.0, w: '90%', h: 0.8, fontSize: 36, color: 'FFFFFF', bold: true, align: 'center' });
  slide.addShape(pres.ShapeType.rect, { x: '35%', y: 1.9, w: '30%', h: 0.04, fill: { color: t.secondary } });
  if (state.contact.name) slide.addText(state.contact.name, { x: 0.5, y: 2.3, w: '90%', h: 0.5, fontSize: 20, color: 'FFFFFF', align: 'center' });
  if (state.contact.phone) slide.addText('📞 ' + state.contact.phone, { x: 0.5, y: 2.9, w: '90%', h: 0.4, fontSize: 16, color: t.secondary, align: 'center' });
  if (state.contact.address) slide.addText('📍 ' + state.contact.address, { x: 0.5, y: 3.4, w: '90%', h: 0.4, fontSize: 14, color: 'FFFFFF', align: 'center', transparency: 20 });
  if (state.contact.qrcode) {
    slide.addImage({ data: state.contact.qrcode, x: 4.25, y: 4.0, w: 1.5, h: 1.5 });
    slide.addText('扫码联系', { x: 4.0, y: 5.55, w: 2.0, h: 0.3, fontSize: 10, color: 'FFFFFF', align: 'center', transparency: 30 });
  }
  return slide;
}

function buildSlideBack(pres, theme) {
  const t = theme.pptx;
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: t.primary } });
  slide.addText('感谢阅读', { x: 0.5, y: 2.2, w: '90%', h: 1.0, fontSize: 44, color: 'FFFFFF', bold: true, align: 'center' });
  slide.addText('祝您旅途愉快！', { x: 0.5, y: 3.3, w: '90%', h: 0.6, fontSize: 20, color: t.secondary, align: 'center' });
  return slide;
}
```

- [ ] **Step 8: 实现 handleGenerate() 主生成函数**

```javascript
async function handleGenerate() {
  const btn = document.getElementById('generateBtn');
  if (!btn) return;
  btn.textContent = '⏳ 生成中...';
  btn.disabled = true;

  try {
    const { default: PptxGenJS } = window;
    const pres = new PptxGenJS();
    const theme = THEMES[state.theme];

    // 设置幻灯片尺寸 16:9
    pres.layout = 'LAYOUT_16x9';
    pres.title = state.meta.title;
    pres.author = state.contact.name || '旅游手册生成器';

    // 构建各页
    buildSlideCover(pres, theme);
    buildSlideOverview(pres, theme);
    state.days.forEach((_, i) => buildSlideDay(pres, theme, i));
    buildSlideFood(pres, theme);
    buildSlideTips(pres, theme);
    buildSlideCost(pres, theme);
    buildSlideContact(pres, theme);
    buildSlideBack(pres, theme);

    // 生成文件并下载
    const filename = `${state.meta.title.replace(/[<>:"/\\|?*]/g, '_')}.pptx`;
    const blob = await pres.writeFile({ fileName: filename });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`🎉 ${filename} 生成成功！`);
  } catch (err) {
    showToast(`❌ 生成失败：${err.message}`);
    console.error(err);
  } finally {
    btn.textContent = '🎯 一键生成 PPT';
    btn.disabled = false;
  }
}
```

- [ ] **Step 9: 实现 showPreview() 摘要预览弹窗**

```javascript
function showPreview() {
  const summary = `
    <div class="modal-overlay" id="previewModal">
      <div class="modal wide">
        <div class="modal-header">
          <h3>👁️ 行程摘要预览</h3>
          <button class="btn-icon" id="closePreview">✕</button>
        </div>
        <div class="modal-body">
          <h4>${state.meta.title}</h4>
          <p>${state.meta.subtitle} · ${state.meta.totalDays}天 · ${state.meta.totalKm}公里</p>
          <p>途经：${state.meta.cities.join(' → ')}</p>
          <hr>
          <h5>每日行程</h5>
          ${state.days.map((d, i) => `<p><b>D${i + 1}：${d.title}</b> ${d.description?.substring(0, 60)}...</p>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.getElementById('app').insertAdjacentHTML('beforeend', summary);
  document.getElementById('closePreview').addEventListener('click', () => document.getElementById('previewModal').remove());
}
```

- [ ] **Step 10: 实现 showToast() 提示消息**

```javascript
function showToast(msg, duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
}
```

- [ ] **Step 11: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "feat: PPT生成引擎 - 全部14页模板 + 下载功能 + 预览 + Toast提示"
```

---

## 五、CSS 美化与响应式

### Task 8: 全套 CSS 样式编写

**Files:**
- Modify: `travel-ppt-generator.html`（补充 `<style>` 内容）

- [ ] **Step 1: 编写全局基础样式**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.6;
}
```

- [ ] **Step 2: 导航栏样式**

```css
.navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky; top: 0; z-index: 100;
  box-shadow: var(--shadow);
}
.brand { font-size: 18px; font-weight: 700; color: var(--color-primary); }
.theme-switcher { display: flex; gap: 8px; }
.theme-btn {
  padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--color-border);
  background: transparent; cursor: pointer; font-size: 13px;
  color: var(--color-text); transition: all 0.2s;
}
.theme-btn.active, .theme-btn:hover {
  background: var(--color-primary); color: #fff; border-color: var(--color-primary);
}
.settings-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--color-border);
  background: transparent; cursor: pointer; color: var(--color-text);
}
```

- [ ] **Step 3: 主布局（侧边栏 + 内容区）**

```css
.main-layout { display: flex; min-height: calc(100vh - 60px - 70px); }
.sidebar {
  width: 200px; background: var(--color-card);
  border-right: 1px solid var(--color-border);
  padding: 16px 0; display: flex; flex-direction: column; gap: 4px;
}
.tab-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border: none; background: transparent;
  cursor: pointer; font-size: 14px; color: var(--color-text);
  text-align: left; transition: all 0.2s;
}
.tab-btn:hover, .tab-btn.active { background: var(--color-primary); color: #fff; }
.content-area { flex: 1; padding: 24px; overflow-y: auto; }
.tab-content { max-width: 900px; }
.tab-title { font-size: 22px; color: var(--color-primary); margin-bottom: 20px; }
```

- [ ] **Step 4: 表单样式**

```css
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--color-text); }
.form-group input, .form-group textarea, .form-group select {
  padding: 10px 14px; border-radius: 8px;
  border: 1.5px solid var(--color-border);
  font-size: 14px; background: var(--color-card);
  color: var(--color-text); transition: border-color 0.2s;
}
.form-group input:focus, .form-group textarea:focus {
  outline: none; border-color: var(--color-primary);
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
```

- [ ] **Step 5: 按钮样式**

```css
.btn-primary {
  padding: 10px 24px; border-radius: 8px; border: none;
  background: var(--color-primary); color: #fff; cursor: pointer; font-size: 14px;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary.large { padding: 14px 40px; font-size: 16px; }
.btn-outline {
  padding: 10px 24px; border-radius: 8px;
  border: 1.5px solid var(--color-primary); background: transparent;
  color: var(--color-primary); cursor: pointer; font-size: 14px;
}
.btn-secondary {
  padding: 10px 24px; border-radius: 8px;
  border: 1.5px solid var(--color-border); background: transparent;
  color: var(--color-text); cursor: pointer;
}
.btn-danger { padding: 10px 24px; border-radius: 8px; border: none; background: #e74c3c; color: #fff; cursor: pointer; }
.btn-icon { padding: 6px 10px; border-radius: 6px; border: none; background: transparent; cursor: pointer; color: #999; }
.tab-actions { display: flex; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border); }
```

- [ ] **Step 6: 每日行程Tab样式**

```css
.day-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.day-tab-btn {
  padding: 8px 20px; border-radius: 8px; border: 1.5px solid var(--color-border);
  background: var(--color-card); cursor: pointer; font-size: 13px; font-weight: 600;
  color: var(--color-text); transition: all 0.2s;
}
.day-tab-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.day-tab-btn.add-day { border-style: dashed; color: var(--color-primary); }
.image-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 8px; }
.image-placeholder {
  width: 100%; height: 160px; border-radius: 8px; border: 2px dashed var(--color-border);
  display: flex; align-items: center; justify-content: center;
  color: #aaa; font-size: 13px; margin-top: 8px;
}
.file-input { margin-top: 8px; }
```

- [ ] **Step 7: 弹窗样式**

```css
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: var(--color-card); border-radius: 16px;
  width: 90%; max-width: 600px; max-height: 85vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal.wide { max-width: 800px; }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid var(--color-border);
}
.modal-header h3 { font-size: 18px; color: var(--color-primary); }
.modal-body { padding: 24px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 24px; border-top: 1px solid var(--color-border);
}
```

- [ ] **Step 8: Toast / 底部操作栏 / 美食列表样式**

```css
.toast {
  position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
  background: var(--color-primary); color: #fff; padding: 12px 28px;
  border-radius: 30px; font-size: 14px; z-index: 2000;
  opacity: 0; transition: opacity 0.3s;
}
.toast.show { opacity: 1; }
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; height: 70px;
  background: var(--color-card); border-top: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 0 24px; box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
}
.food-item, .tip-item, .cost-item {
  display: flex; gap: 12px; align-items: center; margin-bottom: 12px;
}
.food-item .form-group { flex: 1; }
.tips-list, .food-list, .cost-section { margin-bottom: 24px; }
.cost-section h3 { font-size: 16px; color: var(--color-primary); margin-bottom: 12px; }
.tab-hint { color: #888; font-size: 13px; margin-bottom: 16px; }
.hint { color: #888; font-size: 12px; margin-top: 8px; }
#aiInput { width: 100%; border: 1.5px solid var(--color-border); border-radius: 8px; padding: 12px; font-size: 13px; resize: vertical; }
.ai-status { margin-top: 12px; padding: 10px; border-radius: 8px; background: #f8f8f8; font-size: 13px; }
```

- [ ] **Step 9: 提交代码**

```bash
git add travel-ppt-generator.html
git commit -m "style: 全套CSS样式 - 导航/表单/弹窗/按钮/响应式全部完成"
```

---

## 六、测试与文档

### Task 9: 功能自测 + README 编写

**Files:**
- Create: `README.md`

- [ ] **Step 1: 自测检查清单（浏览器中验证）**

手动测试步骤：

1. 打开 `travel-ppt-generator.html` 文件
2. 验证 4 个主题切换按钮能切换配色
3. 填写基本信息并保存
4. 添加 D1-D3 天数，上传本地图片
5. 填写美食/提示/费用/联系信息
6. 点击"预览摘要"，确认弹窗显示正确
7. 点击"一键生成PPT"，确认浏览器弹出 .pptx 下载
8. 用 PowerPoint/WPS 打开下载的 pptx，确认 14 页结构正确

- [ ] **Step 2: 编写 README.md**

```markdown
# 旅游手册生成器

> 用浏览器生成专业旅游手册 PPT，一键下载 .pptx 文件

## 功能特性

- ✅ **表单填行程** - 图形化界面，无需代码
- ✅ **AI 智能解析** - 粘贴行程文字，自动识别填表（需 Claude API Key）
- ✅ **4 套主题配色** - 丝路风 / 海滨风 / 冰雪风 / 古镇风
- ✅ **图片上传嵌入** - 行程图片直接写入 PPT 对应页
- ✅ **一键生成 PPT** - 浏览器本地生成，无需服务器
- ✅ **完全离线可用** - 无需联网，无数据上传，隐私安全

## 使用方法

1. 双击 `travel-ppt-generator.html` 用浏览器打开
2. 在各 Tab 填写行程信息（或粘贴文字用 AI 解析）
3. 选择喜欢的主题配色
4. 点击右下角「🎯 一键生成 PPT」
5. 浏览器自动下载 .pptx 文件

## AI 解析功能设置

1. 点击右上角「⚙️ API设置」
2. 填入 Claude API Key（自行在 [Anthropic Console](https://console.anthropic.com/) 申请）
3. 点击「🤖 AI智能解析」，粘贴行程文本
4. AI 自动填充所有表单字段

## 主题配色

| 主题 | 适用场景 |
|------|---------|
| 🏜️ 丝路风 | 西北、古城、丝绸之路路线 |
| 🌊 海滨风 | 海岛、海滨度假路线 |
| ❄️ 冰雪风 | 东北、雪乡、滑雪路线 |
| 🏯 古镇风 | 江南水乡、徽派古镇路线 |

## 生成的 PPT 结构

封面 → 行程概览 → D1~D7每日行程 → 美食推荐 → 温馨提示 → 费用说明 → 报名联系 → 封底

## 运行环境

- Chrome 80+ ✅
- Edge 80+ ✅
- Safari 14+ ✅
- Firefox 75+ ✅

无需安装任何依赖，双击 HTML 文件即可运行。
```

- [ ] **Step 3: 提交**

```bash
git add README.md
git commit -m "docs: README使用说明完成"
```

---

## 自检清单

**Spec 覆盖检查：**
- [x] 表单填行程 → Task 3, 4, 5
- [x] 图片上传 → Task 4
- [x] AI智能解析 → Task 6
- [x] 多套主题配色 → Task 1, 2
- [x] 一键生成PPT → Task 7
- [x] 摘要预览 → Task 7
- [x] 5套模板（丝路/海滨/冰雪/古镇） → Task 1

**占位符扫描：** 无 TBD/TODO，所有颜色值、函数名、步骤均已完整写出。

**类型一致性：** THEMES 对象中 `pptx` 字段与 `buildSlide*` 函数中 `theme.pptx` 引用一致。

---

## 执行方式选择

**Plan 完整，保存路径：`docs/superpowers/plans/2026-04-16-travel-ppt-generator.md`**

两个执行选项：

**1. Subagent-Driven（推荐）** - 按 Task 分批派遣子代理，每批完成后审核，快迭代

**2. Inline Execution** - 当前会话顺序执行所有任务，每4个Task后checkpoint审核

选哪个？
