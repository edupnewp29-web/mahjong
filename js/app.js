/* ===== 外殼：畫面切換、名字、設定、英雄榜、線上名單 ===== */
var APP_VERSION = 'v1.1', APP_DATE = '2026-11-11';
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
var KP = /[?&]guest=1/.test(location.search) ? 'g_' : ''; /* 測試用：同一台電腦模擬另一支手機 */
function load(k, d) { try { var v = localStorage.getItem(KP + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(KP + k, JSON.stringify(v)); } catch (e) { } }
var toastT;
function toast(m, ms) { var t = $('toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(function () { t.style.display = 'none'; }, ms || 2200); }
function sheet(html) { $('sheetBox').innerHTML = html; $('sheet').classList.add('on'); }
function closeSheet() { $('sheet').classList.remove('on'); }
$('sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet' && !$('sheet').dataset.lock) closeSheet(); });
function verText() { return '好友麻將 ' + APP_VERSION + '（' + APP_DATE + ' 更新）'; }

/* ----- 設定與名字（存在這支手機） ----- */
var SET = Object.assign({ name: '', fs: 20, speech: true, num: true, speed: 1, lv: 1, rd: 1, tch: 1, open: false }, load('mj_set', {}));
function saveSet() { save('mj_set', SET); applyFont(); if (window.Online && Online.ready) Online.syncProfile(); }
function applyFont() { document.documentElement.style.setProperty('--fs', SET.fs + 'px'); }
applyFont();
/* 本機戰績（連線時同步到英雄榜） */
var STATS = Object.assign({ games: 0, hu: 0, zimo: 0, score: 0, best: 0, first: 0 }, load('mj_stats', {}));
function addStats(st, score, first) {
  STATS.games++; STATS.hu += st.hu; STATS.zimo += st.zimo; STATS.score += score; if (st.best > STATS.best) STATS.best = st.best; if (first) STATS.first++;
  save('mj_stats', STATS); if (window.Online && Online.ready) Online.syncProfile();
}

/* ----- 語音報牌 ----- */
var zhVoice = null;
function pickVoice() { try { var vs = speechSynthesis.getVoices(); zhVoice = vs.find(function (v) { return /zh[-_]TW/i.test(v.lang); }) || vs.find(function (v) { return /^zh/i.test(v.lang); }) || null; } catch (e) { } }
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { }
function speak(text) {
  if (!SET.speech || !window.speechSynthesis) return;
  try { var u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; if (zhVoice) u.voice = zhVoice; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { }
}

/* ----- 畫面切換 ----- */
var TITLES = { home: '好友麻將', setup: '跟電腦打', game: '牌桌', lobby: '找朋友打', room: '房間', lessons: '麻將教室', lesson: '課程', rank: '英雄榜', online: '線上玩家', settings: '設定' };
var curView = 'home', viewStack = [];
function setHdr() { document.documentElement.style.setProperty('--hdr', $('topbar').offsetHeight + 'px'); }
window.addEventListener('resize', setHdr);
function go(v, noPush) {
  if (!noPush && curView !== v && v !== 'home') viewStack.push(curView);
  if (v === 'home') viewStack = [];
  if (curView === 'game' && v !== 'game' && window.Table) Table.leave();
  if (curView === 'room' && v !== 'room' && window.Room) Room.leave();
  curView = v;
  document.querySelectorAll('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-' + v); });
  $('title').textContent = TITLES[v] || '好友麻將';
  $('backBtn').style.visibility = v === 'home' ? 'hidden' : 'visible';
  $('meChip').textContent = SET.name ? '👤 ' + SET.name : '';
  window.scrollTo(0, 0); setHdr();
  if (v === 'home') renderHome(); else if (v === 'setup') renderSetup(); else if (v === 'rank') renderRank();
  else if (v === 'online') renderOnline(); else if (v === 'settings') renderSettings(); else if (v === 'lobby') renderLobby();
  else if (v === 'lessons' && window.Lessons) Lessons.list();
  if (window.Online && Online.ready) Online.ping(v === 'game' || v === 'room' ? 'playing' : 'idle');
}
$('backBtn').onclick = function () {
  if (curView === 'game' && window.Table && !Table.confirmLeave()) return;
  var p = viewStack.pop(); go(p || 'home', true);
};
document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go')); }; });

function renderHome() {
  $('hello').textContent = SET.name ? SET.name + '，你好！今天打幾圈？' : '歡迎來打麻將！';
  var sv = load('mj_save', null), rc = $('resumeCard');
  if (sv && sv.acts) { rc.style.display = 'flex'; $('resumeInfo').textContent = '跟電腦・已打 ' + (sv.handNo || 0) + ' 局'; rc.onclick = function () { Table.resumeLocal(); }; }
  else rc.style.display = 'none';
  $('homeFoot').innerHTML = esc(window.Online && Online.ready ? '🟢 已連線：可以找朋友打、看英雄榜' : (window.Online && Online.reason ? Online.reason : '離線模式：可以跟電腦打')) + '<br><b>' + esc(verText()) + '</b>';
  var oc = $('onlineChip');
  if (window.Online && Online.ready) {
    oc.style.display = 'flex'; oc.innerHTML = '<span class="dot"></span>目前在線…';
    Online.onlineUsers().then(function (l) { oc.innerHTML = '<span class="dot"></span>目前在線 ' + l.length + ' 人　<span style="font-weight:400;font-size:.8em">點我看名單 ›</span>'; }).catch(function () { oc.style.display = 'none'; });
  } else oc.style.display = 'none';
}

/* 第一次打開：輸入名字（之後同一支手機自動記住） */
function askName(then, change) {
  $('sheet').dataset.lock = change ? '' : '1';
  sheet('<h2>' + (change ? '修改名字' : '請輸入你的名字') + '</h2><p style="margin:4px 0 0;color:#666">朋友會看到這個名字。之後用同一支手機打開會自動記住。</p>' +
    '<input class="txt" id="nmIn" maxlength="12" placeholder="例如：阿明、王媽媽" value="' + esc(SET.name) + '"><div id="nmErr" style="color:#c62828;min-height:1.4em"></div>' +
    '<div class="row">' + (change ? '<button class="btn" onclick="closeSheet()">取消</button>' : '') + '<button class="btn primary" id="nmOk" style="flex:1">' + (change ? '儲存' : '開始') + '</button></div>');
  var inp = $('nmIn');
  setTimeout(function () { try { inp.focus(); } catch (e) { } }, 300);
  function ok() {
    var n = inp.value.replace(/\s+/g, ' ').trim().slice(0, 12);
    if (!n) { $('nmErr').textContent = '請輸入名字'; return; }
    SET.name = n; saveSet(); $('sheet').dataset.lock = ''; closeSheet();
    $('meChip').textContent = '👤 ' + n; if (curView === 'home') renderHome();
    if (window.Online && Online.ready) Online.ping();
    if (then) then();
  }
  $('nmOk').onclick = ok; inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
}

/* ----- 跟電腦打：設定畫面 ----- */
function renderSetup() {
  function chips(id, key) {
    $(id).querySelectorAll('.chip').forEach(function (b) {
      var v = +b.getAttribute('data-' + key);
      b.classList.toggle('on', v === SET[key]);
      b.onclick = function () { SET[key] = v; saveSet(); renderSetup(); };
    });
  }
  chips('lvChips', 'lv'); chips('rdChips', 'rd'); chips('tchChips', 'tch');
  $('openHands').checked = !!SET.open; $('openHands').onchange = function () { SET.open = this.checked; saveSet(); };
  $('startAI').onclick = function () { Table.startLocal(); };
}

/* ----- 設定 ----- */
function renderSettings() {
  var on = window.Online && Online.ready;
  function sw(k, label, sub) { return '<button class="item" data-sw="' + k + '"><span class="t"><b>' + label + '</b><small>' + sub + '</small></span><span class="badge' + (SET[k] ? '' : ' gray') + '">' + (SET[k] ? '開' : '關') + '</span></button>'; }
  $('settingsBox').innerHTML = '<div class="list">' +
    '<button class="item" id="sName"><span class="t"><b>我的名字</b><small>' + (esc(SET.name) || '未設定') + '</small></span><span class="badge">修改</span></button>' +
    '<div class="panel"><h3>字體大小</h3><div class="chips" id="fsChips">' + [[18, '大'], [20, '較大'], [23, '特大']].map(function (x) { return '<button class="chip' + (SET.fs === x[0] ? ' on' : '') + '" data-fs="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<h3>電腦出牌速度</h3><div class="chips" id="spChips">' + [[2, '慢'], [1, '中'], [0, '快']].map(function (x) { return '<button class="chip' + (SET.speed === x[0] ? ' on' : '') + '" data-sp="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    sw('speech', '🔊 語音報牌', '打牌時唸出「五萬」「碰」「胡」') +
    sw('num', '🔢 筒、條牌角加數字', '一眼看出是幾筒、幾條') +
    '<button class="item" id="sLink"><span class="t"><b>📤 分享遊戲給朋友</b><small>複製網址貼到 LINE（會用外部瀏覽器開）</small></span><span class="badge">複製</span></button>' +
    '<button class="item" id="sReset"><span class="t"><b>清除這支手機的紀錄</b><small>本機戰績與未打完的牌局</small></span><span class="badge gray">清除</span></button>' +
    '</div><p class="foot"><b>' + esc(verText()) + '</b><br>' + (on ? '已連線（ID ' + Online.uid.slice(0, 6) + '）' : esc(window.Online && Online.reason || '離線模式')) + '</p>';
  $('sName').onclick = function () { askName(renderSettings, true); };
  $('fsChips').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { SET.fs = +b.dataset.fs; saveSet(); renderSettings(); }; });
  $('spChips').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { SET.speed = +b.dataset.sp; saveSet(); renderSettings(); }; });
  $('settingsBox').querySelectorAll('[data-sw]').forEach(function (b) { b.onclick = function () { var k = b.dataset.sw; SET[k] = !SET[k]; saveSet(); renderSettings(); if (k === 'speech' && SET.speech) speak('五萬'); }; });
  $('sLink').onclick = function () { copyLink(shareURL(''), '🀄 一起來打麻將！點這裡：'); };
  $('sReset').onclick = function () {
    sheet('<h2>確定清除？</h2><p>本機戰績與未打完的牌局會刪除（名字與線上英雄榜不受影響）。</p><div class="row"><button class="btn" onclick="closeSheet()">取消</button><button class="btn primary" id="rsOk">清除</button></div>');
    $('rsOk').onclick = function () { localStorage.removeItem(KP + 'mj_save'); localStorage.removeItem(KP + 'mj_stats'); STATS = { games: 0, hu: 0, zimo: 0, score: 0, best: 0, first: 0 }; closeSheet(); toast('已清除'); renderSettings(); };
  };
}

/* ----- 分享連結（LINE 會用外部瀏覽器開） ----- */
function shareURL(q) {
  var base = location.origin + location.pathname.replace(/index\.html$/, '');
  return base + '?' + (q ? q + '&' : '') + 'openExternalBrowser=1';
}
function copyLink(url, prefix) {
  var txt = (prefix || '') + url;
  function fallback() { sheet('<h2>請長按複製</h2><textarea class="txt" style="height:120px" readonly>' + esc(txt) + '</textarea><div class="row"><button class="btn primary" onclick="closeSheet()">好</button></div>'); }
  var lineUrl = 'https://line.me/R/share?text=' + encodeURIComponent(txt);
  sheet('<h2>邀請朋友</h2><div class="linkbox">' + esc(txt) + '</div><div class="list" style="margin-top:12px">' +
    '<a class="item" href="' + lineUrl + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="t"><b>💬 用 LINE 傳送</b><small>選朋友或群組</small></span><span class="badge">LINE</span></a>' +
    '<button class="item" id="cpBtn"><span class="t"><b>📋 複製連結</b><small>自己貼到 LINE</small></span><span class="badge">複製</span></button></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn" onclick="closeSheet()">關閉</button></div>');
  $('cpBtn').onclick = function () {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { closeSheet(); toast('已複製，貼到 LINE 吧！'); }, fallback);
    else fallback();
  };
}

/* ----- 英雄榜 ----- */
var rankTab = 'hu';
function renderRank() {
  var box = $('rankBox');
  var mine = '<div class="panel"><b>我的戰績（這支手機）</b><div style="margin-top:6px;line-height:1.7">打了 ' + STATS.games + ' 場・胡 ' + STATS.hu + ' 次（自摸 ' + STATS.zimo + '）<br>累積 ' + (STATS.score >= 0 ? '+' : '') + STATS.score + ' 分・最大 ' + STATS.best + ' 台・第一名 ' + STATS.first + ' 次</div></div>';
  if (!window.Online || !Online.ready) { box.innerHTML = mine + '<div class="note">英雄榜需要連線。' + esc(window.Online && Online.reason || '') + '</div>'; return; }
  box.innerHTML = mine + '<div class="tabs"><button data-t="hu">胡牌次數</button><button data-t="score">累積分數</button><button data-t="best">最大台數</button></div><div id="rkList" class="panel" style="padding:0"><div class="note sub">載入中…</div></div>';
  box.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === rankTab); b.onclick = function () { rankTab = b.dataset.t; renderRank(); }; });
  Online.leaderboard(rankTab).then(function (list) {
    var unit = { hu: '次', score: '分', best: '台' }[rankTab];
    $('rkList').innerHTML = list.length ? list.map(function (u, i) {
      return '<div class="rank-row' + (u.id === Online.uid ? ' me' : '') + '"><span class="n">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span><span><b>' + esc(u.name) + '</b><br><small style="color:#777">' + (u.games || 0) + ' 場・胡 ' + (u.hu || 0) + '</small></span><span><b>' + (u[rankTab] || 0) + '</b> ' + unit + '</span></div>';
    }).join('') : '<div class="note sub">還沒有人上榜，打完一場就上榜！</div>';
  }).catch(function (e) { $('rkList').innerHTML = '<div class="note">讀取失敗：' + esc(e.message) + '</div>'; });
}

/* ----- 線上玩家 ----- */
function renderOnline() {
  var box = $('onlineBox');
  if (!window.Online || !Online.ready) { box.innerHTML = '<div class="note">需要連線才能看到線上玩家。</div>'; return; }
  box.innerHTML = '<div class="note sub">載入中…</div>';
  Online.onlineUsers().then(function (list) {
    box.innerHTML = '<div class="list">' + list.map(function (u) {
      var me = u.id === Online.uid;
      return '<div class="item"><span class="dot"></span><span class="t"><b>' + esc(u.name || '訪客') + (me ? '（你）' : '') + '</b><small>' + (u.status === 'playing' ? '正在打牌' : '在大廳') + '</small></span>' +
        (me ? '' : '<button class="badge" data-inv="' + u.id + '" data-n="' + esc(u.name) + '" style="border:0">邀請</button>') + '</div>';
    }).join('') + '</div><button class="big" id="olRefresh">重新整理</button>';
    $('olRefresh').onclick = renderOnline;
    box.querySelectorAll('[data-inv]').forEach(function (b) {
      b.onclick = function () {
        if (!SET.name) { askName(renderOnline); return; }
        b.disabled = true; b.textContent = '邀請中…';
        Room.create().then(function (id) { return Online.invite(b.dataset.inv, id).then(function () { toast('已邀請 ' + b.dataset.n); Room.open(id); }); })
          .catch(function (e) { toast('邀請失敗：' + e.message); b.disabled = false; b.textContent = '邀請'; });
      };
    });
  }).catch(function (e) { box.innerHTML = '<div class="note">讀取失敗：' + esc(e.message) + '</div>'; });
}
function showInvite(d) {
  sheet('<h2>🀄 ' + esc(d.fromName || '朋友') + ' 邀請你打麻將</h2><p>要現在加入嗎？</p><div class="row"><button class="btn" id="invNo">不要</button><button class="btn primary" id="invYes" style="flex:1">加入</button></div>');
  $('invNo').onclick = function () { closeSheet(); Online.clearInvite(); };
  $('invYes').onclick = function () { closeSheet(); Online.clearInvite(); Room.joinById(d.room); };
}

/* ----- 找朋友打（大廳） ----- */
function renderLobby() {
  var box = $('lobbyBox');
  if (!window.Online || !Online.ready) { box.innerHTML = '<div class="note">找朋友打需要連線。' + esc(window.Online && Online.reason || '') + '</div>'; return; }
  box.innerHTML = '<div class="panel"><b>開一桌，邀朋友來</b><p style="margin:6px 0;color:#555;font-size:.9em">最多 4 人，沒坐滿的位子由電腦補上。</p>' +
    '<h3>打幾圈</h3><div class="chips" id="lbRd">' + [[1, '一圈'], [2, '二圈'], [4, '一將']].map(function (x) { return '<button class="chip' + (SET.rd === x[0] ? ' on' : '') + '" data-rd="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<h3>補位電腦程度</h3><div class="chips" id="lbLv">' + [[0, '輕鬆'], [1, '普通'], [2, '高手']].map(function (x) { return '<button class="chip' + (SET.lv === x[0] ? ' on' : '') + '" data-lv="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<button class="big primary" id="lbNew">開新的一桌</button></div>' +
    '<div class="panel"><b>我的牌桌</b><div id="myRooms" class="list" style="margin-top:8px"><div class="note sub">載入中…</div></div></div>' +
    '<button class="big" data-go2="online">看看誰在線上</button>';
  $('lbRd').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { SET.rd = +b.dataset.rd; saveSet(); renderLobby(); }; });
  $('lbLv').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { SET.lv = +b.dataset.lv; saveSet(); renderLobby(); }; });
  box.querySelector('[data-go2]').onclick = function () { go('online'); };
  $('lbNew').onclick = function () {
    if (!SET.name) { askName(function () { $('lbNew').click(); }); return; }
    $('lbNew').disabled = true; Room.create().then(function (id) { Room.open(id); }).catch(function (e) { toast('建立失敗：' + e.message); $('lbNew').disabled = false; });
  };
  Online.myRooms().then(function (rs) {
    $('myRooms').innerHTML = rs.length ? rs.map(function (r) {
      var names = (r.seats || []).filter(Boolean).map(function (s) { return s.name; }).join('、');
      return '<button class="item" data-room="' + r.id + '"><span class="t"><b>' + esc(names) + '</b><small>' + (r.status === 'waiting' ? '等人加入' : '打牌中') + '</small></span><span class="badge">進入</span></button>';
    }).join('') : '<div class="note sub">沒有進行中的牌桌。</div>';
    $('myRooms').querySelectorAll('[data-room]').forEach(function (b) { b.onclick = function () { Room.open(b.dataset.room); }; });
  }).catch(function (e) { $('myRooms').innerHTML = '<div class="note">讀取失敗：' + esc(e.message) + '</div>'; });
}

/* ----- 啟動 ----- */
window.addEventListener('load', function () {
  go('home', true);
  var q = new URLSearchParams(location.search), room = q.get('room');
  function afterName() {
    if (room) {
      toast('連線中，準備加入牌桌…', 4000);
      var tries = 0; (function tryJoin() {
        if (window.Online && Online.ready) { Room.joinById(room); }
        else if (window.Online && Online.failed) toast('無法連線，請稍後再開啟連結');
        else if (tries++ < 60) setTimeout(tryJoin, 250); else toast('無法連線，請稍後再開啟連結');
      })();
      history.replaceState(null, '', location.pathname + (KP ? '?guest=1' : ''));
    }
  }
  if (!SET.name) askName(afterName); else afterName();
});
