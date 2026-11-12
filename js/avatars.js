/* ===== 可愛人物頭像 v2（較細緻：立體臉、眉毛、亮眼睛、頭髮光澤、配件） ===== */
(function () {
  var AV = [
    { n: '阿公', bg: '#bfe0ff', shirt: '#4f78c4', collar: 'cardigan', hair: 'bald', hc: '#d6d6d6', glasses: 1, old: 1, brow: '#bdbdbd', mus: 'white' },
    { n: '阿嬤', bg: '#ffd6e6', shirt: '#b8507a', collar: 'round', hair: 'bun', hc: '#ececec', old: 1, blush: 1, pearl: 1, brow: '#c4c4c4', lips: 1 },
    { n: '大叔', bg: '#ffeab0', shirt: '#e08a2e', collar: 'polo', hair: 'short', hc: '#2b2b2b', mus: 'black', stub: 1 },
    { n: '阿姨', bg: '#e2d6ff', shirt: '#8a63d2', collar: 'vneck', hair: 'curly', hc: '#6b3e26', ear: 1, blush: 1, lips: 1 },
    { n: '帥哥', bg: '#c9f2dc', shirt: '#2e9e6a', collar: 'tee', hair: 'spiky', hc: '#1f1f1f' },
    { n: '美女', bg: '#ffdccc', shirt: '#e46a5a', collar: 'round', hair: 'long', hc: '#2a1a14', blush: 1, ear: 1, lips: 1, bow: 1, lash: 1 },
    { n: '老師', bg: '#d4efec', shirt: '#f2f2f2', collar: 'tie', hair: 'part', hc: '#7d7d7d', glasses: 1, brow: '#6d6d6d' },
    { n: '小胖', bg: '#ffe9cc', shirt: '#ef6c00', collar: 'tee', hair: 'cap', hc: '#d32f2f', blush: 1, wide: 1 }
  ];
  var uid = 0;
  function shade(hex, f) { /* f>0 變亮，f<0 變暗 */
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    function m(c) { return Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)); }
    return '#' + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
  }
  window.AVATARS = AV;
  window.avatarSVG = function (i, mood) {
    var a = AV[((i | 0) % AV.length + AV.length) % AV.length], k = 'av' + (uid++), happy = mood === 'happy', s = '';
    var SK = '#f7d2b2', SKD = '#e9b48f', hc = a.hc, hl = shade(hc, 0.35), hd = shade(hc, -0.25);
    s += '<defs>' +
      '<clipPath id="' + k + 'c"><circle cx="50" cy="50" r="50"/></clipPath>' +
      '<radialGradient id="' + k + 'bg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="' + shade(a.bg, 0.55) + '"/><stop offset="1" stop-color="' + a.bg + '"/></radialGradient>' +
      '<radialGradient id="' + k + 'sk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fde3cc"/><stop offset=".7" stop-color="' + SK + '"/><stop offset="1" stop-color="' + SKD + '"/></radialGradient>' +
      '<linearGradient id="' + k + 'sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(a.shirt, 0.15) + '"/><stop offset="1" stop-color="' + shade(a.shirt, -0.2) + '"/></linearGradient>' +
      '<radialGradient id="' + k + 'bl"><stop offset="0" stop-color="#ff7a7a" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a7a" stop-opacity="0"/></radialGradient>' +
      '</defs><g clip-path="url(#' + k + 'c)">';
    s += '<rect width="100" height="100" fill="url(#' + k + 'bg)"/>';
    /* 長髮（在臉後面） */
    if (a.hair === 'long') s += '<path d="M22 56 C18 24 35 16 50 16 C65 16 82 24 78 56 L82 96 L18 96 Z" fill="' + hc + '"/><path d="M27 60 C25 40 30 30 36 26" stroke="' + hl + '" stroke-width="2.5" fill="none" opacity=".6"/>';
    /* 衣服 */
    s += '<path d="M10 104 C13 84 30 76 50 76 C70 76 87 84 90 104 Z" fill="url(#' + k + 'sh)"/>';
    var c = a.collar;
    if (c === 'polo') s += '<path d="M40 77 L50 90 L60 77 L56 76 L50 84 L44 76Z" fill="' + shade(a.shirt, 0.45) + '"/><circle cx="50" cy="93" r="1.3" fill="#fff"/>';
    else if (c === 'tie') s += '<path d="M38 77 L50 86 L62 77 L60 75 L50 81 L40 75Z" fill="#fff" stroke="#ccc" stroke-width=".6"/><path d="M47.5 84 L52.5 84 L54 98 L50 102 L46 98Z" fill="#c62828"/><path d="M47.5 84 L52.5 84 L51.5 87 L48.5 87Z" fill="#8e1b1b"/>';
    else if (c === 'vneck') s += '<path d="M42 77 L50 90 L58 77" fill="' + SK + '" stroke="' + shade(a.shirt, -0.3) + '" stroke-width="1.5"/>';
    else if (c === 'cardigan') s += '<path d="M50 78 L50 104" stroke="' + shade(a.shirt, -0.35) + '" stroke-width="1.5"/><circle cx="53.5" cy="86" r="1.4" fill="#e0c36a"/><circle cx="53.5" cy="94" r="1.4" fill="#e0c36a"/><path d="M42 77 Q50 82 58 77" stroke="#fff" stroke-width="2" fill="none"/>';
    else s += '<path d="M42 77 Q50 83 58 77" stroke="' + shade(a.shirt, -0.3) + '" stroke-width="2" fill="none"/>';
    if (a.pearl) for (var p = 0; p < 9; p++) { var ang = Math.PI * (0.15 + 0.7 * p / 8), px = 50 - 11 * Math.cos(ang), py = 78 + 5.5 * Math.sin(ang); s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="1.5" fill="#fff" stroke="#ddd" stroke-width=".4"/>'; }
    /* 脖子、耳朵、臉 */
    s += '<path d="M44 68 L56 68 L56 78 Q50 81 44 78Z" fill="' + SKD + '"/>';
    s += '<ellipse cx="26" cy="54" rx="5" ry="6.5" fill="' + SK + '"/><ellipse cx="74" cy="54" rx="5" ry="6.5" fill="' + SK + '"/><path d="M25 51 Q23 54 25.5 57" stroke="' + SKD + '" stroke-width="1.4" fill="none"/><path d="M75 51 Q77 54 74.5 57" stroke="' + SKD + '" stroke-width="1.4" fill="none"/>';
    s += a.wide ? '<ellipse cx="50" cy="52" rx="27.5" ry="25" fill="url(#' + k + 'sk)"/>' : '<ellipse cx="50" cy="51" rx="23.5" ry="25.5" fill="url(#' + k + 'sk)"/>';
    /* 頭髮 */
    var h = a.hair;
    if (h === 'short') s += '<path d="M26 50 C24 25 40 20 51 20 C64 20 78 26 74 50 C71 38 63 32 51 33 C40 33 30 38 26 50Z" fill="' + hc + '"/><path d="M38 25 Q48 21 60 24" stroke="' + hl + '" stroke-width="2" fill="none" opacity=".7"/>';
    else if (h === 'spiky') s += '<path d="M25 48 L26 30 L32 33 L35 20 L42 28 L49 14 L55 27 L63 19 L66 32 L73 28 L75 48 C69 36 60 32 50 33 C40 33 31 36 25 48Z" fill="' + hc + '"/><path d="M40 26 L48 18 M52 25 L60 21" stroke="' + hl + '" stroke-width="1.6" opacity=".7"/>';
    else if (h === 'part') s += '<path d="M26 50 C24 27 38 21 52 22 C66 23 78 31 74 50 C73 41 67 34 58 32 C49 31 36 36 26 50Z" fill="' + hc + '"/><path d="M57 24 C51 27 45 31 41 36" stroke="' + hd + '" stroke-width="1.4" fill="none"/><path d="M60 26 Q68 29 71 36" stroke="' + hl + '" stroke-width="1.8" fill="none" opacity=".7"/>';
    else if (h === 'bald') s += '<path d="M26 58 C23 45 27 38 33 40 C31 46 31 51 32 59Z" fill="' + hc + '"/><path d="M74 58 C77 45 73 38 67 40 C69 46 69 51 68 59Z" fill="' + hc + '"/><ellipse cx="58" cy="33" rx="7" ry="3.5" fill="#fff" opacity=".5"/>';
    else if (h === 'bun') s += '<circle cx="50" cy="19" r="10.5" fill="' + hc + '"/><path d="M44 15 Q50 12 56 15" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M38 19 L62 13" stroke="#8d5b2c" stroke-width="2.2" stroke-linecap="round"/><circle cx="62" cy="13" r="2" fill="#e53935"/>' +
      '<path d="M26 52 C24 30 38 24 50 24 C62 24 76 30 74 52 C70 38 61 33 50 33 C39 33 30 38 26 52Z" fill="' + hc + '"/><path d="M33 36 Q40 29 50 29" stroke="#c9c9c9" stroke-width="1.3" fill="none"/>';
    else if (h === 'curly') { [[27, 47], [27, 37], [33, 28], [42, 22], [52, 21], [61, 23], [69, 29], [73, 38], [73, 48]].forEach(function (q) { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="7.8" fill="' + hc + '"/><circle cx="' + (q[0] - 2) + '" cy="' + (q[1] - 2.5) + '" r="2.4" fill="' + hl + '" opacity=".55"/>'; }); s += '<path d="M29 48 C31 35 40 31 50 31 C60 31 69 35 71 48 C65 41 58 38 50 38 C42 38 35 41 29 48Z" fill="' + hc + '"/>'; }
    else if (h === 'long') s += '<path d="M26 49 C27 29 39 23 50 23 C62 23 73 29 74 49 C68 39 58 35 50 40 C43 35 33 38 26 49Z" fill="' + hc + '"/><path d="M58 27 Q66 30 70 38" stroke="' + hl + '" stroke-width="2" fill="none" opacity=".6"/>';
    else if (h === 'cap') s += '<path d="M22 46 C22 20 78 20 78 46 Z" fill="' + hc + '"/><path d="M30 30 Q50 22 70 30" stroke="' + shade(hc, 0.35) + '" stroke-width="2" fill="none"/><ellipse cx="62" cy="46" rx="28" ry="5" fill="' + shade(hc, -0.3) + '"/><circle cx="50" cy="33" r="5" fill="#fff"/><text x="50" y="35.6" font-size="6.5" font-weight="900" text-anchor="middle" fill="' + hc + '">麻</text>';
    if (a.bow) s += '<path d="M64 26 L72 21 L72 31Z M64 26 L57 21 L57 31Z" fill="#ff6f91"/><circle cx="64.5" cy="26" r="2.2" fill="#e04870"/>';
    /* 眉毛 */
    var bc = a.brow || shade(hc, -0.1);
    if (h !== 'cap' || true) s += '<path d="M35 44.5 Q40.5 41.5 46 44" stroke="' + bc + '" stroke-width="2.3" fill="none" stroke-linecap="round"/><path d="M54 44 Q59.5 41.5 65 44.5" stroke="' + bc + '" stroke-width="2.3" fill="none" stroke-linecap="round"/>';
    /* 眼睛 */
    if (happy) s += '<path d="M36 53 Q41 46.5 46 53" stroke="#3b2418" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M54 53 Q59 46.5 64 53" stroke="#3b2418" stroke-width="2.8" fill="none" stroke-linecap="round"/>';
    else [41, 59].forEach(function (x) {
      s += '<ellipse cx="' + x + '" cy="52" rx="4.3" ry="' + (a.old ? 3.6 : 4.8) + '" fill="#fff"/><circle cx="' + x + '" cy="52.6" r="3.1" fill="#5a3a26"/><circle cx="' + x + '" cy="52.8" r="1.7" fill="#1b100a"/>' +
        '<circle cx="' + (x + 1.1) + '" cy="51.2" r="1.1" fill="#fff"/><circle cx="' + (x - 1) + '" cy="54" r=".55" fill="#fff"/>' +
        '<path d="M' + (x - 4.6) + ' 50.5 Q' + x + ' ' + (a.old ? 47.8 : 46.6) + ' ' + (x + 4.6) + ' 50.5" stroke="#3b2418" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
      if (a.lash) s += '<path d="M' + (x + 3.8) + ' 49 L' + (x + 6) + ' 47.3" stroke="#3b2418" stroke-width="1.2" stroke-linecap="round"/>';
    });
    if (a.old) s += '<path d="M31 51 L33.5 52 M31 54 L33.5 53.6 M69 51 L66.5 52 M69 54 L66.5 53.6" stroke="' + SKD + '" stroke-width="1" stroke-linecap="round"/><path d="M42 38 Q50 36.5 58 38" stroke="' + SKD + '" stroke-width=".9" fill="none"/>';
    if (a.glasses) s += '<rect x="33.5" y="46" width="15" height="12" rx="5" fill="#fff" fill-opacity=".18" stroke="#3a3a3a" stroke-width="1.8"/><rect x="51.5" y="46" width="15" height="12" rx="5" fill="#fff" fill-opacity=".18" stroke="#3a3a3a" stroke-width="1.8"/><path d="M48.5 51 Q50 49.5 51.5 51" stroke="#3a3a3a" stroke-width="1.6" fill="none"/><path d="M35.5 48 L39 47.5" stroke="#fff" stroke-width="1.2" opacity=".8"/>';
    /* 腮紅、鼻子、嘴巴 */
    if (a.blush || happy) s += '<ellipse cx="34" cy="60.5" rx="6" ry="3.6" fill="url(#' + k + 'bl)"/><ellipse cx="66" cy="60.5" rx="6" ry="3.6" fill="url(#' + k + 'bl)"/>';
    s += '<path d="M50.5 54.5 Q48.2 59.5 50 60.5 Q51.5 61 52.5 60" stroke="' + SKD + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    if (a.stub) s += '<path d="M38 64 Q50 76 62 64 Q60 72 50 74 Q40 72 38 64Z" fill="#555" opacity=".14"/>';
    if (a.mus) s += '<path d="M40 63.2 Q45 59.8 50 62 Q55 59.8 60 63.2 Q55 65 50 63.6 Q45 65 40 63.2Z" fill="' + (a.mus === 'white' ? '#e6e6e6' : '#2b2b2b') + '"/>';
    if (happy) s += '<path d="M42.5 64 Q50 76 57.5 64 Z" fill="#8e2b2b"/><path d="M44 64.5 Q50 66.6 56 64.5 L55.4 66.2 Q50 67.8 44.6 66.2Z" fill="#fff"/><ellipse cx="50" cy="70.6" rx="3.6" ry="2" fill="#ef6f6f"/>';
    else if (a.lips) s += '<path d="M44 65.5 Q47 63.6 50 64.6 Q53 63.6 56 65.5 Q50 70 44 65.5Z" fill="#e2566a"/><path d="M44.5 65.6 Q50 66.8 55.5 65.6" stroke="#b33a4c" stroke-width=".8" fill="none"/>';
    else s += '<path d="M44 65 Q50 69.5 56 65" stroke="#a24a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    if (a.ear) s += '<circle cx="26" cy="62.5" r="2.4" fill="#ffca28" stroke="#c79100" stroke-width=".6"/><circle cx="74" cy="62.5" r="2.4" fill="#ffca28" stroke="#c79100" stroke-width=".6"/>';
    s += '</g><circle cx="50" cy="50" r="49" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/>';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  };
})();
