/* ===== 台灣十六張麻將 核心：牌、胡牌、聽牌、算台、對局流程（純邏輯，可在 node 測試） =====
   牌編號：0-8 萬、9-17 筒、18-26 條、27-30 東南西北、31-33 中發白、34-37 春夏秋冬、38-41 梅蘭菊竹 */
(function (G) {
  var MJ = {};
  var NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var HON = ['東', '南', '西', '北', '中', '發', '白'];
  var FLO = ['春', '夏', '秋', '冬', '梅', '蘭', '菊', '竹'];
  MJ.WINDS = ['東', '南', '西', '北'];
  MJ.name = function (t) {
    if (t < 27) return NUM[t % 9] + ['萬', '筒', '條'][(t / 9) | 0];
    if (t < 34) return HON[t - 27] + (t < 31 ? '風' : t === 31 ? '' : t === 32 ? '' : '板');
    return FLO[t - 34];
  };
  MJ.short = function (t) { return t < 27 ? NUM[t % 9] + ['萬', '筒', '條'][(t / 9) | 0] : t < 34 ? HON[t - 27] : FLO[t - 34]; };
  MJ.suit = function (t) { return t < 27 ? (t / 9) | 0 : t < 34 ? 3 : 4; };
  MJ.isHonor = function (t) { return t >= 27 && t < 34; };
  MJ.isFlower = function (t) { return t >= 34; };
  MJ.sortTiles = function (a) { return a.sort(function (x, y) { return x - y; }); };

  /* ---------- 亂數（以種子決定，多人連線每台手機算出同一副牌） ---------- */
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = hashStr(String(seed)); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  MJ.rng = rng;

  function counts(arr) { var c = new Array(34).fill(0); for (var i = 0; i < arr.length; i++) if (arr[i] < 34) c[arr[i]]++; return c; }
  MJ.counts = counts;

  /* ---------- 向聽數（還差幾張聽牌；-1 = 胡） ---------- */
  var memo = {};
  function suitOpts(c, off) {
    var a = c.slice(off, off + 9), key = a.join('');
    if (memo[key]) return memo[key];
    var seen = {}, res = [];
    (function dfs(i, m, t) {
      while (i < 9 && a[i] === 0) i++;
      if (i >= 9) { var k = m * 16 + t; if (!seen[k]) { seen[k] = 1; res.push([m, t]); } return; }
      if (a[i] >= 3) { a[i] -= 3; dfs(i, m + 1, t); a[i] += 3; }
      if (i < 7 && a[i + 1] && a[i + 2]) { a[i]--; a[i + 1]--; a[i + 2]--; dfs(i, m + 1, t); a[i]++; a[i + 1]++; a[i + 2]++; }
      if (a[i] >= 2) { a[i] -= 2; dfs(i, m, t + 1); a[i] += 2; }
      if (i < 8 && a[i + 1]) { a[i]--; a[i + 1]--; dfs(i, m, t + 1); a[i]++; a[i + 1]++; }
      if (i < 7 && a[i + 2]) { a[i]--; a[i + 2]--; dfs(i, m, t + 1); a[i]++; a[i + 2]++; }
      a[i]--; dfs(i, m, t); a[i]++;
    })(0, 0, 0);
    /* 只留沒有被支配的組合 */
    var out = res.filter(function (x) { return !res.some(function (y) { return (y[0] >= x[0] && y[1] >= x[1]) && (y[0] > x[0] || y[1] > x[1]); }); });
    memo[key] = out; return out;
  }
  function bestNoHead(c, need) {
    var hm = 0, ht = 0;
    for (var i = 27; i < 34; i++) { if (c[i] >= 3) hm++; else if (c[i] === 2) ht++; }
    var A = suitOpts(c, 0), B = suitOpts(c, 9), C = suitOpts(c, 18), best = 0;
    for (var x = 0; x < A.length; x++) for (var y = 0; y < B.length; y++) for (var z = 0; z < C.length; z++) {
      var m = A[x][0] + B[y][0] + C[z][0] + hm, t = A[x][1] + B[y][1] + C[z][1] + ht;
      if (m > need) { m = need; }
      if (t > need - m) t = need - m;
      var v = 2 * m + t; if (v > best) best = v;
    }
    return best;
  }
  MJ.shanten = function (c, need) {
    var best = 2 * need - bestNoHead(c, need);
    for (var i = 0; i < 34; i++) if (c[i] >= 2) {
      c[i] -= 2; var v = 2 * need - bestNoHead(c, need) - 1; c[i] += 2;
      if (v < best) best = v;
    }
    return best;
  };

  /* ---------- 胡牌拆解（列出所有拆法，算台時取最大） ---------- */
  function decomp(c) {
    var out = [];
    for (var p = 0; p < 34; p++) if (c[p] >= 2) {
      c[p] -= 2; var groups = [{ k: 'pair', t: p }];
      (function rec() {
        var i = 0; while (i < 34 && c[i] === 0) i++;
        if (i >= 34) { out.push(groups.slice()); return; }
        if (c[i] >= 3) { c[i] -= 3; groups.push({ k: 'pung', t: i, c: true }); rec(); groups.pop(); c[i] += 3; }
        if (i < 27 && i % 9 < 7 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; groups.push({ k: 'chow', t: i, c: true }); rec(); groups.pop(); c[i]++; c[i + 1]++; c[i + 2]++; }
      })();
      c[p] += 2;
    }
    return out;
  }
  MJ.decomp = decomp;
  MJ.isWinCounts = function (c) {
    var n = 0; for (var i = 0; i < 34; i++) n += c[i];
    if (n % 3 !== 2) return false;
    return decomp(c).length > 0;
  };
  /* 聽哪些牌（手上的牌，不含要胡的那張） */
  MJ.waits = function (hand) {
    var c = counts(hand), w = [];
    for (var t = 0; t < 34; t++) { if (c[t] >= 4) continue; c[t]++; if (MJ.isWinCounts(c)) w.push(t); c[t]--; }
    return w;
  };

  /* ---------- 算台 ---------- */
  function seatWind(H, s) { return (s - H.dealer + 4) % 4; }
  MJ.seatWind = seatWind;
  function flowerTai(H, s) {
    var f = H.flowers[s], w = seatWind(H, s), items = [];
    var seasons = [34, 35, 36, 37].every(function (x) { return f.indexOf(x) >= 0; });
    var plants = [38, 39, 40, 41].every(function (x) { return f.indexOf(x) >= 0; });
    if (seasons) items.push(['春夏秋冬 花槓', 2]); else if (f.indexOf(34 + w) >= 0) items.push(['正花 ' + MJ.short(34 + w), 1]);
    if (plants) items.push(['梅蘭菊竹 花槓', 2]); else if (f.indexOf(38 + w) >= 0) items.push(['正花 ' + MJ.short(38 + w), 1]);
    return items;
  }
  MJ.scoreHand = function (H, s, winTile, how) {
    var hand = H.hands[s].slice();
    if (!how.zimo) hand.push(winTile);
    var melds = H.melds[s], c = counts(hand);
    var exposed = melds.filter(function (m) { return m.k !== 'ak'; }).length;
    var menqing = exposed === 0;
    var before = hand.slice(); before.splice(before.indexOf(winTile), 1);
    var waitN = MJ.waits(before).length;
    var base = [];
    if (how.tian) base.push(['天胡', 16]);
    else if (how.di) base.push(['地胡', 16]);
    if (how.zimo && menqing) base.push(['門清自摸', 3]);
    else if (how.zimo) base.push(['自摸', 1]);
    else if (menqing) base.push(['門清', 1]);
    var quan = !how.zimo && hand.length === 2;
    if (quan) base.push(['全求人', 2]);
    if (waitN === 1 && !quan) base.push(['獨聽', 1]);
    if (how.kongFlower) base.push(['槓上開花', 1]);
    if (how.seaBottom) base.push(['海底撈月', 1]);
    if (how.riverBottom) base.push(['河底撈魚', 1]);
    if (how.rob) base.push(['搶槓', 1]);
    base = base.concat(flowerTai(H, s));
    var best = null;
    decomp(c).forEach(function (gs) {
      var all = gs.concat(melds.map(function (m) { return { k: m.k === 'chow' ? 'chow' : 'pung', t: m.t, c: m.k === 'ak', kong: m.k !== 'chow' && m.k !== 'pong' }; }));
      var items = [], pair = gs[0].t;
      var pungs = all.filter(function (g) { return g.k === 'pung'; }), chows = all.filter(function (g) { return g.k === 'chow'; });
      /* 三元 */
      var dp = pungs.filter(function (g) { return g.t >= 31; }).length;
      if (dp === 3) items.push(['大三元', 8]);
      else if (dp === 2 && pair >= 31) items.push(['小三元', 4]);
      else pungs.forEach(function (g) { if (g.t >= 31) items.push([MJ.short(g.t) + ' 刻', 1]); });
      /* 風 */
      var wp = pungs.filter(function (g) { return g.t >= 27 && g.t < 31; }).length;
      if (wp === 4) items.push(['大四喜', 16]);
      else if (wp === 3 && pair >= 27 && pair < 31) items.push(['小四喜', 8]);
      else pungs.forEach(function (g) {
        if (g.t === 27 + H.wind) items.push(['圈風 ' + MJ.short(g.t), 1]);
        if (g.t === 27 + seatWind(H, s)) items.push(['門風 ' + MJ.short(g.t), 1]);
      });
      if (chows.length === 0) items.push(['碰碰胡', 4]);
      var anyHonor = all.some(function (g) { return g.t >= 27; }) || pair >= 27;
      if (chows.length === 5 && !anyHonor && H.flowers[s].length === 0 && !how.zimo && waitN >= 2 && pair < 27) items.push(['平胡', 2]);
      var suits = {}; all.forEach(function (g) { if (g.t < 27) suits[(g.t / 9) | 0] = 1; }); if (pair < 27) suits[(pair / 9) | 0] = 1;
      var ns = Object.keys(suits).length;
      if (ns === 0) items.push(['字一色', 16]);
      else if (ns === 1 && anyHonor) items.push(['混一色', 4]);
      else if (ns === 1) items.push(['清一色', 8]);
      /* 暗刻 */
      var an = gs.filter(function (g) { return g.k === 'pung'; }).length + melds.filter(function (m) { return m.k === 'ak'; }).length;
      if (!how.zimo) {
        var inPung = gs.some(function (g) { return g.k === 'pung' && g.t === winTile; });
        var inOther = gs.some(function (g) { return (g.k === 'pair' && g.t === winTile) || (g.k === 'chow' && winTile >= g.t && winTile <= g.t + 2); });
        if (inPung && !inOther) an--;
      }
      if (an >= 5) items.push(['五暗刻', 8]); else if (an === 4) items.push(['四暗刻', 5]); else if (an === 3) items.push(['三暗刻', 2]);
      var tot = items.reduce(function (a, x) { return a + x[1]; }, 0);
      if (!best || tot > best.tot) best = { tot: tot, items: items };
    });
    var items = base.concat(best ? best.items : []);
    return { items: items, tai: items.reduce(function (a, x) { return a + x[1]; }, 0) };
  };

  /* ---------- 對局（整場 Match + 單局 Hand） ---------- */
  MJ.RESERVE = 16; /* 留牌 8 墩 */
  MJ.newMatch = function (o) {
    return { seed: String(o.seed), rounds: o.rounds || 1, names: o.names.slice(), di: o.di || 30, perTai: o.perTai || 10,
      scores: [0, 0, 0, 0], dealer: 0, wind: 0, lian: 0, turns: 0, handNo: 0, over: false, log: [], stats: [0, 1, 2, 3].map(function () { return { hu: 0, zimo: 0, pao: 0, best: 0 }; }) };
  };
  function remaining(H) { return H.b - H.f; }
  MJ.remaining = function (H) { return Math.max(0, remaining(H) - MJ.RESERVE); };
  MJ.startHand = function (M) {
    var r = rng(M.seed + '#' + M.handNo), wall = [];
    for (var t = 0; t < 34; t++) for (var k = 0; k < 4; k++) wall.push(t);
    for (t = 34; t < 42; t++) wall.push(t);
    for (var i = wall.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var x = wall[i]; wall[i] = wall[j]; wall[j] = x; }
    var H = { no: M.handNo, dealer: M.dealer, wind: M.wind, lian: M.lian, wall: wall, f: 0, b: wall.length,
      hands: [[], [], [], []], melds: [[], [], [], []], flowers: [[], [], [], []], rivers: [[], [], [], []],
      turn: M.dealer, phase: 'discard', last: null, drawn: null, claim: null, result: null, discards: 0, anyClaim: false, kongDraw: false, events: [] };
    for (var n = 0; n < 16; n++) for (var s0 = 0; s0 < 4; s0++) H.hands[(M.dealer + s0) % 4].push(wall[H.f++]);
    H.hands[M.dealer].push(wall[H.f++]);
    /* 補花：從莊家開始輪流補到沒有花 */
    var again = true;
    while (again && !H.result) {
      again = false;
      for (s0 = 0; s0 < 4 && !H.result; s0++) {
        var s = (M.dealer + s0) % 4, hh = H.hands[s];
        for (var q = hh.length - 1; q >= 0; q--) if (hh[q] >= 34) {
          H.flowers[s].push(hh[q]); hh.splice(q, 1);
          var nt = wall[--H.b]; hh.push(nt); if (nt >= 34) again = true;
          checkFlowerWin(H, M, s); if (H.result) break;
        }
      }
    }
    H.hands.forEach(MJ.sortTiles);
    H.drawn = H.hands[M.dealer][H.hands[M.dealer].length - 1];
    H.events.push({ e: 'start' });
    return H;
  };
  function checkFlowerWin(H, M, s) {
    if (H.flowers[s].length === 8) { endHu(H, M, s, -1, null, { zimo: true, special: [['八仙過海', 8]] }); return; }
    for (var o = 0; o < 4; o++) if (o !== s) {
      if (H.flowers[s].length === 1 && H.flowers[o].length === 7) { endHu(H, M, o, s, null, { zimo: false, special: [['七搶一', 8]] }); return; }
      if (H.flowers[s].length === 7 && H.flowers[o].length === 1) { endHu(H, M, s, o, null, { zimo: false, special: [['七搶一', 8]] }); return; }
    }
  }
  /* 摸牌（含補花）；fromBack 用於槓、補花 */
  function draw(H, M, s, fromBack) {
    while (true) {
      if (remaining(H) <= MJ.RESERVE) { endFlow(H, M); return false; }
      var t = fromBack ? H.wall[--H.b] : H.wall[H.f++];
      if (t >= 34) { H.flowers[s].push(t); H.events.push({ e: 'flower', s: s, t: t }); checkFlowerWin(H, M, s); if (H.result) return false; fromBack = true; continue; }
      H.hands[s].push(t); H.drawn = t; H.turn = s; H.phase = 'discard'; H.claim = null;
      H.events.push({ e: 'draw', s: s });
      return true;
    }
  }
  function endFlow(H, M) {
    H.phase = 'end'; H.result = { type: 'flow', pay: [0, 0, 0, 0] };
    finishHand(H, M);
  }
  function endHu(H, M, s, from, tile, how) {
    var sc = how.special ? { items: how.special, tai: how.special.reduce(function (a, x) { return a + x[1]; }, 0) } : MJ.scoreHand(H, s, tile, how);
    var dealerTai = 1 + 2 * H.lian, pay = [0, 0, 0, 0], payers = from < 0 ? [0, 1, 2, 3].filter(function (x) { return x !== s; }) : [from];
    var lines = [];
    payers.forEach(function (p) {
      var tai = sc.tai + ((s === H.dealer || p === H.dealer) ? dealerTai : 0);
      var amt = M.di + tai * M.perTai; pay[p] -= amt; pay[s] += amt;
      lines.push({ p: p, tai: tai, amt: amt });
    });
    H.phase = 'end';
    H.result = { type: 'hu', s: s, from: from, tile: tile, how: how, items: sc.items, tai: sc.tai, dealerTai: dealerTai, lines: lines, pay: pay };
    finishHand(H, M);
  }
  function finishHand(H, M) {
    var R = H.result;
    for (var i = 0; i < 4; i++) M.scores[i] += R.pay[i];
    if (R.type === 'hu') { var st = M.stats[R.s]; st.hu++; if (R.from < 0) st.zimo++; else M.stats[R.from].pao++; if (R.tai > st.best) st.best = R.tai; }
    M.log.push({ no: H.no, dealer: H.dealer, wind: H.wind, type: R.type, s: R.s, from: R.from, tai: R.tai, pay: R.pay.slice() });
    /* 下一局的莊家、圈風 */
    if (R.type === 'flow' || R.s === H.dealer) { M.lian++; }
    else { M.lian = 0; M.dealer = (M.dealer + 1) % 4; M.turns++; if (M.turns >= 4) { M.turns = 0; M.wind++; } }
    if (M.wind >= M.rounds) M.over = true;
    M.handNo++;
  }

  /* 輪到某家時能做什麼 */
  MJ.turnOptions = function (H, s) {
    var o = { zimo: false, ak: [], jk: [] };
    if (H.phase !== 'discard' || H.turn !== s) return o;
    var c = counts(H.hands[s]);
    o.zimo = MJ.isWinCounts(c);
    if (MJ.remaining(H) > 0) {
      for (var t = 0; t < 34; t++) if (c[t] === 4) o.ak.push(t);
      H.melds[s].forEach(function (m) { if (m.k === 'pong' && c[m.t] > 0) o.jk.push(m.t); });
    }
    return o;
  };
  /* 別人打牌後，每家可以吃碰槓胡 */
  function claimOptions(H, d, t, robOnly) {
    var opts = {}, any = false;
    for (var k = 1; k < 4; k++) {
      var s = (d + k) % 4, h = H.hands[s], c = counts(h), o = { hu: false, pong: false, kong: false, chows: [] };
      c[t]++; o.hu = MJ.isWinCounts(c); c[t]--;
      if (!robOnly) {
        if (c[t] >= 2) o.pong = true;
        if (c[t] >= 3 && MJ.remaining(H) > 0) o.kong = true;
        if (k === 1 && t < 27) {
          var r = t % 9;
          if (r >= 2 && c[t - 2] && c[t - 1]) o.chows.push([t - 2, t - 1]);
          if (r >= 1 && r <= 7 && c[t - 1] && c[t + 1]) o.chows.push([t - 1, t + 1]);
          if (r <= 6 && c[t + 1] && c[t + 2]) o.chows.push([t + 1, t + 2]);
        }
      }
      if (o.hu || o.pong || o.kong || o.chows.length) { opts[s] = o; any = true; }
    }
    return any ? opts : null;
  }
  function removeTiles(h, arr) { arr.forEach(function (t) { var i = h.indexOf(t); if (i >= 0) h.splice(i, 1); }); }

  /* 套用一個動作。act: {a:'dis',s,t} {a:'zimo',s} {a:'ak',s,t} {a:'jk',s,t} {a:'res',s,k,use} (s=-1 = 大家都過) */
  MJ.apply = function (M, H, act) {
    if (H.phase === 'end') return false;
    var s = act.s;
    if (act.a === 'dis') {
      if (H.phase !== 'discard' || H.turn !== s) return false;
      var i = H.hands[s].indexOf(act.t); if (i < 0) return false;
      H.hands[s].splice(i, 1); MJ.sortTiles(H.hands[s]);
      H.rivers[s].push(act.t); H.last = { s: s, t: act.t }; H.discards++; H.kongDraw = false; H.drawn = null;
      H.events.push({ e: 'dis', s: s, t: act.t });
      var opts = claimOptions(H, s, act.t, false);
      if (opts) { H.phase = 'claim'; H.claim = { from: s, t: act.t, opts: opts, rob: false }; }
      else draw(H, M, (s + 1) % 4, false);
      return true;
    }
    if (act.a === 'zimo') {
      if (H.phase !== 'discard' || H.turn !== s || !MJ.turnOptions(H, s).zimo) return false;
      var t = H.drawn != null ? H.drawn : H.hands[s][H.hands[s].length - 1];
      var how = { zimo: true, kongFlower: H.kongDraw, seaBottom: remaining(H) <= MJ.RESERVE,
        tian: s === H.dealer && H.discards === 0 && !H.anyClaim, di: s !== H.dealer && H.rivers[s].length === 0 && !H.anyClaim && H.discards < 4 };
      H.events.push({ e: 'zimo', s: s });
      endHu(H, M, s, -1, t, how); return true;
    }
    if (act.a === 'ak') {
      if (H.phase !== 'discard' || H.turn !== s || MJ.turnOptions(H, s).ak.indexOf(act.t) < 0) return false;
      removeTiles(H.hands[s], [act.t, act.t, act.t, act.t]); H.melds[s].push({ k: 'ak', t: act.t }); H.anyClaim = true;
      H.events.push({ e: 'ak', s: s, t: act.t });
      if (draw(H, M, s, true)) H.kongDraw = true; return true;
    }
    if (act.a === 'jk') {
      if (H.phase !== 'discard' || H.turn !== s || MJ.turnOptions(H, s).jk.indexOf(act.t) < 0) return false;
      removeTiles(H.hands[s], [act.t]); H.drawn = null;
      H.events.push({ e: 'jk', s: s, t: act.t });
      var ro = claimOptions(H, s, act.t, true);
      if (ro) { H.phase = 'claim'; H.claim = { from: s, t: act.t, opts: ro, rob: true }; return true; }
      finishJk(H, M, s, act.t); return true;
    }
    if (act.a === 'res') {
      if (H.phase !== 'claim') return false;
      var C = H.claim;
      if (s < 0 || !act.k) { /* 大家都過 */
        if (C.rob) finishJk(H, M, C.from, C.t);
        else draw(H, M, (C.from + 1) % 4, false);
        return true;
      }
      var o = C.opts[s]; if (!o) return false;
      if (act.k === 'hu' && o.hu) {
        H.events.push({ e: 'hu', s: s, t: C.t });
        endHu(H, M, s, C.from, C.t, { zimo: false, rob: C.rob, riverBottom: !C.rob && remaining(H) <= MJ.RESERVE, di: false });
        return true;
      }
      if (C.rob) return false;
      var river = H.rivers[C.from]; river.pop(); H.anyClaim = true;
      if (act.k === 'pong' && o.pong) {
        removeTiles(H.hands[s], [C.t, C.t]); H.melds[s].push({ k: 'pong', t: C.t, from: C.from });
        H.turn = s; H.phase = 'discard'; H.claim = null; H.drawn = null; H.events.push({ e: 'pong', s: s, t: C.t }); return true;
      }
      if (act.k === 'kong' && o.kong) {
        removeTiles(H.hands[s], [C.t, C.t, C.t]); H.melds[s].push({ k: 'mk', t: C.t, from: C.from });
        H.events.push({ e: 'mk', s: s, t: C.t });
        if (draw(H, M, s, true)) H.kongDraw = true; return true;
      }
      if (act.k === 'chow' && act.use && o.chows.some(function (p) { return p[0] === act.use[0] && p[1] === act.use[1]; })) {
        removeTiles(H.hands[s], act.use); var lo = Math.min(act.use[0], C.t);
        H.melds[s].push({ k: 'chow', t: lo, got: C.t, from: C.from });
        H.turn = s; H.phase = 'discard'; H.claim = null; H.drawn = null; H.events.push({ e: 'chow', s: s, t: C.t }); return true;
      }
      return false;
    }
    return false;
  };
  function finishJk(H, M, s, t) {
    H.melds[s].forEach(function (m) { if (m.k === 'pong' && m.t === t) m.k = 'jk'; });
    H.anyClaim = true;
    if (draw(H, M, s, true)) H.kongDraw = true;
  }
  /* 多人搶同一張：胡 > 碰槓 > 吃；同為胡則離打牌者最近的先 */
  MJ.resolveClaims = function (H, choices) {
    var C = H.claim, best = null, rank = { hu: 3, kong: 2, pong: 2, chow: 1 };
    for (var k = 1; k < 4; k++) {
      var s = (C.from + k) % 4, ch = choices[s];
      if (!ch || !ch.k) continue;
      if (!best || rank[ch.k] > rank[best.k]) best = { a: 'res', s: s, k: ch.k, use: ch.use || null };
    }
    return best || { a: 'res', s: -1, k: null };
  };
  /* 從種子＋動作紀錄重建整場（連線用） */
  MJ.replay = function (cfg, acts) {
    var M = MJ.newMatch(cfg), H = MJ.startHand(M);
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (a.a === 'next') { if (H.phase === 'end' && !M.over) H = MJ.startHand(M); continue; }
      MJ.apply(M, H, a);
    }
    return { M: M, H: H };
  };

  /* 看得到的牌（算剩幾張） */
  MJ.visible = function (H, s) {
    var v = new Array(34).fill(0);
    H.hands[s].forEach(function (t) { v[t]++; });
    for (var p = 0; p < 4; p++) {
      H.rivers[p].forEach(function (t) { v[t]++; });
      H.melds[p].forEach(function (m) {
        if (m.k === 'chow') { v[m.t]++; v[m.t + 1]++; v[m.t + 2]++; }
        else if (m.k === 'pong') v[m.t] += 3; else v[m.t] += 4;
      });
    }
    return v;
  };

  G.MJ = MJ;
  if (typeof module !== 'undefined') module.exports = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
