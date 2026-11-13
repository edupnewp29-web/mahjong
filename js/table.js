/* ===== 牌桌：畫面＋流程控制（跟電腦打、多人連線共用） ===== */
var Table = (function () {
  var T = { on: false };
  var AI_NAMES = ['阿福伯', '阿珠姨', '阿財叔'], AI_AV = [0, 3, 2];
  var timers = [];
  function later(fn, ms) { var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); fn(); }, ms); timers.push(id); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function delay() { return [450, 900, 1500][SET.speed] || 900; }
  function rel(s) { return (s - T.me + 4) % 4; }
  var REL = ['我', '下家', '對家', '上家'];
  function nm(s) { return T.seats[s].name; }

  /* ---------- 開始 ---------- */
  T.startLocal = function () {
    if (!SET.name) { askName(T.startLocal); return; }
    var cfg = { seed: 'L' + Date.now() + Math.random().toString(36).slice(2, 6), names: [SET.name, AI_NAMES[0], AI_NAMES[1], AI_NAMES[2]], rounds: SET.rd };
    begin({ mode: 'local', cfg: cfg, acts: [], me: 0, lv: SET.lv, teach: !!SET.tch, open: !!SET.open,
      seats: cfg.names.map(function (n, i) { return { name: n, ai: i > 0, av: i > 0 ? AI_AV[i - 1] : SET.av }; }) });
  };
  T.resumeLocal = function () {
    var sv = load('mj_save', null); if (!sv) return;
    begin({ mode: 'local', cfg: sv.cfg, acts: sv.acts, me: 0, lv: sv.lv, teach: sv.teach, open: sv.open,
      seats: sv.cfg.names.map(function (n, i) { return { name: n, ai: i > 0, av: i > 0 ? AI_AV[i - 1] : SET.av }; }) });
  };
  T.startOnline = function (o) { begin(o); };
  function begin(o) {
    clearTimers();
    T.mode = o.mode; T.cfg = o.cfg; T.acts = []; T.me = o.me; T.lv = o.lv; T.teach = o.teach; T.open = o.open; T.seats = o.seats;
    T.roomId = o.roomId || null; T.isHost = !!o.isHost; T.pending = -1; T.lastActAt = Date.now(); T.away = {};
    T.M = MJ.newMatch(T.cfg); T.H = MJ.startHand(T.M); T.H.__names = T.cfg.names;
    T.evIdx = T.H.events.length; T.claimAt = 0; T.sel = null; T.shownResult = -1; T.mySay = -1; T.quiet = true;
    (o.acts || []).forEach(function (a) { applyAct(a); });
    T.quiet = false; T.on = true; T.diceAt = 0;
    go('game');
    if (T.mode === 'local' && !(o.acts || []).length) startDice();
    if (T.mode === 'online') {
      var first = true;
      T.unwatch = Online.watchActs(T.roomId, function (list) {
        var added = false;
        if (first && list.length === 0) startDice();
        T.quiet = first && list.length > 0;
        for (var i = T.acts.length; i < list.length; i++) { applyAct(list[i]); added = true; }
        if (T.quiet) T.shownResult = T.H.phase === 'end' ? -1 : T.shownResult;
        T.quiet = false; first = false;
        if (added) { T.lastActAt = Date.now(); render(); tick(); }
      });
      T.poll = setInterval(function () { if (T.on && !timers.length) tick(); }, 3000);
    }
    render(); tick();
  }
  T.leave = function () {
    T.on = false; clearTimers(); closeSheet();
    if (T.unwatch) { T.unwatch(); T.unwatch = null; }
    if (T.poll) { clearInterval(T.poll); T.poll = null; }
  };
  T.confirmLeave = function () {
    if (T.mode === 'local' && !T.M.over) { toast('牌局已自動存檔，可從首頁「繼續上一場」'); }
    return true;
  };

  /* ---------- 動作 ---------- */
  function applyAct(a) {
    var H = T.H, idx = T.acts.length;
    T.acts.push(a);
    if (a.by && T.seats[a.s] && T.seats[a.s].uid === a.by) T.away[a.s] = false; /* 本人回來了 */
    if (a.a === 'next') {
      if (H.phase === 'end' && !T.M.over) { T.H = MJ.startHand(T.M); T.H.__names = T.cfg.names; T.evIdx = 0; T.sel = null; }
    } else if (a.a !== 'say') {
      var was = H.phase;
      MJ.apply(T.M, H, a);
      if (H.phase === 'claim' && (was !== 'claim' || a.a === 'jk')) { T.claimAt = idx + 1; T.mySay = -1; T.claimStartAt = Date.now(); }
    }
    announce();
  }
  function announce() {
    var H = T.H, ev = H.events;
    for (; T.evIdx < ev.length; T.evIdx++) {
      var e = ev[T.evIdx]; if (T.quiet) continue;
      var w = { dis: MJ.name(e.t), pong: '碰', chow: '吃', mk: '槓', ak: '槓', jk: '槓', hu: '胡', zimo: '自摸', flower: '補花' }[e.e];
      if (e.e === 'start') { startDice(); continue; }
      if (e.e === 'dis') SFX.clack(1); else if (e.e === 'pong' || e.e === 'chow' || e.e === 'mk' || e.e === 'ak' || e.e === 'jk') SFX.clack(1.3);
      if (w && (e.e !== 'flower' || e.s === T.me)) speak(w);
      if (e.e === 'pong' || e.e === 'chow' || e.e === 'mk' || e.e === 'ak' || e.e === 'jk' || e.e === 'hu' || e.e === 'zimo') T.say = { s: e.s, w: w, at: Date.now() };
      if (e.e === 'dis' && e.s !== T.me) T.pop = { t: e.t, at: Date.now() };
    }
  }
  function startDice() { T.diceAt = Date.now(); SFX.dice(); SFX.deal(); setTimeout(render, 950); setTimeout(render, 1750); setTimeout(function () { render(); }, 2700); }
  function push(a) {
    if (T.mode === 'local') {
      applyAct(a);
      save('mj_save', { cfg: T.cfg, acts: T.acts, lv: T.lv, teach: T.teach, open: T.open, handNo: T.M.handNo });
      render(); tick();
    } else {
      var idx = T.acts.length; if (T.pending === idx) return; T.pending = idx;
      a = JSON.parse(JSON.stringify(a)); a.by = Online.uid;
      Online.writeAct(T.roomId, idx, a).catch(function () { /* 別人先寫了，等同步 */ });
    }
  }
  function controller() { return T.mode === 'local' || T.isHost || Date.now() - T.lastActAt > 25000; }
  function isAI(s) { return T.seats[s].ai; }

  /* ---------- 流程 ---------- */
  function tick() {
    if (!T.on) return;
    clearTimers();
    var H = T.H;
    if (H.phase === 'end') { if (T.shownResult !== H.no) { T.shownResult = H.no; later(showResult, 700); } return; }
    if (T.mode === 'online' && T.pending === T.acts.length) return;
    if (T.diceAt && Date.now() - T.diceAt < 2400) { later(tick, 2450 - (Date.now() - T.diceAt)); return; }
    if (H.phase === 'discard') {
      var s = H.turn;
      if (s === T.me) { if (T.mode === 'online') later(function () { autoPlay(s); }, Math.max(1000, 90000 - (Date.now() - T.lastActAt))); return; }
      if (isAI(s) && controller()) later(function () { push(MJAI.turn(H, s, T.lv)); }, delay());
      else if (T.mode === 'online' && controller()) later(function () { autoPlay(s); }, T.away[s] ? delay() + 1500 : Math.max(1000, 60000 - (Date.now() - T.lastActAt)));
      return;
    }
    if (H.phase === 'claim') {
      var C = H.claim, choices = {}, humans = [];
      Object.keys(C.opts).forEach(function (k) { var s = +k; if (isAI(s)) choices[s] = MJAI.claim(H, s, T.lv); else humans.push(s); });
      if (T.mode === 'local') {
        if (humans.indexOf(T.me) >= 0 && !preempted(C, choices, T.me)) return; /* 等我按 */
        later(function () { push(MJ.resolveClaims(H, choices)); }, delay() * 0.6);
        return;
      }
      /* 連線：收集大家的回應 */
      var says = {};
      for (var i = T.claimAt; i < T.acts.length; i++) if (T.acts[i].a === 'say') says[T.acts[i].s] = T.acts[i];
      var el = Date.now() - (T.claimStartAt || Date.now());
      if (humans.indexOf(T.me) >= 0 && !says[T.me]) later(function () { T.myClaim(null); }, Math.max(500, 15000 - el));
      if (!controller()) return;
      humans.forEach(function (s) { if (says[s]) choices[s] = says[s].k ? { k: says[s].k, use: says[s].use } : null; else if (T.away[s]) choices[s] = MJAI.claim(H, s, 1); });
      var waiting = humans.filter(function (s) { return !says[s] && !T.away[s]; });
      if (!waiting.length) later(function () { push(MJ.resolveClaims(H, choices)); }, 300);
      else later(function () { push(MJ.resolveClaims(H, choices)); }, Math.max(500, 19000 - el));
    }
  }
  /* 別家的選擇優先權比我高，就不用問我 */
  function preempted(C, choices, me) {
    var o = C.opts[me], myBest = o.hu ? 3 : (o.pong || o.kong) ? 2 : 1, rank = { hu: 3, kong: 2, pong: 2, chow: 1 };
    return Object.keys(choices).some(function (k) {
      var ch = choices[k]; if (!ch) return false;
      if (rank[ch.k] > myBest) return true;
      if (rank[ch.k] === 3 && myBest === 3) { /* 都能胡：離打牌者近的優先 */
        return ((+k - C.from + 4) % 4) < ((me - C.from + 4) % 4);
      }
      return false;
    });
  }
  function autoPlay(s) { if (T.H.phase === 'discard' && T.H.turn === s) { if (s !== T.me && !T.away[s]) toast(nm(s) + ' 斷線了，電腦先代打（回來就換回本人）', 3500); if (s !== T.me) T.away[s] = true; push(MJAI.turn(T.H, s, 1)); } }

  /* ---------- 我的操作 ---------- */
  T.tapTile = function (i) {
    var H = T.H; if (H.phase !== 'discard' || H.turn !== T.me) { toast(H.phase === 'claim' ? '請先決定吃碰或「過」' : '還沒輪到你'); return; }
    if (T.sel === i) { discard(); return; }
    T.sel = i; render();
  };
  function discard() {
    var H = T.H, list = handOrder();
    if (T.sel == null || list[T.sel] == null) return;
    var t = list[T.sel]; T.sel = null;
    push({ a: 'dis', s: T.me, t: t });
  }
  T.myTurnAct = function (a, t) { T.sel = null; push({ a: a, s: T.me, t: t }); };
  T.myClaim = function (ch) {
    var H = T.H; if (H.phase !== 'claim' || !H.claim.opts[T.me]) return;
    if (T.mode === 'local') {
      var choices = {}; Object.keys(H.claim.opts).forEach(function (k) { var s = +k; if (isAI(s)) choices[s] = MJAI.claim(H, s, T.lv); });
      choices[T.me] = ch; push(MJ.resolveClaims(H, choices));
    } else {
      if (T.mySay === T.claimAt) return; T.mySay = T.claimAt;
      push({ a: 'say', s: T.me, k: ch ? ch.k : null, use: ch && ch.use ? ch.use : null });
      render();
    }
  };
  T.showHint = function () { T.hintOnce = true; render(); };

  /* 手牌順序：理好的牌＋剛摸的那張放最後 */
  function handOrder() {
    var H = T.H, h = H.hands[T.me].slice();
    if (H.phase === 'discard' && H.turn === T.me && H.drawn != null) {
      var i = h.indexOf(H.drawn); if (i >= 0) { h.splice(i, 1); MJ.sortTiles(h); h.push(H.drawn); return h; }
    }
    return MJ.sortTiles(h);
  }

  /* ---------- 畫面 ---------- */
  function meldHTML(m, cls) {
    var tl = [];
    if (m.k === 'chow') tl = [m.t, m.t + 1, m.t + 2];
    else if (m.k === 'pong') tl = [m.t, m.t, m.t];
    else if (m.k === 'ak') tl = [-1, m.t, m.t, -1];
    else tl = [m.t, m.t, m.t, m.t];
    return '<span class="meld">' + tl.map(function (t) { return tileHTML(t, cls); }).join('') + '</span>';
  }
  function playerHTML(s, pos) {
    var H = T.H, w = MJ.seatWind(H, s), dealer = s === H.dealer, sc = T.M.scores[s];
    var turn = H.phase === 'discard' && H.turn === s;
    var win = H.phase === 'end' && H.result && H.result.type === 'hu' && H.result.s === s;
    var bub = '';
    return '<div class="pl pl-' + pos + (turn ? ' turn' : '') + '"><div class="av">' + avatarSVG(T.seats[s].av, win ? 'happy' : '') + bub + '</div>' +
      '<div class="pinfo"><b class="pn">' + esc(nm(s)) + '</b><span><span class="pw' + (dealer ? ' dl' : '') + '">' + MJ.WINDS[w] + (dealer ? '莊' + (H.lian ? H.lian : '') : '') + '</span>' +
      (isAI(s) ? '<span class="ai-tag">電腦</span>' : '') + '</span><span class="ps ' + (sc >= 0 ? 'up' : 'dn') + '">' + (sc > 0 ? '+' : '') + sc + '</span>' +
      (pos !== 'me' ? '<span class="pc">' + H.hands[s].length + ' 張</span>' : '') + '</div></div>';
  }
  function extras(s, cls) {
    var H = T.H, h = H.melds[s].map(function (m) { return meldHTML(m, cls); }).join('');
    if (H.flowers[s].length) h += '<span class="flw">' + H.flowers[s].map(function (t) { return tileHTML(t, cls); }).join('') + '</span>';
    return h;
  }
  function openHand(s) { return T.open && T.mode === 'local' && isAI(s); }
  function riverHTML(s, cls) {
    var H = T.H, rv = H.rivers[s], last = H.last && H.last.s === s && (H.phase === 'claim' || (H.phase === 'discard' && H.turn === (s + 1) % 4));
    var fresh = last && T.animDone !== H.no + ':' + H.discards; if (fresh) T.animNext = H.no + ':' + H.discards;
    return '<div class="rv ' + cls + '">' + rv.map(function (t, i) { return tileHTML(t, last && i === rv.length - 1 ? 'last' + (fresh ? ' fresh' : '') : ''); }).join('') + '</div>';
  }
  function backsHTML(s) {
    var H = T.H;
    if (openHand(s)) return MJ.sortTiles(H.hands[s].slice()).map(function (t) { return tileHTML(t, 'mini'); }).join('');
    var n = H.hands[s].length, h = ''; for (var i = 0; i < n; i++) h += '<i class="bk"></i>'; return h;
  }
  /* 牌牆：沿著桌邊四面各 18 墩，摸一張少一張；最後 16 張（留牌）金邊 */
  function wallSides() {
    var H = T.H, off = rel(H.dealer) * 18, out = [[], [], [], []];
    for (var j = 0; j < 72; j++) {
      var cnt = 0, res = false;
      for (var q = 0; q < 2; q++) { var i = j * 2 + q; if (i >= H.f && i < H.b) { cnt++; if (i >= H.b - MJ.RESERVE) res = true; } }
      var slot = (j + off) % 72, side = (slot / 18) | 0, pos = slot % 18;
      out[side][side < 2 ? 17 - pos : pos] = '<i class="wb w' + cnt + (res ? ' res' : '') + '"></i>';
    }
    return out.map(function (x) { return x.join(''); });
  }
  function blocks(n) { var h = ''; for (var i = 0; i < n; i++) h += '<i></i>'; return h; }
  function seatHTML(s, pos) {
    var H = T.H, w = MJ.seatWind(H, s), dealer = s === H.dealer, sc = T.M.scores[s];
    var turn = H.phase === 'discard' && H.turn === s;
    var win = H.phase === 'end' && H.result && H.result.type === 'hu' && H.result.s === s;
    return '<div class="seat2 ' + pos + (turn ? ' turn' : '') + '"><div class="sh"><div class="av">' + avatarSVG(T.seats[s].av, win ? 'happy' : '') + '</div>' +
      '<div class="pinfo"><b class="pn">' + esc(nm(s)) + '</b><span><span class="pw' + (dealer ? ' dl' : '') + '">' + MJ.WINDS[w] + (dealer ? '莊' + (H.lian ? H.lian : '') : '') + '</span>' +
      (isAI(s) ? '<span class="ai-tag">電腦</span>' : '') + '</span><span class="ps ' + (sc >= 0 ? 'up' : 'dn') + '">' + (sc > 0 ? '+' : '') + sc + '　<span class="pc">' + H.hands[s].length + '張</span></span></div></div>' +
      '<div class="sm">' + (openHand(s) ? '<div class="backs wrap">' + backsHTML(s) + '</div>' : '') + extras(s, 'mini') + '</div></div>';
  }
  /* 骰子（三顆，跟台灣麻將一樣） */
  var PIPS = { 1: [[50, 50]], 2: [[30, 30], [70, 70]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]] };
  function dieSVG(v) {
    var red = v === 1 || v === 4;
    return '<svg viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="20" fill="#fff" stroke="#bbb" stroke-width="3"/>' +
      PIPS[v].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (v === 1 ? 15 : 9) + '" fill="' + (red ? '#d32f2f' : '#222') + '"/>'; }).join('') + '</svg>';
  }
  function diceHTML() {
    if (!T.diceAt || Date.now() - T.diceAt > 1700) return '';
    /* 顯示在牌桌正中央 */
    var r = MJ.rng(T.cfg.seed + '#dice' + T.H.no), rolling = Date.now() - T.diceAt < 900, d = [];
    for (var i = 0; i < 3; i++) d.push(rolling ? 1 + Math.floor(Math.random() * 6) : 1 + Math.floor(r() * 6));
    return '<div class="dicebig' + (rolling ? ' roll' : '') + '">' + d.map(function (v) { return '<span class="die">' + dieSVG(v) + '</span>'; }).join('') +
      (rolling ? '' : '<b>' + (d[0] + d[1] + d[2]) + ' 點</b>') + '</div>';
  }
  function compassHTML() {
    var H = T.H, h = '<div class="cp">';
    ['b', 'r', 't', 'l'].forEach(function (p, i) {
      var s = (T.me + i) % 4, on = H.phase !== 'end' && ((H.phase === 'discard' && H.turn === s) || (H.phase === 'claim' && H.claim.from === s));
      h += '<span class="cw ' + p + (on ? ' on' : '') + '">' + MJ.WINDS[MJ.seatWind(H, s)] + '</span>';
    });
    return h + '<div class="cc"><small>' + MJ.WINDS[H.wind] + '風 剩</small><big>' + MJ.remaining(H) + '</big></div></div>';
  }
  function popHTML() { return T.pop && Date.now() - T.pop.at < 1400 && T.H.phase !== 'end' ? '<div class="popbig">' + tileHTML(T.pop.t) + '</div>' : ''; }
  /* 喊「碰！」「胡！」：大字顯示在牌桌上、靠近說話的那一家 */
  function sayHTML() {
    if (!T.say || Date.now() - T.say.at > 2500) return '';
    var pos = ['b', 'r', 't', 'l'][rel(T.say.s)];
    return '<div class="saybig sb-' + pos + '"><b>' + esc(nm(T.say.s)) + '</b>' + T.say.w + '！</div>';
  }
  function fitRivers(top, left, right) {
    var H = T.H, mid = $('mid'), pw = $('pw'), pl = $('plane'); if (!mid || !pw) return;
    /* 斜角牌桌：調整桌面長度，讓投影後剛好填滿可用高度 */
    var avail = pw.clientHeight; if (!avail) return;
    var hh = avail;
    for (var k = 0; k < 3; k++) { pl.style.height = hh + 'px'; var r = pl.getBoundingClientRect().height; if (!r) break; hh = hh * avail / r; }
    pl.style.height = Math.floor(hh) + 'px';
    var W = mid.clientWidth, Hh = mid.clientHeight; if (!W || !Hh) return;
    var n = [H.rivers[top].length, H.rivers[left].length, H.rivers[right].length, H.rivers[T.me].length];
    var C = Math.max(54, Math.min(92, Math.round(Math.min(W, Hh) * 0.28))), cols = W > 420 ? 10 : 6, w, rowsL = 1, rowsR = 1;
    for (w = 44; w > 15; w--) {
      var th = Math.round(w * 4 / 3) + 2, tw = w + 2;
      if (cols * tw > W) continue;
      var S = (W - C - 10) / 2, colsS = Math.floor(S / tw); if (colsS < 1) continue;
      rowsL = Math.ceil(n[1] / colsS); rowsR = Math.ceil(n[2] / colsS);
      var rT = Math.max(1, Math.ceil(n[0] / cols)), rB = Math.max(1, Math.ceil(n[3] / cols));
      if (rT * th + Math.max(C, rowsL * th, rowsR * th) + rB * th + 10 <= Hh) break;
    }
    mid.style.setProperty('--river', w + 'px'); mid.style.setProperty('--cp', C + 'px'); mid.style.setProperty('--cols', cols);
    mid.style.setProperty('--rowsL', Math.max(1, rowsL)); mid.style.setProperty('--rowsR', Math.max(1, rowsR));
  }
  function render() {
    if (!T.on || curView !== 'game') return;
    var H = T.H, M = T.M, myTurn = H.phase === 'discard' && H.turn === T.me;
    var C = H.claim, myOpts = H.phase === 'claim' && C.opts[T.me] && !(T.mode === 'online' && T.mySay === T.claimAt) && (T.mode === 'online' || !preemptedLocal()) ? C.opts[T.me] : null;
    /* 上方資訊 */
    $('tableInfo').innerHTML = '<button id="exitBtn">‹ 離開</button><span>' + MJ.WINDS[H.wind] + '風圈 第 ' + (H.no + 1) + ' 局<span class="tv">' + esc(verText()) + '</span></span>' +
      '<span>' + (T.teach ? '' : '<button id="hintBtn">💡提示</button> ') + '<button id="menuBtn">≡ 選單</button></span>';
    /* 牌桌 */
    var top = (T.me + 2) % 4, left = (T.me + 3) % 4, right = (T.me + 1) % 4;
    var wl = wallSides();
    $('stage').innerHTML = seatHTML(top, 'st') + seatHTML(left, 'sl') + seatHTML(right, 'sr') +
      '<div class="pwrap" id="pw"><div class="plane" id="plane">' +
      '<div class="ph ph-t">' + (openHand(top) ? '' : blocks(H.hands[top].length)) + '</div><div class="wl wl-t">' + wl[2] + '</div>' +
      '<div class="prow"><div class="ph ph-l">' + (openHand(left) ? '' : blocks(H.hands[left].length)) + '</div><div class="wl wl-l">' + wl[3] + '</div>' +
      '<div id="mid">' + riverHTML(top, 'rt') + riverHTML(left, 'rl') + compassHTML() + riverHTML(right, 'rr') + riverHTML(T.me, 'rb') + '</div>' +
      '<div class="wl wl-r">' + wl[1] + '</div><div class="ph ph-r">' + (openHand(right) ? '' : blocks(H.hands[right].length)) + '</div></div>' +
      '<div class="wl wl-b">' + wl[0] + '</div></div></div>' + popHTML() + diceHTML() + sayHTML();
    $('mebar').innerHTML = playerHTML(T.me, 'me');
    $('mymelds').innerHTML = extras(T.me, 'md');
    /* 中間訊息 */
    var c = '';
    if (myOpts) c = '<span>' + esc(nm(C.from)) + (C.rob ? ' 加槓' : ' 打出') + '</span>' + tileHTML(C.t, 'xl') + '<span>你要嗎？</span>';
    else if (H.phase === 'end') c = '<span>' + (H.result.type === 'flow' ? '流局' : esc(nm(H.result.s)) + (H.result.from < 0 ? ' 自摸！' : ' 胡了！')) + '</span><button class="act go" id="resBtn">看結果</button>';
    $('center').innerHTML = c;
    var pend = (T.say && Date.now() - T.say.at < 2500) || (T.pop && Date.now() - T.pop.at < 1400);
    if (pend) { clearTimeout(T.sayT); T.sayT = setTimeout(render, 1450); }
    /* 教學提示 */
    var hint = '', showH = T.teach || T.hintOnce;
    if (showH && myTurn) {
      var ad = MJAI.advise(H, T.me), o = MJ.turnOptions(H, T.me);
      if (o.zimo) hint = '🎉 <b>你自摸了！</b>按「自摸」';
      else { hint = '💡 ' + esc(ad.text); if (ad.warn) hint += '<div class="warn">' + esc(ad.warn) + '</div>'; }
      T.rec = o.zimo ? null : ad.best.t;
    } else T.rec = null;
    if (showH && myOpts) hint = '💡 ' + esc(MJAI.claimAdvice(H, T.me));
    if (!myTurn && H.phase !== 'end' && H.hands[T.me].length % 3 === 1) {
      var wt = MJ.waits(H.hands[T.me]);
      if (wt.length) { var v = MJ.visible(H, T.me); hint += (hint ? '<br>' : '') + '<div class="waits">👂 你聽：' + wt.map(function (t) { return tileHTML(t, 'sm') + '<small>剩' + Math.max(0, 4 - v[t]) + '</small>'; }).join(' ') + '</div>'; }
      else if (showH && !myOpts) { var sh = MJ.shanten(MJ.counts(H.hands[T.me]), 5 - H.melds[T.me].length); hint += (hint ? '<br>' : '') + '還差 ' + sh + ' 張聽牌'; }
    }
    if (T.mode === 'online' && H.phase === 'claim' && C.opts[T.me] && T.mySay === T.claimAt) hint = '已送出，等其他人決定…';
    if (!hint && myTurn) hint = '輪到你了！點一張牌，再點一次就打出';
    $('hint').innerHTML = hint; $('hint').classList.toggle('on', !!hint);
    /* 按鈕 */
    var a = '', recK = null;
    if (myOpts && T.teach) { var r = MJAI.claim(H, T.me, 1); recK = r ? r.k + (r.use ? r.use.join(',') : '') : 'pass'; }
    if (myOpts) {
      if (myOpts.hu) a += '<button class="act hu rec" data-c="hu">胡</button>';
      if (myOpts.kong) a += '<button class="act kong' + (recK === 'kong' ? ' rec' : '') + '" data-c="kong">槓</button>';
      if (myOpts.pong) a += '<button class="act pong' + (recK === 'pong' ? ' rec' : '') + '" data-c="pong">碰</button>';
      myOpts.chows.forEach(function (p) {
        var tl = [p[0], p[1], C.t].sort(function (x, y) { return x - y; });
        a += '<button class="act chow' + (recK === 'chow' + p.join(',') ? ' rec' : '') + '" data-c="chow" data-u="' + p.join(',') + '">吃<span class="tl">' + tl.map(function (t) { return tileHTML(t); }).join('') + '</span></button>';
      });
      a += '<button class="act pass' + (recK === 'pass' ? ' rec' : '') + '" data-c="pass">過</button>';
    } else if (myTurn) {
      var to = MJ.turnOptions(H, T.me);
      if (to.zimo) a += '<button class="act hu rec" data-t="zimo">自摸</button>';
      to.ak.forEach(function (t) { a += '<button class="act kong" data-t="ak" data-v="' + t + '">暗槓<span class="tl">' + tileHTML(t) + '</span></button>'; });
      to.jk.forEach(function (t) { a += '<button class="act kong" data-t="jk" data-v="' + t + '">加槓<span class="tl">' + tileHTML(t) + '</span></button>'; });
      a += '<button class="act go" id="disBtn"' + (T.sel == null ? ' disabled style="opacity:.5"' : '') + '>打出</button>';
    }
    $('actions').innerHTML = a;
    /* 手牌 */
    var list = handOrder(), box = $('hand');
    var n = list.length, land = window.innerWidth > window.innerHeight && window.innerHeight < 560;
    var split = !land && (Math.min(window.innerWidth, 900) - 30) / n - 2 < 44 ? Math.ceil(n / 2) : 0, drawnLast = myTurn && H.drawn != null;
    box.style.setProperty('--n', split || n);
    box.innerHTML = list.map(function (t, i) {
      var cls = (T.sel === i ? 'sel ' : '') + (T.rec === t && (T.sel == null || list[T.sel] !== t) && list.indexOf(t) === i ? 'rec ' : '') + (drawnLast && i === n - 1 && !split ? 'new' : '');
      var dealing = T.diceAt && Date.now() - T.diceAt < 2600;
      return (split && i === split ? '<span class="gap"></span>' : '') + tileHTML(t, cls + (dealing ? ' deal' : ''), ' data-i="' + i + '"' + (dealing ? ' style="animation-delay:' + (900 + i * 60) + 'ms"' : ''));
    }).join('');
    fitRivers(top, left, right);
    if (T.animNext) { T.animDone = T.animNext; T.animNext = null; }
    $('gameVer').textContent = verText() + (T.mode === 'online' ? '・連線牌桌' : '');
    /* 事件 */
    box.querySelectorAll('.tile').forEach(function (el) { el.onclick = function () { T.tapTile(+el.dataset.i); }; });
    $('actions').querySelectorAll('[data-c]').forEach(function (b) {
      b.onclick = function () { var k = b.dataset.c; T.myClaim(k === 'pass' ? null : { k: k, use: b.dataset.u ? b.dataset.u.split(',').map(Number) : null }); };
    });
    $('actions').querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { T.myTurnAct(b.dataset.t, b.dataset.v != null ? +b.dataset.v : undefined); }; });
    var db = $('disBtn'); if (db) db.onclick = discard;
    var hb = $('hintBtn'); if (hb) hb.onclick = T.showHint;
    $('menuBtn').onclick = menu;
    $('exitBtn').onclick = function () { $('backBtn').click(); };
    var rb = $('resBtn'); if (rb) rb.onclick = showResult;
    T.hintOnce = false;
  }
  function preemptedLocal() {
    var H = T.H, C = H.claim, choices = {};
    Object.keys(C.opts).forEach(function (k) { var s = +k; if (isAI(s)) choices[s] = MJAI.claim(H, s, T.lv); });
    return preempted(C, choices, T.me);
  }
  T.render = render;
  window.addEventListener('resize', function () { if (T.on) render(); });

  function menu() {
    sheet('<h2>選單</h2><div class="list">' +
      '<button class="item" id="mTeach"><span class="t"><b>🎓 教學提示</b><small>' + (T.teach ? '目前：開' : '目前：關') + '</small></span><span class="badge">' + (T.teach ? '關掉' : '打開') + '</span></button>' +
      '<button class="item" id="mSpeech"><span class="t"><b>🔊 語音報牌</b><small>' + (SET.speech ? '目前：開' : '目前：關') + '</small></span><span class="badge">切換</span></button>' +
      '<button class="item" id="mTai"><span class="t"><b>📋 台數表</b><small>什麼牌型有幾台</small></span><span class="badge">看</span></button>' +
      '<button class="item" id="mScore"><span class="t"><b>📊 目前分數</b><small>每局輸贏</small></span><span class="badge">看</span></button>' +
      '<button class="item" id="mLeave"><span class="t"><b>🚪 離開牌桌</b><small>' + (T.mode === 'local' ? '會自動存檔' : '之後可從「找朋友打」回來') + '</small></span><span class="badge gray">離開</span></button>' +
      '</div><div class="row" style="margin-top:12px"><button class="btn" onclick="closeSheet()">關閉</button></div>');
    $('mTeach').onclick = function () { T.teach = !T.teach; closeSheet(); render(); };
    $('mSpeech').onclick = function () { SET.speech = !SET.speech; saveSet(); closeSheet(); toast('語音報牌：' + (SET.speech ? '開' : '關')); };
    $('mTai').onclick = function () { sheet(Lessons.taiTable() + '<div class="row"><button class="btn primary" onclick="closeSheet()">好</button></div>'); };
    $('mScore').onclick = scoreSheet;
    $('mLeave').onclick = function () { closeSheet(); go(T.mode === 'local' ? 'home' : 'lobby'); };
  }
  function scoreSheet() {
    var M = T.M;
    var rows = M.log.map(function (l) {
      return '<tr><td>' + MJ.WINDS[l.wind] + '風 第' + (l.no + 1) + '局</td><td>' + (l.type === 'flow' ? '流局' : esc(nm(l.s)) + (l.from < 0 ? ' 自摸' : ' 胡（' + esc(nm(l.from)) + ' 放槍）') + ' ' + l.tai + '台') + '</td></tr>';
    }).join('');
    sheet('<h2>目前分數</h2><div class="pay">' + [0, 1, 2, 3].map(function (s) { return '<span>' + esc(nm(s)) + '</span><span class="' + (M.scores[s] >= 0 ? 'p' : 'n') + '">' + (M.scores[s] >= 0 ? '+' : '') + M.scores[s] + '</span>'; }).join('') + '</div>' +
      '<table class="tai">' + (rows || '<tr><td>還沒有結束的局</td></tr>') + '</table><p style="color:#666;font-size:.85em">計分：底 ' + M.di + '、每台 ' + M.perTai + '（莊家另加 1 台，連莊每次再加 2 台）</p><div class="row"><button class="btn primary" onclick="closeSheet()">好</button></div>');
  }

  /* ---------- 結算 ---------- */
  function showResult() {
    var H = T.H, R = H.result, M = T.M; if (!R) return;
    var h = '';
    if (R.type === 'flow') h = '<h2>流局</h2><p>牌摸完了，沒有人胡。莊家連莊。</p>';
    else {
      var s = R.s, tiles = H.hands[s].slice(); if (R.from >= 0 && R.tile != null) tiles.push(R.tile);
      h = '<h2 style="display:flex;align-items:center;gap:10px"><span class="av">' + avatarSVG(T.seats[s].av, 'happy') + '</span>' + esc(nm(s)) + (R.from < 0 ? ' 自摸！' : ' 胡了！') + '</h2>' + (R.from >= 0 ? '<p style="margin:0">' + esc(nm(R.from)) + ' 放槍</p>' : '') +
        '<div class="res-hand">' + H.melds[s].map(function (m) { return meldHTML(m); }).join('') + ' ' + MJ.sortTiles(tiles).map(function (t) { return tileHTML(t, t === R.tile ? 'last' : ''); }).join('') + '</div>' +
        '<table class="tai">' + R.items.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>' + x[1] + ' 台</td></tr>'; }).join('') +
        (R.items.length ? '' : '<tr><td>屁胡（沒有台）</td><td>0 台</td></tr>') + '<tr><td><b>合計</b></td><td>' + R.tai + ' 台</td></tr></table>' +
        (R.lines.some(function (l) { return l.tai > R.tai; }) ? '<p style="color:#666;font-size:.85em;margin:0">莊家' + (R.s === H.dealer ? '胡牌' : '付錢') + '另加 ' + R.dealerTai + ' 台（莊家 1' + (R.dealerTai > 1 ? '＋連' + H.lian + '拉' + H.lian : '') + '）</p>' : '');
    }
    h += '<div class="pay">' + [0, 1, 2, 3].map(function (p) { var v = R.pay[p]; return '<span>' + esc(nm(p)) + (p === T.me ? '（你）' : '') + '</span><span class="' + (v >= 0 ? 'p' : 'n') + '">' + (v > 0 ? '+' : '') + v + '　<small style="color:#777">共 ' + M.scores[p] + '</small></span>'; }).join('') + '</div>';
    h += '<div class="row">' + (M.over ? '<button class="btn primary" id="nxBtn" style="flex:1">看總成績</button>' : '<button class="btn" onclick="closeSheet()">看牌桌</button><button class="btn primary" id="nxBtn" style="flex:1">下一局</button>') + '</div>';
    sheet(h);
    $('nxBtn').onclick = function () {
      closeSheet();
      if (M.over) { matchOver(); return; }
      if (T.H === H) push({ a: 'next' });
    };
  }
  function matchOver() {
    var M = T.M, order = [0, 1, 2, 3].sort(function (a, b) { return M.scores[b] - M.scores[a]; });
    var st = M.stats[T.me], first = order[0] === T.me;
    var key = 'mj_done_' + T.cfg.seed;
    if (!load(key, false)) {
      save(key, true); addStats(st, M.scores[T.me], first);
      if (window.Online && Online.ready) Online.saveMatch({ mode: T.mode, score: M.scores[T.me], hu: st.hu, best: st.best, rank: order.indexOf(T.me) + 1 });
    }
    if (T.mode === 'local') localStorage.removeItem(KP + 'mj_save');
    else if (T.isHost) Online.finishRoom(T.roomId);
    sheet('<h2>🏁 總成績</h2>' + order.map(function (s, i) {
      return '<div class="rank-row' + (s === T.me ? ' me' : '') + '"><span class="n">' + ['🥇', '🥈', '🥉', '4'][i] + '</span><span style="display:flex;gap:8px;align-items:center"><span class="av sm">' + avatarSVG(T.seats[s].av, i === 0 ? 'happy' : '') + '</span><span><b>' + esc(nm(s)) + '</b><br><small style="color:#777">胡 ' + M.stats[s].hu + ' 次（自摸 ' + M.stats[s].zimo + '）・放槍 ' + M.stats[s].pao + '</small></span><span class="' + (M.scores[s] >= 0 ? 'p' : 'n') + '"><b>' + (M.scores[s] >= 0 ? '+' : '') + M.scores[s] + '</b></span></div>';
    }).join('') + '<div class="row" style="margin-top:14px"><button class="btn" id="ovHome">回首頁</button>' + (T.mode === 'local' ? '<button class="btn primary" id="ovAgain" style="flex:1">再來一場</button>' : '') + '</div>');
    $('ovHome').onclick = function () { closeSheet(); go('home'); };
    var ag = $('ovAgain'); if (ag) ag.onclick = function () { closeSheet(); T.startLocal(); };
  }
  return T;
})();
