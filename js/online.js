/* ===== 連線：Firebase 匿名登入（只輸入名字，同手機自動記住）＋ Firestore ===== */
var Online = { ready: false, uid: null, reason: '', failed: false };
(function () {
  var cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) { Online.reason = '尚未設定 Firebase（目前只能跟電腦打）'; Online.failed = true; return; }
  var V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/', fs, db, authM, auth;
  function refresh() { if (typeof curView !== 'undefined' && (curView === 'home' || curView === 'rank' || curView === 'lobby' || curView === 'settings')) go(curView, true); }
  Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]).then(function (m) {
    var app = m[0].initializeApp(cfg, KP ? 'guest' : undefined); authM = m[1];
    auth = KP ? authM.initializeAuth(app, { persistence: authM.inMemoryPersistence }) : authM.getAuth(app); fs = m[2]; db = fs.getFirestore(app);
    var started = false;
    authM.onAuthStateChanged(auth, function (u) {
      if (!u) { authM.signInAnonymously(auth).catch(function (e) { Online.reason = '登入失敗：' + e.message; Online.failed = true; refresh(); }); return; }
      Online.uid = u.uid; Online.ready = true; Online.reason = '';
      if (!started) {
        started = true; Online.ping('idle'); Online.syncProfile();
        setInterval(function () { if (!document.hidden) Online.ping(); }, 60000);
        listenInvites();
      }
      refresh();
    });
  }).catch(function () { Online.reason = '無法載入連線功能（請用 GitHub 網址開啟）'; Online.failed = true; refresh(); });

  function uref() { return fs.doc(db, 'users', Online.uid); }
  /* ----- 個人資料、英雄榜 ----- */
  var syncT = null;
  Online.syncProfile = function () {
    if (!SET.name || !Online.ready) return;
    clearTimeout(syncT);
    syncT = setTimeout(function () {
      fs.setDoc(uref(), { name: SET.name, games: STATS.games, hu: STATS.hu, zimo: STATS.zimo, score: STATS.score, best: STATS.best, first: STATS.first, updated: fs.serverTimestamp() }, { merge: true })
        .catch(function (e) { console.warn('sync', e.message); });
    }, 400);
  };
  Online.saveMatch = function (rec) {
    rec.uid = Online.uid; rec.name = SET.name; rec.ts = fs.serverTimestamp();
    fs.addDoc(fs.collection(db, 'matches'), rec).catch(function (e) { console.warn('match', e.message); });
    Online.syncProfile();
  };
  Online.leaderboard = function (field) {
    return fs.getDocs(fs.query(fs.collection(db, 'users'), fs.orderBy(field, 'desc'), fs.limit(50))).then(function (q) {
      var o = []; q.forEach(function (d) { var x = d.data(); if ((x.games || 0) > 0) { x.id = d.id; o.push(x); } }); return o;
    });
  };
  /* ----- 誰在線上 ----- */
  var lastStatus = 'idle';
  Online.ping = function (st) {
    if (st) lastStatus = st; if (!SET.name || !Online.ready) return;
    fs.setDoc(uref(), { name: SET.name, lastSeen: fs.serverTimestamp(), status: lastStatus }, { merge: true }).catch(function (e) { console.warn('ping', e.message); });
  };
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Online.ready) Online.ping(); });
  Online.onlineUsers = function () {
    var since = fs.Timestamp.fromMillis(Date.now() - 3 * 60 * 1000);
    return fs.getDocs(fs.query(fs.collection(db, 'users'), fs.where('lastSeen', '>=', since))).then(function (q) {
      var o = []; q.forEach(function (d) { var x = d.data(); x.id = d.id; o.push(x); });
      o.sort(function (a, b) { return a.id === Online.uid ? -1 : b.id === Online.uid ? 1 : 0; }); return o;
    });
  };
  /* ----- 邀請 ----- */
  Online.invite = function (target, room) { return fs.setDoc(fs.doc(db, 'invites', target), { from: Online.uid, fromName: SET.name, room: room, ts: fs.serverTimestamp() }); };
  Online.clearInvite = function () { return fs.deleteDoc(fs.doc(db, 'invites', Online.uid)).catch(function () { }); };
  var seenInv = {};
  function listenInvites() {
    fs.onSnapshot(fs.doc(db, 'invites', Online.uid), function (s) {
      if (!s.exists()) return; var d = s.data(); if (!d.room || seenInv[d.room]) return;
      var t = d.ts && d.ts.toMillis ? d.ts.toMillis() : Date.now(); if (Date.now() - t > 10 * 60 * 1000) return;
      seenInv[d.room] = 1; if (typeof showInvite === 'function') showInvite(d);
    }, function (e) { console.warn('invites', e.message); });
  }
  /* ----- 牌桌房間 ----- */
  function rid() { var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  Online.createRoom = function (o) {
    var id = rid();
    return fs.setDoc(fs.doc(db, 'rooms', id), { host: Online.uid, status: 'waiting', seats: [{ uid: Online.uid, name: SET.name }, null, null, null], members: [Online.uid],
      rounds: o.rounds, lv: o.lv, seed: 'R' + id + Date.now(), created: fs.serverTimestamp() }).then(function () { return id; });
  };
  Online.joinRoom = function (id) {
    var ref = fs.doc(db, 'rooms', id);
    return fs.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (s) {
        if (!s.exists()) throw new Error('找不到這一桌');
        var r = s.data(), seats = r.seats.slice();
        if (seats.some(function (x) { return x && x.uid === Online.uid; })) return r.status;
        if (r.status !== 'waiting') throw new Error('這一桌已經開打了');
        var i = seats.indexOf(null); if (i < 0) throw new Error('這一桌已經坐滿了');
        seats[i] = { uid: Online.uid, name: SET.name };
        tx.update(ref, { seats: seats, members: fs.arrayUnion(Online.uid) });
        return 'joined';
      });
    });
  };
  Online.leaveRoom = function (id) {
    var ref = fs.doc(db, 'rooms', id);
    return fs.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (s) {
        if (!s.exists()) return; var r = s.data(); if (r.status !== 'waiting') return;
        var seats = r.seats.map(function (x) { return x && x.uid === Online.uid ? null : x; });
        tx.update(ref, { seats: seats });
      });
    });
  };
  Online.startRoom = function (id, seats) { return fs.updateDoc(fs.doc(db, 'rooms', id), { status: 'playing', seats: seats, started: fs.serverTimestamp() }); };
  Online.finishRoom = function (id) { return fs.updateDoc(fs.doc(db, 'rooms', id), { status: 'done' }).catch(function () { }); };
  Online.watchRoom = function (id, cb, err) { return fs.onSnapshot(fs.doc(db, 'rooms', id), function (s) { cb(s.exists() ? Object.assign({ id: id }, s.data()) : null); }, err); };
  Online.myRooms = function () {
    return fs.getDocs(fs.query(fs.collection(db, 'rooms'), fs.where('members', 'array-contains', Online.uid))).then(function (q) {
      var o = []; q.forEach(function (d) {
        var x = d.data(); x.id = d.id;
        var t = x.created && x.created.toMillis ? x.created.toMillis() : Date.now();
        if (x.status !== 'done' && Date.now() - t < 3 * 24 * 3600 * 1000 && x.seats.some(function (z) { return z && z.uid === Online.uid; })) o.push(x);
      }); return o;
    });
  };
  /* 動作紀錄：每個動作一筆，編號只能新增不能改（兩人同時寫時只有一人成功） */
  function pad(n) { return ('00000' + n).slice(-6); }
  Online.writeAct = function (id, idx, act) { act.i = idx; return fs.setDoc(fs.doc(db, 'rooms', id, 'acts', pad(idx)), act); };
  Online.watchActs = function (id, cb) {
    return fs.onSnapshot(fs.query(fs.collection(db, 'rooms', id, 'acts'), fs.orderBy('i')), function (q) {
      var list = []; q.forEach(function (d) { var x = d.data(); if (x.i === list.length) list.push(x); });
      cb(list);
    }, function (e) { toast('連線中斷：' + e.message); });
  };
})();

/* ===== 房間（等人畫面） ===== */
var Room = (function () {
  var R = { id: null, unwatch: null };
  R.create = function () {
    if (!SET.name) return Promise.reject(new Error('請先輸入名字'));
    return Online.createRoom({ rounds: SET.rd, lv: SET.lv });
  };
  R.joinById = function (id) {
    if (!Online.ready) { toast('還沒連上線，請稍後再試'); return; }
    Online.joinRoom(id).then(function () { R.open(id); }).catch(function (e) { toast(e.message, 3500); go('lobby'); });
  };
  R.open = function (id) {
    R.leave(); R.id = id; go('room'); R.id = id;
    $('roomBox').innerHTML = '<div class="note sub">載入中…</div>';
    R.unwatch = Online.watchRoom(id, function (r) {
      if (!r) { $('roomBox').innerHTML = '<div class="note">找不到這一桌。</div>'; return; }
      var me = r.seats.findIndex(function (x) { return x && x.uid === Online.uid; });
      if (r.status === 'playing' || r.status === 'done') {
        if (me < 0) { $('roomBox').innerHTML = '<div class="note">這一桌已經開打了，下次早點來！</div>'; return; }
        var unw = R.unwatch; R.unwatch = null; if (unw) unw();
        Table.startOnline({ mode: 'online', roomId: id, isHost: r.host === Online.uid, me: me, lv: r.lv, teach: !!SET.tch, open: false,
          cfg: { seed: r.seed, names: r.seats.map(function (x) { return x.name; }), rounds: r.rounds },
          seats: r.seats.map(function (x) { return { name: x.name, ai: !!x.ai, uid: x.uid || null }; }) });
        return;
      }
      var host = r.host === Online.uid, humans = r.seats.filter(Boolean).length;
      $('roomBox').innerHTML = '<div class="panel"><b>牌桌 ' + esc(id.toUpperCase()) + '</b>・' + ({ 1: '一圈', 2: '二圈', 4: '一將' }[r.rounds] || r.rounds + '圈') +
        '<div class="seatlist">' + r.seats.map(function (x, i) {
          return '<div class="s"><span class="w">' + MJ.WINDS[i] + '</span>' + (x ? esc(x.name) + (x.uid === r.host ? '（房主）' : '') + (x.uid === Online.uid ? '（你）' : '') : '<span style="color:#999">空位（開始後由電腦補）</span>') + '</div>';
        }).join('') + '</div>' +
        '<button class="big" id="rmShare">💬 用 LINE 邀朋友</button>' +
        (host ? '<button class="big primary" id="rmStart">開始打牌（' + humans + ' 人＋' + (4 - humans) + ' 電腦）</button>' : '<div class="note sub">等房主按「開始」…</div>') +
        '<button class="big" id="rmLeave">離開這一桌</button></div>';
      $('rmShare').onclick = function () { copyLink(shareURL('room=' + id), '🀄 ' + SET.name + ' 邀你一起打麻將！點連結就能加入：\n'); };
      var st = $('rmStart'); if (st) st.onclick = function () {
        var k = 0, names = ['電腦阿福', '電腦阿珠', '電腦阿財'];
        var seats = r.seats.map(function (x) { return x || { ai: true, name: names[k++] }; });
        st.disabled = true; Online.startRoom(id, seats).catch(function (e) { toast('開始失敗：' + e.message); st.disabled = false; });
      };
      $('rmLeave').onclick = function () { Online.leaveRoom(id).then(function () { go('lobby'); }); };
    }, function (e) { $('roomBox').innerHTML = '<div class="note">讀取失敗：' + esc(e.message) + '</div>'; });
  };
  R.leave = function () { if (R.unwatch) { R.unwatch(); R.unwatch = null; } };
  return R;
})();
