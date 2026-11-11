/* ===== 可愛人物頭像（SVG，自己畫的） ===== */
(function () {
  var SK = '#f6cfae', SK2 = '#efbf98';
  var AV = [
    { n: '阿公', bg: '#cfe8ff', shirt: '#4f78c4', hair: 'bald', hc: '#c9c9c9', glasses: 1 },
    { n: '阿嬤', bg: '#ffe0ec', shirt: '#c0587e', hair: 'bun', hc: '#eeeeee', ear: 1, blush: 1 },
    { n: '大叔', bg: '#fff1c9', shirt: '#e08a2e', hair: 'short', hc: '#2b2b2b', mus: 1 },
    { n: '阿姨', bg: '#e6dcff', shirt: '#8a63d2', hair: 'curly', hc: '#6b3e26', ear: 1, blush: 1 },
    { n: '帥哥', bg: '#d7f5e3', shirt: '#2e9e6a', hair: 'spiky', hc: '#222' },
    { n: '美女', bg: '#ffe3d6', shirt: '#e46a5a', hair: 'long', hc: '#2a1a14', blush: 1, ear: 1 },
    { n: '老師', bg: '#e0f2f1', shirt: '#37796c', hair: 'part', hc: '#8d8d8d', glasses: 1 },
    { n: '小胖', bg: '#fff3e0', shirt: '#ef6c00', hair: 'cap', hc: '#d32f2f', blush: 1, wide: 1 }
  ];
  var uid = 0;
  window.AVATARS = AV;
  window.avatarSVG = function (i, mood) {
    var a = AV[((i | 0) % AV.length + AV.length) % AV.length], id = 'avc' + (uid++), happy = mood === 'happy', s = '';
    s += '<defs><clipPath id="' + id + '"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#' + id + ')">';
    s += '<rect width="100" height="100" fill="' + a.bg + '"/>';
    if (a.hair === 'long') s += '<path d="M23 54 C20 24 36 18 50 18 C64 18 80 24 77 54 L80 90 L20 90 Z" fill="' + a.hc + '"/>';
    s += '<path d="M10 104 C14 82 30 76 50 76 C70 76 86 82 90 104 Z" fill="' + a.shirt + '"/>';
    s += '<rect x="44" y="68" width="12" height="10" rx="4" fill="' + SK2 + '"/>';
    s += '<circle cx="25" cy="53" r="5.5" fill="' + SK2 + '"/><circle cx="75" cy="53" r="5.5" fill="' + SK2 + '"/>';
    s += a.wide ? '<ellipse cx="50" cy="51" rx="28" ry="25" fill="' + SK + '"/>' : '<circle cx="50" cy="50" r="25" fill="' + SK + '"/>';
    var hc = a.hc;
    if (a.hair === 'short') s += '<path d="M25 49 C24 25 40 21 50 21 C62 21 77 26 75 49 C71 37 62 32 50 33 C39 33 30 38 25 49Z" fill="' + hc + '"/>';
    else if (a.hair === 'spiky') s += '<path d="M25 47 L27 29 L33 33 L37 20 L44 29 L50 16 L56 29 L63 20 L67 33 L73 29 L75 47 C69 36 60 33 50 33 C40 33 31 36 25 47Z" fill="' + hc + '"/>';
    else if (a.hair === 'part') s += '<path d="M25 49 C24 27 38 21 52 22 C66 23 77 31 75 49 C73 40 67 34 58 32 C49 31 36 36 25 49Z" fill="' + hc + '"/>';
    else if (a.hair === 'bald') s += '<path d="M25 56 C23 44 27 38 32 40 C30 45 30 50 31 57Z" fill="' + hc + '"/><path d="M75 56 C77 44 73 38 68 40 C70 45 70 50 69 57Z" fill="' + hc + '"/><ellipse cx="60" cy="33" rx="6" ry="3" fill="#fff" opacity=".45"/>';
    else if (a.hair === 'bun') s += '<circle cx="50" cy="20" r="10" fill="' + hc + '"/><path d="M25 51 C24 30 38 24 50 24 C62 24 76 30 75 51 C71 38 61 33 50 33 C39 33 29 38 25 51Z" fill="' + hc + '"/>';
    else if (a.hair === 'curly') { [[28, 44], [29, 34], [36, 26], [46, 22], [56, 22], [65, 26], [71, 34], [72, 44]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7.5" fill="' + hc + '"/>'; }); s += '<path d="M28 48 C30 34 40 30 50 30 C60 30 70 34 72 48 C66 40 58 37 50 37 C42 37 34 40 28 48Z" fill="' + hc + '"/>'; }
    else if (a.hair === 'long') s += '<path d="M26 47 C27 29 39 24 50 24 C62 24 73 29 74 47 C67 38 57 35 50 39 C43 35 33 38 26 47Z" fill="' + hc + '"/>';
    else if (a.hair === 'cap') s += '<path d="M22 44 C23 22 77 22 78 44 Z" fill="' + hc + '"/><ellipse cx="60" cy="44" rx="27" ry="4.5" fill="#b71c1c"/><circle cx="50" cy="27" r="3" fill="#fff"/>';
    /* 眼睛 */
    if (happy) s += '<path d="M36 53 Q41 46 46 53" stroke="#2b1b14" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M54 53 Q59 46 64 53" stroke="#2b1b14" stroke-width="3" fill="none" stroke-linecap="round"/>';
    else s += '<circle cx="41" cy="52" r="3.3" fill="#2b1b14"/><circle cx="59" cy="52" r="3.3" fill="#2b1b14"/><circle cx="42.2" cy="50.8" r="1" fill="#fff"/><circle cx="60.2" cy="50.8" r="1" fill="#fff"/>';
    if (a.glasses) s += '<circle cx="41" cy="52" r="7" fill="#fff" fill-opacity=".2" stroke="#333" stroke-width="2"/><circle cx="59" cy="52" r="7" fill="#fff" fill-opacity=".2" stroke="#333" stroke-width="2"/><path d="M48 52 L52 52" stroke="#333" stroke-width="2"/>';
    if (a.blush) s += '<ellipse cx="34" cy="60" rx="4.5" ry="2.6" fill="#ff7b7b" opacity=".45"/><ellipse cx="66" cy="60" rx="4.5" ry="2.6" fill="#ff7b7b" opacity=".45"/>';
    s += '<path d="M49 56 Q50 58.5 51 56" stroke="#c98a6a" stroke-width="1.6" fill="none"/>';
    if (a.mus) s += '<path d="M40 61 Q50 55 60 61 Q50 64 40 61Z" fill="#2b2b2b"/>';
    if (happy) s += '<path d="M42 62 Q50 73 58 62 Z" fill="#b5483b"/>';
    else s += '<path d="M43 63 Q50 68.5 57 63" stroke="#8a3b2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    if (a.ear) s += '<circle cx="25" cy="61" r="2.6" fill="#ffc107"/><circle cx="75" cy="61" r="2.6" fill="#ffc107"/>';
    s += '</g>';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  };
})();
