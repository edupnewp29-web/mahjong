/* ===== 電腦對手與教學建議（同一套判斷） ===== */
(function (G) {
  var MJ = G.MJ || (typeof require !== 'undefined' ? require('./core.js') : null);
  var AI = {};
  function need(H, s) { return 5 - H.melds[s].length; }
  function yakuhai(H, s, t) { return t >= 31 || t === 27 + H.wind || t === 27 + MJ.seatWind(H, s); }

  /* 評估每一張可以打的牌：打掉後的向聽數、有效牌（進張）數 */
  AI.evaluate = function (H, s, tilesOverride, needOverride) {
    var hand = tilesOverride || H.hands[s], n = needOverride != null ? needOverride : need(H, s);
    var c = MJ.counts(hand), v = MJ.visible(H, s), res = [], done = {};
    if (tilesOverride) { /* 尚未進入 visible 的手牌差異不大，忽略 */ }
    hand.forEach(function (t) {
      if (done[t]) return; done[t] = 1;
      c[t]--; res.push({ t: t, sh: MJ.shanten(c, n) }); c[t]++;
    });
    var minSh = Math.min.apply(null, res.map(function (r) { return r.sh; }));
    res.forEach(function (r) {
      r.uk = 0; r.ukTiles = [];
      if (r.sh > minSh + 1) return;
      c[r.t]--;
      for (var x = 0; x < 34; x++) {
        var left = 4 - v[x]; if (left <= 0) continue;
        c[x]++; if (MJ.shanten(c, n) < r.sh) { r.uk += left; r.ukTiles.push([x, left]); } c[x]--;
      }
      c[r.t]++;
    });
    res.sort(function (a, b) { return a.sh - b.sh || b.uk - a.uk || isoScore(c, b.t) - isoScore(c, a.t); });
    return res;
  };
  /* 越孤立、越邊緣的牌越該先打 */
  function isoScore(c, t) {
    if (t >= 27) return c[t] === 1 ? 3 : 0;
    var r = t % 9, near = 0;
    for (var d = -2; d <= 2; d++) if (d && r + d >= 0 && r + d <= 8 && c[t + d]) near++;
    return (r === 0 || r === 8 ? 1 : 0) + (near === 0 ? 2 : 0);
  }

  /* 危險度（0 安全～1 危險）：針對看起來快聽牌的對手 */
  function threats(H, s) {
    var out = [], left = MJ.remaining(H);
    for (var o = 0; o < 4; o++) if (o !== s) {
      var m = H.melds[o].filter(function (x) { return x.k !== 'ak'; }).length;
      if (m >= 3 || (m >= 2 && left < 40) || (left < 20)) out.push(o);
    }
    return out;
  }
  function danger(H, s, t, opps) {
    if (!opps.length) return 0;
    var v = MJ.visible(H, s), d = 0;
    opps.forEach(function (o) {
      var x;
      if (H.rivers[o].indexOf(t) >= 0) x = 0.1;
      else if (t >= 27) x = v[t] >= 3 ? 0.05 : v[t] === 2 ? 0.3 : 0.6;
      else { var r = t % 9; x = (r === 0 || r === 8) ? 0.5 : (r === 1 || r === 7) ? 0.7 : 1; if (v[t] >= 3) x *= 0.5; }
      d = Math.max(d, x);
    });
    return d;
  }
  AI.danger = function (H, s, t) { return danger(H, s, t, threats(H, s)); };
  AI.threats = threats;

  /* 輪到自己：回傳動作 */
  AI.turn = function (H, s, level) {
    var o = MJ.turnOptions(H, s), n = need(H, s);
    if (o.zimo) return { a: 'zimo', s: s };
    var c = MJ.counts(H.hands[s]);
    var cur = MJ.shanten(c, n);
    for (var i = 0; i < o.ak.length; i++) {
      var t = o.ak[i]; c[t] -= 4; var after = MJ.shanten(c, n - 1); c[t] += 4;
      if (after <= cur || level === 0) return { a: 'ak', s: s, t: t };
    }
    for (i = 0; i < o.jk.length; i++) {
      t = o.jk[i]; c[t]--; after = MJ.shanten(c, n); c[t]++;
      if (after <= cur) return { a: 'jk', s: s, t: t };
    }
    return { a: 'dis', s: s, t: AI.pickDiscard(H, s, level) };
  };
  AI.pickDiscard = function (H, s, level) {
    var ev = AI.evaluate(H, s);
    if (level === 0) {
      var pool = ev.filter(function (r) { return r.sh === ev[0].sh; });
      if (Math.random() < 0.25) pool = ev.slice(0, Math.min(ev.length, 4));
      return pool[Math.floor(Math.random() * pool.length)].t;
    }
    if (level >= 2) {
      var opps = threats(H, s);
      if (opps.length && ev[0].sh >= 1) {
        var bestSh = ev[0].sh;
        var cand = ev.map(function (r) { return { t: r.t, score: (r.sh - bestSh) * (ev[0].sh >= 2 ? 0.6 : 1.5) + danger(H, s, r.t, opps) * 2 - r.uk * 0.01 }; });
        cand.sort(function (a, b) { return a.score - b.score; });
        return cand[0].t;
      }
    }
    return ev[0].t;
  };

  /* 別人打牌：要不要吃碰槓胡 */
  function bestAfter(H, s, hand, n) {
    var ev = AI.evaluate(H, s, hand, n);
    return ev.length ? ev[0].sh : MJ.shanten(MJ.counts(hand), n);
  }
  AI.claim = function (H, s, level) {
    var C = H.claim, o = C.opts[s]; if (!o) return null;
    if (o.hu) return { k: 'hu' };
    if (C.rob) return null;
    var t = C.t, hand = H.hands[s], n = need(H, s), sh0 = MJ.shanten(MJ.counts(hand), n);
    if (o.kong) {
      var h3 = hand.slice(); [0, 1, 2].forEach(function () { h3.splice(h3.indexOf(t), 1); });
      if (MJ.shanten(MJ.counts(h3), n - 1) <= sh0) return { k: 'kong' };
    }
    var choice = null, bestSh = 99;
    if (o.pong) {
      var h2 = hand.slice(); h2.splice(h2.indexOf(t), 1); h2.splice(h2.indexOf(t), 1);
      var a = bestAfter(H, s, h2, n - 1);
      var ok = a < sh0 || (a <= sh0 && (yakuhai(H, s, t) || level === 0));
      if (ok) { choice = { k: 'pong' }; bestSh = a; }
    }
    if (o.chows.length && level >= 0) {
      o.chows.forEach(function (p) {
        var hc = hand.slice(); hc.splice(hc.indexOf(p[0]), 1); hc.splice(hc.indexOf(p[1]), 1);
        var b = bestAfter(H, s, hc, n - 1);
        if (b < sh0 && b < bestSh) { choice = { k: 'chow', use: p }; bestSh = b; }
      });
    }
    /* 高手：快聽牌又門清時，別輕易吃碰破門清 */
    if (choice && level >= 2 && H.melds[s].length === 0 && sh0 <= 1 && !yakuhai(H, s, t) && bestSh >= 0) choice = null;
    return choice;
  };

  /* ---------- 教學：用白話說明 ---------- */
  AI.advise = function (H, s) {
    var ev = AI.evaluate(H, s), b = ev[0];
    var opps = threats(H, s);
    var out = { best: b, list: ev, opps: opps };
    if (b.sh === 0) out.text = '打出【' + MJ.short(b.t) + '】就聽牌了！聽 ' + b.ukTiles.map(function (x) { return MJ.short(x[0]) + '（剩' + x[1] + '張）'; }).join('、');
    else out.text = '建議打【' + MJ.short(b.t) + '】：再差 ' + b.sh + ' 張就聽牌，接下來有 ' + b.uk + ' 張牌能讓你進步';
    if (opps.length && b.sh >= 1) {
      var safe = ev.slice().sort(function (x, y) { return danger(H, s, x.t, opps) - danger(H, s, y.t, opps); })[0];
      if (danger(H, s, b.t, opps) > 0.5 && safe.t !== b.t)
        out.warn = '⚠️ ' + opps.map(function (o) { return H.__names ? H.__names[o] : ''; }).join('、') + ' 可能快胡了。【' + MJ.short(b.t) + '】比較危險，想保守可以打【' + MJ.short(safe.t) + '】（' + (H.rivers[opps[0]].indexOf(safe.t) >= 0 ? '對方打過的牌' : '比較安全') + '）';
    }
    return out;
  };
  AI.claimAdvice = function (H, s) {
    var C = H.claim, o = C && C.opts[s]; if (!o) return '';
    if (o.hu) return '可以胡了！按「胡」';
    var r = AI.claim(H, s, 1);
    var sh0 = MJ.shanten(MJ.counts(H.hands[s]), need(H, s));
    if (!r) return '建議「過」：' + (o.pong ? '碰' : '吃') + '了也不會更接近聽牌' + (H.melds[s].length === 0 ? '，而且保留門清（多 1 台）' : '');
    var nm = { pong: '碰', chow: '吃', kong: '槓' }[r.k];
    return '建議「' + nm + '」：' + nm + '了之後離聽牌更近（現在差 ' + Math.max(sh0, 0) + ' 張）' + (yakuhai(H, s, C.t) && r.k !== 'chow' ? '，而且' + MJ.short(C.t) + '刻子有台' : '');
  };

  G.MJAI = AI;
  if (typeof module !== 'undefined') module.exports = AI;
})(typeof window !== 'undefined' ? window : globalThis);
