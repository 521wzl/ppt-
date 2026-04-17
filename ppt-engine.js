// ppt-engine.js — PptxGenJS加载器 + 所有buildSlide函数 + handleGenerate

let PptxGenJS = null; // 全局类引用

// ---------------------------------------------------------------------------
// PptxGenJS 加载器（CDN下载 → localStorage缓存）
// ---------------------------------------------------------------------------
async function loadPptxLib(onProgress) {
  const cached = localStorage.getItem(PPTX_STORAGE_KEY);
  if (cached) {
    onProgress('从本地缓存加载...');
    try {
      eval(cached);
      PptxGenJS = window.PptxGenJS;
      return;
    } catch (e) {
      onProgress('缓存损坏，重新下载...');
      localStorage.removeItem(PPTX_STORAGE_KEY);
    }
  }
  onProgress('首次下载 PPT 库（仅此一次）...');
  try {
    const resp = await fetch('https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.cjs.js');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const code = await resp.text();
    localStorage.setItem(PPTX_STORAGE_KEY, code);
    onProgress('库已缓存，后续无需联网');
    eval(code);
    PptxGenJS = window.PptxGenJS;
  } catch (e) {
    onProgress('加载失败，请检查网络后刷新重试');
    throw e;
  }
}

// ---------------------------------------------------------------------------
// 图片压缩（Canvas API，≤2MB，MAX_W=1920px）
// ---------------------------------------------------------------------------
async function compressImage(file, maxBytes) {
  maxBytes = maxBytes || 2 * 1024 * 1024;
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var MAX_W = 1920;
      var w = img.width, h = img.height;
      if (w > MAX_W) { h = h * MAX_W / w; w = MAX_W; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var quality = 0.85;
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length * 0.75 > maxBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// buildSlideCover — 封面（全屏主色背景）
// ---------------------------------------------------------------------------
function buildSlideCover(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();

  // 全屏背景
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.primary } });

  // 副标题
  slide.addText(state.meta.subtitle || '', {
    x: 0.5, y: 0.8, w: 9, h: 0.6,
    fontSize: 18, color: t.secondary, align: 'center'
  });

  // 主标题
  slide.addText(state.meta.title || '旅游手册', {
    x: 0.5, y: 1.6, w: 9, h: 1.5,
    fontSize: 44, color: t.title, bold: true, align: 'center'
  });

  // 装饰线
  slide.addShape(pres.ShapeType.rect, { x: 3, y: 3.3, w: 4, h: 0.06, fill: { color: t.secondary } });

  // 天数公里数
  slide.addText(state.meta.totalDays + '天 · 约' + state.meta.totalKm + '公里', {
    x: 0.5, y: 3.6, w: 9, h: 0.5,
    fontSize: 16, color: t.secondary, align: 'center'
  });

  // 城市路线
  if (state.meta.cities && state.meta.cities.length) {
    slide.addText(state.meta.cities.join(' → '), {
      x: 0.5, y: 4.3, w: 9, h: 0.4,
      fontSize: 13, color: 'FFFFFF', align: 'center'
    });
  }

  // 联系信息
  if (state.contact.name || state.contact.phone) {
    slide.addText((state.contact.name || '') + (state.contact.phone ? '  |  ' + state.contact.phone : ''), {
      x: 0.5, y: 5.0, w: 9, h: 0.3,
      fontSize: 11, color: 'FFFFFF', align: 'center', transparency: 30
    });
  }
}

// ---------------------------------------------------------------------------
// buildSlideOverview — 行程概览（城市节点动态间距）
// ---------------------------------------------------------------------------
function buildSlideOverview(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();

  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: t.primary } });
  slide.addText('行程概览', { x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 26, color: 'FFFFFF', bold: true });

  var cities = state.meta.cities || [];
  var totalCities = cities.length;
  var usableW = 9;
  var step = totalCities > 1 ? usableW / (totalCities - 1) : usableW / 2;
  var nodeCX = 0.5;
  var cy = 2.0;

  cities.forEach(function(city, i) {
    var cx = nodeCX + i * step;
    // 节点圆
    slide.addShape(pres.ShapeType.ellipse, { x: cx - 0.25, y: cy - 0.25, w: 0.5, h: 0.5, fill: { color: t.accent } });
    slide.addText(String(i + 1), {
      x: cx - 0.25, y: cy - 0.22, w: 0.5, h: 0.4,
      fontSize: 14, color: 'FFFFFF', bold: true, align: 'center'
    });
    // 城市名（超长截断）
    var label = city.length > 4 ? city.substring(0, 4) + '…' : city;
    slide.addText(label, {
      x: cx - 0.7, y: cy + 0.35, w: 1.4, h: 0.4,
      fontSize: 11, color: t.text, align: 'center'
    });
    // 连接虚线
    if (i < totalCities - 1) {
      slide.addShape(pres.ShapeType.line, {
        x: cx + 0.25, y: cy, w: step - 0.5, h: 0,
        line: { color: t.secondary, width: 2, dashType: 'dash' }
      });
    }
  });

  // 底部统计
  slide.addText('全程约 ' + state.meta.totalKm + ' 公里  ·  共 ' + state.meta.totalDays + ' 天  ·  途经 ' + totalCities + ' 座城市', {
    x: 0.5, y: 3.2, w: 9, h: 0.4,
    fontSize: 14, color: t.accent, align: 'center', bold: true
  });
  slide.addText('以下为每日详细行程安排', {
    x: 0.5, y: 3.8, w: 9, h: 0.4,
    fontSize: 13, color: t.text, align: 'center'
  });
}

// ---------------------------------------------------------------------------
// buildSlideDay — 每日行程页（左侧图片/纯色，右侧信息卡片）
// ---------------------------------------------------------------------------
function buildSlideDay(pres, theme, dayIndex) {
  var t = theme.pptx;
  var day = state.days[dayIndex];
  if (!day) return;
  var slide = pres.addSlide();

  // 左侧区域（5"宽）
  if (day.imageData) {
    slide.addImage({ data: day.imageData, x: 0, y: 0, w: 5, h: 5.625 });
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 5, h: 5.625, fill: { color: t.primary, transparency: 25 } });
  } else {
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 5, h: 5.625, fill: { color: t.primary } });
  }
  slide.addText('D' + (dayIndex + 1), { x: 0.3, y: 0.3, w: 1.2, h: 0.8, fontSize: 36, color: 'FFFFFF', bold: true });

  // 右侧信息区（5"宽）
  slide.addShape(pres.ShapeType.rect, { x: 5, y: 0, w: 5, h: 5.625, fill: { color: t.bg } });
  slide.addText(day.title || ('第' + (dayIndex + 1) + '天'), {
    x: 5.3, y: 0.3, w: 4.4, h: 0.7,
    fontSize: 22, color: t.primary, bold: true
  });
  slide.addText(day.description || '暂无行程描述', {
    x: 5.3, y: 1.1, w: 4.4, h: 2.2,
    fontSize: 13, color: t.text, valign: 'top'
  });

  var y = 3.4;
  if (day.hotel) {
    slide.addText('🏨 住宿', { x: 5.3, y: y, w: 4.4, h: 0.3, fontSize: 12, color: t.accent, bold: true });
    y += 0.35;
    slide.addText(day.hotel, { x: 5.3, y: y, w: 4.4, h: 0.3, fontSize: 12, color: t.text });
    y += 0.4;
  }
  if (day.food) {
    slide.addText('🍜 餐饮', { x: 5.3, y: y, w: 4.4, h: 0.3, fontSize: 12, color: t.accent, bold: true });
    y += 0.35;
    slide.addText(day.food, { x: 5.3, y: y, w: 4.4, h: 0.3, fontSize: 12, color: t.text });
    y += 0.4;
  }
  if (day.highlights) {
    slide.addText('✨ 亮点', { x: 5.3, y: y, w: 4.4, h: 0.3, fontSize: 12, color: t.accent, bold: true });
    y += 0.35;
    slide.addText(day.highlights, { x: 5.3, y: y, w: 4.4, h: 0.4, fontSize: 12, color: t.text });
  }
}

// ---------------------------------------------------------------------------
// buildSlideFood — 美食推荐（3列卡片，含缩略图）
// ---------------------------------------------------------------------------
function buildSlideFood(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: t.primary } });
  slide.addText('🍜 特色美食推荐', { x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 26, color: 'FFFFFF', bold: true });

  var foods = (state.food || []).filter(function(f) { return f.name; });
  var col = 3, cardW = 2.8, cardH = 1.7, gap = 0.3;
  var startX = 0.55, startY = 1.3;

  foods.forEach(function(f, i) {
    var colIdx = i % col;
    var rowIdx = Math.floor(i / col);
    var x = startX + colIdx * (cardW + gap);
    var y = startY + rowIdx * (cardH + gap);
    if (y + cardH > 5.4) return;
    var imgH = f.imageData ? cardH * 0.55 : 0;

    slide.addShape(pres.ShapeType.roundRect, {
      x: x, y: y, w: cardW, h: cardH,
      fill: { color: t.card }, line: { color: t.border, width: 1 }
    });

    if (f.imageData) {
      slide.addImage({ data: f.imageData, x: x + 0.1, y: y + 0.1, w: cardW - 0.2, h: imgH });
    }

    var nameY = y + (f.imageData ? imgH + 0.08 : 0.15);
    slide.addText(f.name, {
      x: x + 0.1, y: nameY, w: cardW - 0.2, h: 0.4,
      fontSize: 13, color: t.primary, bold: true
    });
    slide.addText(f.desc || '', {
      x: x + 0.1, y: nameY + 0.4, w: cardW - 0.2, h: 0.8,
      fontSize: 10, color: t.text
    });
  });
}

// ---------------------------------------------------------------------------
// buildSlideTips — 温馨提示
// ---------------------------------------------------------------------------
function buildSlideTips(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: t.accent } });
  slide.addText('💡 温馨提示', { x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 26, color: 'FFFFFF', bold: true });

  var tips = (state.tips || []).filter(function(tip) { return tip.text; });
  var startY = 1.3;
  tips.forEach(function(tip, i) {
    var y = startY + i * 0.65;
    slide.addShape(pres.ShapeType.rect, { x: 0.5, y: y, w: 0.6, h: 0.5, fill: { color: t.secondary } });
    slide.addText(tip.icon || '💡', {
      x: 0.5, y: y + 0.05, w: 0.6, h: 0.4,
      fontSize: 18, align: 'center'
    });
    slide.addText(tip.text, {
      x: 1.3, y: y, w: 8.5, h: 0.5,
      fontSize: 13, color: t.text, valign: 'middle'
    });
  });
}

// ---------------------------------------------------------------------------
// buildSlideCost — 费用说明（双栏包含/不含对比）
// ---------------------------------------------------------------------------
function buildSlideCost(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.bg } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: t.primary } });
  slide.addText('💰 费用说明', { x: 0.5, y: 0.2, w: 9, h: 0.6, fontSize: 26, color: 'FFFFFF', bold: true });

  // 左栏：费用包含
  slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.2, w: 4.4, h: 4.0, fill: { color: t.card }, line: { color: t.accent, width: 2 } });
  slide.addText('✅ 费用包含', { x: 0.7, y: 1.4, w: 4.0, h: 0.5, fontSize: 16, color: t.accent, bold: true });
  var inc = (state.cost.included || []).filter(function(i) { return i; });
  slide.addText(inc.map(function(item, i) { return (i + 1) + '. ' + item; }).join('\n') || '暂无', {
    x: 0.7, y: 2.0, w: 4.0, h: 3.0,
    fontSize: 13, color: t.text, valign: 'top'
  });

  // 右栏：费用不含
  slide.addShape(pres.ShapeType.rect, { x: 5.1, y: 1.2, w: 4.4, h: 4.0, fill: { color: t.card }, line: { color: t.secondary, width: 2 } });
  slide.addText('❌ 费用不含', { x: 5.3, y: 1.4, w: 4.0, h: 0.5, fontSize: 16, color: t.secondary, bold: true });
  var exc = (state.cost.excluded || []).filter(function(i) { return i; });
  slide.addText(exc.map(function(item, i) { return (i + 1) + '. ' + item; }).join('\n') || '暂无', {
    x: 5.3, y: 2.0, w: 4.0, h: 3.0,
    fontSize: 13, color: t.text, valign: 'top'
  });
}

// ---------------------------------------------------------------------------
// buildSlideContact — 联系我们
// ---------------------------------------------------------------------------
function buildSlideContact(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.primary } });
  slide.addText('📞 联系我们', {
    x: 0.5, y: 1.0, w: 9, h: 0.8,
    fontSize: 36, color: 'FFFFFF', bold: true, align: 'center'
  });
  slide.addShape(pres.ShapeType.rect, { x: 3.5, y: 1.9, w: 3, h: 0.04, fill: { color: t.secondary } });

  if (state.contact.name) {
    slide.addText(state.contact.name, { x: 0.5, y: 2.3, w: 9, h: 0.5, fontSize: 20, color: 'FFFFFF', align: 'center' });
  }
  if (state.contact.phone) {
    slide.addText('📞 ' + state.contact.phone, { x: 0.5, y: 2.9, w: 9, h: 0.4, fontSize: 16, color: t.secondary, align: 'center' });
  }
  if (state.contact.address) {
    slide.addText('📍 ' + state.contact.address, {
      x: 0.5, y: 3.4, w: 9, h: 0.4,
      fontSize: 14, color: 'FFFFFF', align: 'center', transparency: 20
    });
  }
  if (state.contact.qrcode) {
    slide.addImage({ data: state.contact.qrcode, x: 4.25, y: 4.0, w: 1.5, h: 1.5 });
    slide.addText('扫码联系', {
      x: 4.0, y: 5.55, w: 2.0, h: 0.3,
      fontSize: 10, color: 'FFFFFF', align: 'center', transparency: 30
    });
  }
}

// ---------------------------------------------------------------------------
// buildSlideBack — 封底
// ---------------------------------------------------------------------------
function buildSlideBack(pres, theme) {
  var t = theme.pptx;
  var slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: t.primary } });
  slide.addText('感谢阅读', {
    x: 0.5, y: 2.2, w: 9, h: 1.0,
    fontSize: 44, color: 'FFFFFF', bold: true, align: 'center'
  });
  slide.addText('祝您旅途愉快！', {
    x: 0.5, y: 3.3, w: 9, h: 0.6,
    fontSize: 20, color: t.secondary, align: 'center'
  });
}

// ---------------------------------------------------------------------------
// handleGenerate — 生成主逻辑
// ---------------------------------------------------------------------------
function updateGenProgress(msg) {
  var el = document.getElementById('gen-progress-text');
  if (el) el.textContent = msg;
}

async function handleGenerate() {
  if (state.isGenerating) return;
  var filledDays = state.days.filter(function(d) { return d.title; });
  if (filledDays.length === 0) {
    showToast('⚠️ 请至少填写一天的行程信息');
    return;
  }

  state.isGenerating = true;
  var btn = document.getElementById('generateBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }

  try {
    updateGenProgress('正在初始化...');
    var pres = new PptxGenJS();
    var theme = THEMES[state.theme];
    pres.layout = 'LAYOUT_16x9';
    pres.title = state.meta.title;
    pres.author = state.contact.name || '旅游手册生成器';

    updateGenProgress('生成封面...');
    buildSlideCover(pres, theme);

    updateGenProgress('生成行程概览...');
    buildSlideOverview(pres, theme);

    state.days.forEach(function(day, i) {
      if (day.title) {
        updateGenProgress('生成第' + (i + 1) + '天行程...');
        buildSlideDay(pres, theme, i);
      }
    });

    updateGenProgress('生成美食推荐...');
    buildSlideFood(pres, theme);

    updateGenProgress('生成温馨提示...');
    buildSlideTips(pres, theme);

    updateGenProgress('生成费用说明...');
    buildSlideCost(pres, theme);

    updateGenProgress('生成联系我们...');
    buildSlideContact(pres, theme);

    updateGenProgress('生成封底...');
    buildSlideBack(pres, theme);

    updateGenProgress('正在打包文件...');
    var filename = (state.meta.title || '旅游手册').replace(/[<>:"/\\|?*]/g, '_') + '.pptx';

    var blob = await pres.writeFile({ fileName: filename, type: 'blob' });
    if (!blob || blob.size === 0) throw new Error('文件生成失败');

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);

    showToast('🎉 ' + filename + ' 生成成功！');
  } catch (err) {
    showToast('❌ 生成失败：' + err.message);
    console.error('PPT生成错误:', err);
  } finally {
    state.isGenerating = false;
    if (btn) { btn.disabled = false; btn.textContent = '🎯 一键生成 PPT'; }
    setTimeout(function() { updateGenProgress(''); }, 3000);
  }
}
