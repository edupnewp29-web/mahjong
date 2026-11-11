/* ===== 麻將教室：課程＋聽牌練習＋打哪張練習 ===== */
var Lessons = (function () {
  var L = {};
  function row(ts, lbl) { return '<div class="tiles-row">' + (lbl ? '<span class="lbl">' + lbl + '</span>' : '') + ts.map(function (t) { return tileHTML(t); }).join('') + '</div>'; }
  function rng(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
  var TAI = [
    ['莊家', 1, '莊家胡牌，或莊家放槍／被自摸時另加；連莊每次再加 2 台'],
    ['自摸', 1, '自己摸到胡牌的那張'], ['門清', 1, '沒有吃、碰、明槓（暗槓可以）'], ['門清自摸', 3, '門清又自摸'],
    ['獨聽', 1, '只聽一種牌（邊張、中洞、單吊）'], ['正花', 1, '花牌跟自己的門風相同，一張 1 台'], ['花槓', 2, '春夏秋冬或梅蘭菊竹四張全拿'],
    ['三元牌刻子', 1, '中、發、白 三張一樣，每組 1 台'], ['圈風、門風刻子', 1, '跟圈風或自己門風相同的風牌刻子'],
    ['槓上開花', 1, '槓完補牌就自摸'], ['海底撈月', 1, '摸最後一張牌自摸'], ['河底撈魚', 1, '最後一張打出的牌胡'], ['搶槓', 1, '別人加槓的那張剛好讓你胡'],
    ['全求人', 2, '全部吃碰出去，只剩一張單吊別人打的牌胡'], ['平胡', 2, '五組都是順子、沒有字牌和花、聽兩面、不是自摸'], ['三暗刻', 2, '手中藏三組刻子'],
    ['碰碰胡', 4, '五組都是刻子'], ['混一色', 4, '只有一種數字牌＋字牌'], ['小三元', 4, '中發白兩組刻子＋一組對子'], ['四暗刻', 5, '手中藏四組刻子'],
    ['清一色', 8, '全部同一種花色'], ['大三元', 8, '中發白三組刻子'], ['小四喜', 8, '東南西北三組刻子＋一組對子'], ['五暗刻', 8, '手中藏五組刻子'],
    ['八仙過海', 8, '八張花全拿'], ['七搶一', 8, '有七張花時，搶別人的第八張'],
    ['大四喜', 16, '東南西北四組刻子'], ['字一色', 16, '全部都是字牌'], ['天胡', 16, '莊家開牌就胡'], ['地胡', 16, '閒家第一次摸牌就自摸']
  ];
  L.taiTable = function () {
    return '<h2>台數表</h2><table class="tai">' + TAI.map(function (x) { return '<tr><td><b>' + x[0] + '</b><br><small style="color:#666">' + x[2] + '</small></td><td>' + x[1] + ' 台</td></tr>'; }).join('') +
      '</table><p style="color:#666;font-size:.85em">計分：每家付「底 30 ＋ 台數 × 10」。自摸三家都付，放槍由放槍的人付。</p>';
  };
  var LIST = [
    { id: 'tiles', t: '① 認識麻將牌', s: '萬、筒、條、字、花' },
    { id: 'win', t: '② 怎樣才算胡牌', s: '五組＋一對' },
    { id: 'claim', t: '③ 吃、碰、槓、補花', s: '拿別人打的牌' },
    { id: 'flow', t: '④ 一局怎麼進行', s: '莊家、摸打、流局' },
    { id: 'tai', t: '⑤ 台數怎麼算', s: '台數表' },
    { id: 'tips', t: '⑥ 打牌小技巧', s: '先打什麼、怎麼防守' },
    { id: 'qwait', t: '🎯 練習：聽什麼牌？', s: '看手牌，找出能胡的牌' },
    { id: 'qdis', t: '🎯 練習：該打哪一張？', s: '跟電腦老師比一比' }
  ];
  L.list = function () {
    $('lessonsBox').innerHTML = '<div class="note">剛開始學的話，照順序看完再打「教學模式」，打牌時會一直提醒你。</div><div class="list">' +
      LIST.map(function (x) { return '<button class="item" data-l="' + x.id + '"><span class="t"><b>' + x.t + '</b><small>' + x.s + '</small></span><span class="badge">看</span></button>'; }).join('') + '</div>';
    $('lessonsBox').querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { L.open(b.dataset.l); }; });
  };
  L.open = function (id) {
    go('lesson'); $('title').textContent = (LIST.find(function (x) { return x.id === id; }) || {}).t || '課程';
    var box = $('lessonBox'), h = '<div class="panel lesson">';
    if (id === 'tiles') h += '<p>麻將一共 <b>144 張</b>：</p>' + row(rng(0, 8), '萬') + row(rng(9, 17), '筒') + row(rng(18, 26), '條') +
      '<p>以上數字牌各 4 張，一到九。</p>' + row([27, 28, 29, 30], '風牌') + row([31, 32, 33], '三元') + '<p>字牌也各 4 張。</p>' + row(rng(34, 41), '花牌') +
      '<p>花牌各 1 張，拿到就放旁邊並<b>補一張</b>（程式會自動幫你補）。跟自己門風相同的花有台（東＝春、梅；南＝夏、蘭；西＝秋、菊；北＝冬、竹）。</p>';
    else if (id === 'win') h += '<p>每人手上 <b>16 張</b>，摸進第 17 張時如果能湊成「<b>五組＋一對</b>」就胡牌。</p>' +
      '<p><b>順子</b>：同花色連續三張</p>' + row([2, 3, 4]) + '<p><b>刻子</b>：三張一樣</p>' + row([31, 31, 31]) + '<p><b>對子（眼）</b>：兩張一樣</p>' + row([13, 13]) +
      '<p>例如這手牌就胡了：</p>' + row([0, 1, 2, 6, 7, 8, 11, 12, 13, 20, 20, 20, 27, 27, 27, 24, 24]) + '<p>一二三萬、七八九萬、三四五筒、三條刻子、東風刻子＋七條一對。</p><p>字牌（東南西北中發白）<b>不能</b>組順子，只能做刻子或對子。</p>';
    else if (id === 'claim') h += '<p><b>吃</b>：只能吃「上家」（坐你左手邊、在你前面打牌的人）打出的牌，跟手上兩張湊成順子。</p>' + row([3, 4]) + '<p>上家打出 ' + tileHTML(5, 'sm') + ' 就可以吃。</p>' +
      '<p><b>碰</b>：任何人打出的牌，你手上有兩張一樣的就能碰。碰比吃優先。</p><p><b>槓</b>：四張一樣。手上有三張再碰到別人打的叫「明槓」；自己摸齊四張叫「暗槓」；碰過的再摸到第四張叫「加槓」。槓完要從後面補一張。</p>' +
      '<p><b>胡</b>：別人打的牌讓你胡，叫「放槍」，那個人付錢；自己摸到叫「自摸」，三家都付。</p><p>⚠️ 吃碰以後就不是「門清」，會少 1 台。</p>';
    else if (id === 'flow') h += '<p>1. 莊家拿 17 張，其他人 16 張。拿到花牌先補。</p><p>2. 莊家先打一張，然後照「東→南→西→北」逆時針輪流：<b>摸一張、打一張</b>。</p>' +
      '<p>3. 有人打牌時，其他人可以吃、碰、槓、胡。</p><p>4. 牌牆最後留 16 張不摸，摸到只剩 16 張還沒人胡就是<b>流局</b>。</p>' +
      '<p>5. 莊家胡牌或流局，莊家<b>連莊</b>；別人胡牌，就換下一家做莊。四家都做過莊，就是打完<b>一圈</b>。四圈叫<b>一將</b>。</p>';
    else if (id === 'tai') h += L.taiTable();
    else if (id === 'tips') h += '<p>✅ <b>先打孤張字牌</b>：手上只有一張的東南西北，很難用上。但中發白、自己的門風、圈風做成刻子有台，可以留一下。</p>' +
      '<p>✅ <b>先打邊張</b>：一、九比較難連成順子，三到七最好用。</p><p>✅ <b>留「兩面」</b>：' + tileHTML(12, 'sm') + tileHTML(13, 'sm') + ' 聽 ' + tileHTML(11, 'sm') + tileHTML(14, 'sm') + ' 兩種，比 ' + tileHTML(10, 'sm') + tileHTML(12, 'sm') + ' 只聽 ' + tileHTML(11, 'sm') + ' 好。</p>' +
      '<p>✅ <b>看剩幾張</b>：桌上已經出現很多張的牌，就不要等它。</p><p>🛡️ <b>防守</b>：別人吃碰很多次、快胡的時候，打他<b>打過的牌</b>、或已經出現三張的字牌，比較不會放槍。</p>' +
      '<p>🎓 打牌時開「教學模式」，牌上的 ★ 就是電腦老師建議打的牌。</p>';
    else if (id === 'qwait') { box.innerHTML = '<div id="qBox"></div>'; qWait(); return; }
    else if (id === 'qdis') { box.innerHTML = '<div id="qBox"></div>'; qDis(); return; }
    h += '</div>';
    var i = LIST.findIndex(function (x) { return x.id === id; }), nx = LIST[i + 1];
    if (nx) h += '<button class="big primary" id="lnNext">下一課：' + nx.t + '</button>';
    box.innerHTML = h;
    if (nx) $('lnNext').onclick = function () { L.open(nx.id); };
  };

  /* 隨機產生一手胡牌（17 張） */
  function genWin(oneSuit) {
    for (var tries = 0; tries < 200; tries++) {
      var c = new Array(34).fill(0), suit = Math.floor(Math.random() * 3), ok = true, out = [];
      function add(t) { if (c[t] >= 4) { ok = false; return; } c[t]++; out.push(t); }
      for (var g = 0; g < 5 && ok; g++) {
        var s = oneSuit ? suit : Math.floor(Math.random() * 3);
        if (!oneSuit && Math.random() < 0.15) { var h = 27 + Math.floor(Math.random() * 7); add(h); add(h); add(h); continue; }
        var r = Math.floor(Math.random() * 9);
        if (Math.random() < 0.7 && r <= 6) { add(s * 9 + r); add(s * 9 + r + 1); add(s * 9 + r + 2); } else { add(s * 9 + r); add(s * 9 + r); add(s * 9 + r); }
      }
      var ps = oneSuit ? suit * 9 + Math.floor(Math.random() * 9) : (Math.random() < 0.3 ? 27 + Math.floor(Math.random() * 7) : Math.floor(Math.random() * 27));
      add(ps); add(ps);
      if (ok) return MJ.sortTiles(out);
    }
    return null;
  }
  var score = { ok: 0, n: 0 };
  function qWait() {
    var hard = score.n >= 3 && score.ok / score.n > 0.6;
    var w = genWin(hard || Math.random() < 0.4), hand = w.slice(); hand.splice(Math.floor(Math.random() * hand.length), 1);
    var ans = MJ.waits(hand), pick = {};
    var pal = []; var suits = {}; hand.forEach(function (t) { if (t < 27) suits[(t / 9) | 0] = 1; });
    Object.keys(suits).forEach(function (s) { for (var i = 0; i < 9; i++) pal.push(+s * 9 + i); });
    hand.forEach(function (t) { if (t >= 27 && pal.indexOf(t) < 0) pal.push(t); });
    function draw(done) {
      $('qBox').innerHTML = '<div class="panel"><b>這手牌聽哪些牌？</b>（可以選很多張）<div class="qhand">' + hand.map(function (t) { return tileHTML(t); }).join('') + '</div>' +
        '<div class="pal">' + pal.map(function (t) { var cls = done ? (ans.indexOf(t) >= 0 ? 'ok' : pick[t] ? 'bad' : '') : (pick[t] ? 'on' : ''); return tileHTML(t, cls, ' data-t="' + t + '"'); }).join('') + '</div>' +
        (done ? '<div class="note">' + done + '</div><button class="big primary" id="qNext">下一題</button>' : '<button class="big primary" id="qCheck">對答案</button>') +
        '<p class="foot">答對 ' + score.ok + ' / ' + score.n + ' 題' + (hard ? '・挑戰題（清一色）' : '') + '</p></div>';
      if (!done) {
        $('qBox').querySelectorAll('.pal [data-t]').forEach(function (el) { el.onclick = function () { var t = +el.dataset.t; pick[t] = !pick[t]; draw(); }; });
        $('qCheck').onclick = function () {
          var mine = Object.keys(pick).filter(function (k) { return pick[k]; }).map(Number).sort(function (a, b) { return a - b; });
          var right = mine.length === ans.length && mine.every(function (t, i) { return t === ans[i]; });
          score.n++; if (right) score.ok++;
          draw((right ? '✅ 答對了！' : '❌ 差一點。') + '正確答案：聽 ' + ans.map(MJ.short).join('、') + '（綠框）');
        };
      } else $('qNext').onclick = qWait;
    }
    draw();
  }
  function qDis() {
    var w = genWin(false), hand = w.slice();
    for (var k = 0; k < 2; k++) { var i = Math.floor(Math.random() * hand.length), c = MJ.counts(hand), t; do { t = Math.floor(Math.random() * 34); } while (c[t] >= 3); hand[i] = t; }
    MJ.sortTiles(hand);
    var H = { hands: [hand, [], [], []], rivers: [[], [], [], []], melds: [[], [], [], []], flowers: [[], [], [], []], wind: 0, dealer: 0 };
    var ev = MJAI.evaluate(H, 0), best = ev[0];
    function good(t) { var r = ev.find(function (x) { return x.t === t; }); return r && r.sh === best.sh && r.uk >= best.uk; }
    function desc(r) { return '打【' + MJ.short(r.t) + '】→ ' + (r.sh === 0 ? '聽牌，聽 ' + r.ukTiles.length + ' 種共 ' + r.uk + ' 張' : (r.sh < 0 ? '胡了' : '差 ' + r.sh + ' 張聽，有效牌 ' + r.uk + ' 張')); }
    if (best.sh < 0) { qDis(); return; }
    $('qBox').innerHTML = '<div class="panel"><b>你摸到第 17 張，該打哪一張？</b><div class="qhand">' + hand.map(function (t, i) { return tileHTML(t, '', ' data-i="' + i + '"'); }).join('') + '</div><div id="qRes" class="note sub">點一張你想打的牌</div></div>';
    $('qBox').querySelectorAll('.qhand [data-i]').forEach(function (el) {
      el.onclick = function () {
        var t = hand[+el.dataset.i], mine = ev.find(function (x) { return x.t === t; }), ok = good(t);
        score.n++; if (ok) score.ok++;
        $('qRes').className = 'note';
        $('qRes').innerHTML = (ok ? '✅ 很好！' : '🤔 電腦老師會打別張。') + '<br>你的選擇：' + desc(mine) + '<br>老師的選擇：' + desc(best) +
          '<br><small>前三名：' + ev.slice(0, 3).map(desc).join('；') + '</small><br><button class="big primary" id="qNext">下一題</button><p class="foot">答對 ' + score.ok + ' / ' + score.n + '</p>';
        $('qNext').onclick = qDis;
        $('qBox').querySelectorAll('.qhand [data-i]').forEach(function (e2) { e2.onclick = null; });
      };
    });
  }
  return L;
})();
