/* ===== 牌面繪製（SVG，大而清楚） ===== */
(function () {
  var cache = {};
  var NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var BLUE = '#1f4e9c', GREEN = '#1d7a3a', RED = '#c62828', INK = '#1b1b1b';
  function circle(x, y, r, col) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + (r > 12 ? 3.4 : 2.6) + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.45) + '" fill="' + col + '"/>';
  }
  function stick(x, y, col, h) {
    h = h || 18;
    return '<rect x="' + (x - 3.6) + '" y="' + (y - h / 2) + '" width="7.2" height="' + h + '" rx="3.2" fill="' + col + '"/>' +
      '<rect x="' + (x - 4.4) + '" y="' + (y - 1.3) + '" width="8.8" height="2.6" rx="1" fill="#fff" opacity=".85"/>';
  }
  var DOT = {
    1: [[30, 40, 17, RED]],
    2: [[30, 22, 10, BLUE], [30, 58, 10, GREEN]],
    3: [[15, 16, 9, BLUE], [30, 40, 9, RED], [45, 64, 9, GREEN]],
    4: [[17, 22, 9, BLUE], [43, 22, 9, GREEN], [17, 58, 9, GREEN], [43, 58, 9, BLUE]],
    5: [[16, 18, 8.5, BLUE], [44, 18, 8.5, GREEN], [30, 40, 8.5, RED], [16, 62, 8.5, GREEN], [44, 62, 8.5, BLUE]],
    6: [[18, 16, 8, GREEN], [42, 16, 8, GREEN], [18, 40, 8, RED], [42, 40, 8, RED], [18, 64, 8, RED], [42, 64, 8, RED]],
    7: [[13, 12, 7, GREEN], [30, 20, 7, GREEN], [47, 28, 7, GREEN], [19, 50, 7, RED], [41, 50, 7, RED], [19, 67, 7, RED], [41, 67, 7, RED]],
    8: [[18, 12, 7, BLUE], [42, 12, 7, BLUE], [18, 31, 7, BLUE], [42, 31, 7, BLUE], [18, 50, 7, BLUE], [42, 50, 7, BLUE], [18, 68, 7, BLUE], [42, 68, 7, BLUE]],
    9: [[13, 15, 7, BLUE], [30, 15, 7, BLUE], [47, 15, 7, BLUE], [13, 40, 7, RED], [30, 40, 7, RED], [47, 40, 7, RED], [13, 65, 7, GREEN], [30, 65, 7, GREEN], [47, 65, 7, GREEN]]
  };
  var BAM = {
    2: [[30, 22, GREEN], [30, 58, GREEN]],
    3: [[30, 22, GREEN], [18, 58, GREEN], [42, 58, GREEN]],
    4: [[18, 22, GREEN], [42, 22, BLUE], [18, 58, BLUE], [42, 58, GREEN]],
    5: [[16, 22, GREEN], [44, 22, BLUE], [30, 40, RED], [16, 58, BLUE], [44, 58, GREEN]],
    6: [[14, 22, GREEN], [30, 22, GREEN], [46, 22, GREEN], [14, 58, BLUE], [30, 58, BLUE], [46, 58, BLUE]],
    7: [[30, 13, RED], [14, 40, GREEN], [30, 40, GREEN], [46, 40, GREEN], [14, 66, BLUE], [30, 66, BLUE], [46, 66, BLUE]],
    8: [[12, 22, GREEN], [24, 22, GREEN], [36, 22, GREEN], [48, 22, GREEN], [12, 58, BLUE], [24, 58, BLUE], [36, 58, BLUE], [48, 58, BLUE]],
    9: [[14, 14, RED], [30, 14, RED], [46, 14, RED], [14, 40, BLUE], [30, 40, BLUE], [46, 40, BLUE], [14, 66, GREEN], [30, 66, GREEN], [46, 66, GREEN]]
  };
  function face(t, showNum) {
    var s = '';
    if (t < 9) {
      s += '<text x="30" y="35" font-size="30" font-weight="900" text-anchor="middle" fill="' + INK + '">' + NUMS[t] + '</text>' +
        '<text x="30" y="70" font-size="29" font-weight="900" text-anchor="middle" fill="' + RED + '">萬</text>';
    } else if (t < 18) {
      DOT[t - 8].forEach(function (d) { s += circle(d[0], d[1], d[2], d[3]); });
    } else if (t < 27) {
      var n = t - 17;
      if (n === 1) s += stick(30, 40, GREEN, 54) + '<circle cx="30" cy="16" r="7" fill="' + RED + '"/>';
      else BAM[n].forEach(function (d) { s += stick(d[0], d[1], d[2], n >= 7 ? 16 : 22); });
    } else if (t < 34) {
      var ch = '東南西北中發白'[t - 27], col = t < 31 ? BLUE : t === 31 ? RED : t === 32 ? GREEN : BLUE;
      if (t === 33) s += '<rect x="11" y="12" width="38" height="56" rx="4" fill="none" stroke="' + BLUE + '" stroke-width="4"/><rect x="17" y="18" width="26" height="44" rx="2" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
      else s += '<text x="30" y="55" font-size="42" font-weight="900" text-anchor="middle" fill="' + col + '">' + ch + '</text>';
    } else {
      var fch = '春夏秋冬梅蘭菊竹'[t - 34], fc = t < 38 ? '#b03a8e' : '#0e7c86';
      s += '<text x="30" y="52" font-size="36" font-weight="900" text-anchor="middle" fill="' + fc + '">' + fch + '</text>' +
        '<text x="30" y="73" font-size="15" font-weight="700" text-anchor="middle" fill="' + fc + '">' + ((t - 34) % 4 + 1) + '</text>';
    }
    if (showNum && t >= 9 && t < 27) s += '<text x="55" y="77" font-size="13" font-weight="800" text-anchor="end" fill="#555">' + ((t % 9) + 1) + '</text>';
    return s;
  }
  window.tileSVG = function (t, opt) {
    var showNum = !opt || opt.num !== false;
    var key = t + (showNum ? 'n' : '');
    if (cache[key]) return cache[key];
    var body;
    if (t === -1) body = '<rect x="1" y="1" width="58" height="78" rx="7" fill="#2e7d4f"/><rect x="5" y="5" width="50" height="70" rx="5" fill="none" stroke="#9fd3b0" stroke-width="2"/>';
    else body = '<rect x="1" y="1" width="58" height="78" rx="7" fill="#fffdf4" stroke="#c9b98f" stroke-width="2"/>' + face(t, showNum);
    return (cache[key] = '<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-label="' + (t < 0 ? '牌背' : MJ.name(t)) + '">' + body + '</svg>');
  };
  /* 一張牌的 HTML */
  window.tileHTML = function (t, cls, attrs) {
    return '<span class="tile ' + (cls || '') + '"' + (attrs || '') + '>' + tileSVG(t, { num: window.SET ? SET.num : true }) + '</span>';
  };
})();
