/* TikFlux - Actions Studio UI layer
 * Reshapes the already-rendered (and fully bound) Actions view into the cyan
 * studio layout. Nothing is deleted: original nodes are relocated into the
 * new layout so every existing listener, id and API call keeps working.
 */
(function () {
  'use strict';

  var VIEW_ID = 'actionsView';

  var ICON = {
    zap: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z"/></svg>',
    square: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
    play: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>',
    sliders: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/></svg>',
    activity: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
    clapper: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    layers: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    folderPlus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    copy: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    external: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
  };

  var REQUIRED = [
    'createActionBtn', 'createGroupBtn', 'actionsList', 'screensContainer',
    'actionsClearScreensBtn', 'actionsMasterToggle', 'actionsMasterToggleLabel',
    'countryLookupsContainer', 'alertConsoleObsUrl', 'alertConsoleObsCopyBtn',
    'alertHistoryContainer', 'actionAiAssistantMount'
  ];

  function t(key, fallback) {
    try {
      if (window.i18n && typeof window.i18n.t === 'function') {
        var v = window.i18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback;
  }

  function move(id, host, prepend) {
    var el = document.getElementById(id);
    if (!el || !host) return null;
    if (prepend && host.firstChild) host.insertBefore(el, host.firstChild);
    else host.appendChild(el);
    return el;
  }

  function marker() {
    return '<div class="tl-workspace-brand" aria-hidden="true">' +
      '<svg class="ts-brand-logo ts-brand-logo--complete" viewBox="0 0 1254 1254" aria-hidden="true" focusable="false" style="width:min(680px,75%)">' +
        '<defs>' +
          '<image id="ts-tf-art" href="/assets/img/tx-logo.png" width="1254" height="1254"/>' +
          '<clipPath id="ts-tf-mark-crop" clipPathUnits="userSpaceOnUse"><path d="M97 87H1164V991H368V930H97Z"/></clipPath>' +
          '<clipPath id="ts-tf-word-crop" clipPathUnits="userSpaceOnUse"><rect x="55" y="1000" width="1148" height="195"/></clipPath>' +
          '<linearGradient id="ts-tf-light" x1="0" y1="0" x2="1" y2="0">' +
            '<stop stop-color="#dcfeff" stop-opacity="0"/><stop offset=".38" stop-color="#86f8ff" stop-opacity=".08"/>' +
            '<stop offset=".52" stop-color="#fff" stop-opacity=".85"/><stop offset=".66" stop-color="#b3fcff" stop-opacity=".18"/>' +
            '<stop stop-color="#dcfeff" stop-opacity="0"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<g clip-path="url(#ts-tf-mark-crop)"><use href="#ts-tf-art"/></g>' +
        '<g clip-path="url(#ts-tf-word-crop)"><use href="#ts-tf-art"/></g>' +
      '</svg></div>';
  }

  function layout() {
    return marker() +
      '<div class="cyan-actions-workspace">' +
        '<div class="cyan-action-controls">' +
          '<header class="cyan-actions-heading"><div>' +
            '<h1>' + ICON.zap + '<span>الإجراءات</span></h1>' +
            '<p>اربط تفاعل جمهورك بإجراء على شاشة البث.</p>' +
          '</div></header>' +
          '<div class="cyan-actions-toolbar">' +
            '<div class="cyan-run-controls">' +
              '<button type="button" class="cyan-stop-current" id="cyanStopCurrentBtn">' + ICON.square + '<span>إيقاف الحالي</span></button>' +
              '<button type="button" class="cyan-stop-all" id="cyanStopAllBtn" data-paused="false" aria-pressed="false">' + ICON.square + '<span>إيقاف الكل</span></button>' +
            '</div>' +
            '<div class="cyan-tool-controls">' +
              '<label class="cyan-effects">' + ICON.sliders + '<span>الحركة</span>' +
                '<select id="cyanMotionSelect" aria-label="حركة الواجهة">' +
                  '<option value="standard">عادية</option><option value="reduced">مخففة</option>' +
                '</select></label>' +
              '<div id="actionAiAssistantMount" class="cyan-ai-mount"></div>' +
              '<button type="button" id="cyanConsoleToggleBtn" aria-pressed="false">' + ICON.activity + '<span>سجل الإجراءات</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<details class="cyan-source-panel" open>' +
          '<summary>' +
            '<span class="cyan-source-title">' + ICON.clapper + '<b>روابط شاشات البث</b></span>' +
            '<span class="cyan-source-prompt"><span class="cyan-source-show">اضغط لعرض الشاشات</span><span class="cyan-source-hide">اضغط لإخفاء الشاشات</span></span>' +
            '<span class="cyan-source-meta"><span>5 شاشات · OBS / TikTok LIVE Studio</span>' + ICON.chevron + '</span>' +
          '</summary>' +
          '<section class="al-screens">' +
            '<div class="al-screens-head"><h2>' + ICON.clapper + '<span>شاشات الأليرتات</span></h2><span>1920 × 1080</span></div>' +
            '<div class="al-screen-tabs" role="group" aria-label="شاشة البث">' +
              [1, 2, 3, 4, 5].map(function (n) {
                return '<button type="button" class="al-screen-tab" data-screen="' + n + '" aria-pressed="' + (n === 1) + '">' +
                  '<span class="status-dot offline" data-status-dot="' + n + '"></span>شاشة ' + n + ' · <span data-tab-count="' + n + '">0</span></button>';
              }).join('') +
            '</div>' +
            '<div class="al-screen-link">' +
              '<input id="alScreenUrl" type="text" readonly dir="ltr" placeholder="جارٍ التحميل…" aria-label="رابط شاشة الأليرتات" />' +
              '<button type="button" id="alScreenCopyBtn">' + ICON.copy + '<span>نسخ</span></button>' +
              '<a id="alScreenOpenBtn" href="#" target="_blank" rel="noreferrer">' + ICON.external + '<span>فتح الشاشة</span></a>' +
            '</div>' +
            '<div class="al-screen-extra">' +
              '<label>أقصى عدد في الصف <input type="number" id="alQueueLimit" min="1" max="50" value="10" /></label>' +
              '<span class="al-screen-status" id="alScreenStatus"><span class="status-dot offline"></span><span class="status-text">غير متصل</span></span>' +
            '</div>' +
            '<p>أضف الرابط كمصدر متصفح في OBS. تظهر الشاشة شفافة حتى يصل تنبيه؛ جرّب إجراءً بعد فتحها.</p>' +
          '</section>' +
        '</details>' +

        '<div class="cyan-actions-grid">' +
          '<section class="cyan-action-list" aria-label="إدارة الإجراءات">' +
            '<label class="cyan-search">' + ICON.search + '<span class="sr-only">ابحث عن إجراء أو مجموعة</span>' +
              '<input id="cyanActionSearch" type="text" placeholder="ابحث عن إجراء أو مجموعة…" />' +
            '</label>' +
            '<section class="to-action-group ag-list" aria-label="مجموعات الإجراءات">' +
              '<div class="ag-list-heading"><div>' +
                '<h2>' + ICON.zap + '<span>قائمة الإجراءات</span></h2><span id="cyanActionsState">الكل متوقف</span>' +
              '</div><div class="ag-create-tools">' +
                '<button type="button" class="cyan-create" id="cyanCreateActionBtn">' + ICON.plus + '<span>إنشاء إجراء جديد</span></button>' +
                '<button type="button" id="cyanCreateGroupBtn">' + ICON.folderPlus + '<span>مجموعة جديدة</span></button>' +
              '</div></div>' +
              '<div class="ag-filters" aria-label="عرض مجموعات الإجراءات">' +
                '<button type="button" id="cyanFilterAll" aria-pressed="true">الكل <span data-count>0</span></button>' +
                '<button type="button" id="cyanFilterNoGroup" aria-pressed="false"><i style="background: rgb(168, 173, 185);"></i>بدون مجموعة</button>' +
              '</div>' +
              '<div class="ag-sections">' +
                '<section class="ag-section" style="--group-color: #a8adb9;">' +
                  '<div class="ag-heading"><button type="button" class="ag-disclosure" aria-expanded="true">' + ICON.layers + '<b>بدون مجموعة</b>' +
                    '<span class="ag-count" data-count>0</span>' + ICON.chevron + '</button></div>' +
                  '<div class="ag-section-host"></div>' +
                '</section>' +
              '</div>' +
            '</section>' +
            '<details class="cyan-source-panel cyan-country-panel">' +
              '<summary><span class="cyan-source-title">' + ICON.activity + '<b>سجل الدول</b></span>' +
                '<span class="cyan-source-meta"><span>آخر الدول المكتشفة</span>' + ICON.chevron + '</span></summary>' +
              '<div class="cyan-country-host"></div>' +
            '</details>' +
          '</section>' +

          '<aside id="cyanEventConsole" class="cyan-event-console" aria-labelledby="cyan-console-title" hidden>' +
            '<header>' + ICON.activity + '<h2 id="cyan-console-title">سجل الإجراءات</h2><span id="cyanConsoleCount">0</span></header>' +
            '<p>آخر الإجراءات المطابقة لأحداث البث.</p>' +
            '<div class="cyan-console-empty">' + ICON.activity + '<b>بانتظار أول إجراء</b><p>تظهر الإجراءات هنا عندما تطابق أحداث البث.</p></div>' +
            '<div class="cyan-console-host"></div>' +
            '<div class="cyan-obs-row"><label for="alertConsoleObsUrl">رابط أوبس</label>' +
              '<div class="cyan-obs-copy"><input type="text" readonly id="alertConsoleObsUrl" value="جارٍ التحميل…" dir="ltr" />' +
              '<button type="button" id="alertConsoleObsCopyBtn">نسخ</button></div></div>' +
          '</aside>' +
        '</div>' +
      '</div>';
  }

  function copyText(value, btn) {
    var label = t('actions.copySuccess', 'تم النسخ');
    function feedback() {
      var old = btn.textContent;
      btn.textContent = label;
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('copied'); }, 2000);
    }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      } catch (e) {}
      feedback();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(feedback).catch(fallback);
    } else fallback();
  }

  function bind(root, legacy) {
    var active = 1;
    var store = document.getElementById('screensContainer');
    var urlInput = root.querySelector('#alScreenUrl');
    var copyBtn = root.querySelector('#alScreenCopyBtn');
    var openBtn = root.querySelector('#alScreenOpenBtn');
    var queueInput = root.querySelector('#alQueueLimit');
    var statusBox = root.querySelector('#alScreenStatus');

    function sourceInput(n) {
      return store && store.querySelector('.screen-item[data-screen="' + n + '"] .screen-link-input-inline');
    }
    function sourceQueue(n) { return document.getElementById('queueLimit-' + n); }
    function sourceStatus(n) { return document.getElementById('status-' + n); }

    function syncScreen() {
      var src = sourceInput(active);
      if (!src) return;
      urlInput.value = src.value || '';
      openBtn.href = src.value || '#';
      var q = sourceQueue(active);
      if (q) queueInput.value = q.value || 10;
      var st = sourceStatus(active);
      var dot = statusBox.querySelector('.status-dot');
      var txt = statusBox.querySelector('.status-text');
      var sDot = st && st.querySelector('.status-dot');
      var sTxt = st && st.querySelector('.status-text');
      dot.className = 'status-dot ' + (sDot && sDot.classList.contains('online') ? 'online' : 'offline');
      txt.textContent = sTxt ? sTxt.textContent : (sDot && sDot.classList.contains('online') ? 'جاهز' : 'غير متصل');
      root.querySelectorAll('.al-screen-tab').forEach(function (tab) {
        var n = Number(tab.dataset.screen);
        var tDot = tab.querySelector('.status-dot');
        var nDot = sourceStatus(n) && sourceStatus(n).querySelector('.status-dot');
        tDot.className = 'status-dot ' + (nDot && nDot.classList.contains('online') ? 'online' : 'offline');
      });
    }

    root.querySelectorAll('.al-screen-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        active = Number(tab.dataset.screen);
        root.querySelectorAll('.al-screen-tab').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === tab));
        });
        syncScreen();
      });
    });
    copyBtn.addEventListener('click', function () { copyText(urlInput.value, copyBtn); });
    queueInput.addEventListener('change', function () {
      var q = sourceQueue(active);
      if (!q) return;
      var v = Math.max(1, Math.min(50, parseInt(queueInput.value, 10) || 1));
      queueInput.value = v;
      q.value = v;
      q.dispatchEvent(new Event('input', { bubbles: true }));
      q.dispatchEvent(new Event('blur', { bubbles: true }));
    });

    if (store) {
      var sto = new MutationObserver(function () { syncScreen(); refreshCounts(); });
      sto.observe(store, { childList: true, subtree: true, characterData: true });
    }
    syncScreen();

    // Original controls relocated into the new toolbar.
    var stopCurrent = document.getElementById('actionsClearScreensBtn');
    var currentHost = root.querySelector('.cyan-run-controls');
    if (stopCurrent && currentHost) {
      stopCurrent.classList.add('cyan-stop-current');
      currentHost.insertBefore(stopCurrent, currentHost.firstChild);
      var oldCurrent = root.querySelector('#cyanStopCurrentBtn');
      if (oldCurrent) oldCurrent.remove();
    }

    var master = document.getElementById('actionsMasterToggle');
    var stopAll = root.querySelector('#cyanStopAllBtn');
    function paintMaster() {
      if (!master || !stopAll) return;
      var on = !!master.checked;
      stopAll.dataset.paused = on ? 'false' : 'true';
      stopAll.setAttribute('aria-pressed', String(!on));
      stopAll.querySelector('span').textContent = on ? 'إيقاف الكل' : 'تشغيل الكل';
      stopAll.querySelector('svg').outerHTML = on ? ICON.square : ICON.play;
      var lab = document.getElementById('actionsMasterToggleLabel');
      if (lab) lab.textContent = on ? t('actions.masterLayerToggleOn', 'التنبيهات مفعّلة') : t('actions.masterLayerToggleOff', 'التنبيهات متوقفة');
    }
    if (stopAll && master) {
      stopAll.addEventListener('click', function () {
        master.checked = !master.checked;
        master.dispatchEvent(new Event('change', { bubbles: true }));
        paintMaster();
      });
      master.addEventListener('change', paintMaster);
      paintMaster();
    }

    var motion = root.querySelector('#cyanMotionSelect');
    if (motion) {
      try { motion.value = localStorage.getItem('tf_actions_motion') || 'standard'; } catch (e) {}
      function applyMotion() {
        root.classList.toggle('motion-reduced', motion.value === 'reduced');
        try { localStorage.setItem('tf_actions_motion', motion.value); } catch (e) {}
      }
      motion.addEventListener('change', applyMotion);
      applyMotion();
    }

    var consoleBtn = root.querySelector('#cyanConsoleToggleBtn');
    var consolePanel = root.querySelector('#cyanEventConsole');
    if (consoleBtn && consolePanel) {
      consoleBtn.addEventListener('click', function () {
        consolePanel.hidden = !consolePanel.hidden;
        consoleBtn.setAttribute('aria-pressed', String(!consolePanel.hidden));
      });
    }

    // Search + quick filters act on the app-rendered action list only.
    var search = root.querySelector('#cyanActionSearch');
    var filterAll = root.querySelector('#cyanFilterAll');
    var filterNone = root.querySelector('#cyanFilterNoGroup');
    var list = document.getElementById('actionsList');
    var filterMode = 'all';

    function applyFilters() {
      if (!list) return;
      var q = search ? search.value.trim().toLowerCase() : '';
      var shown = 0;
      list.querySelectorAll('.action-item').forEach(function (item) {
        var match = !q || (item.innerText || '').toLowerCase().indexOf(q) !== -1;
        var groupOk = filterMode !== 'ungrouped' || !!item.closest('.action-group-ungrouped');
        var vis = match && groupOk;
        item.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });
      list.querySelectorAll('.action-group').forEach(function (g) {
        var any = Array.prototype.some.call(g.querySelectorAll('.action-item'), function (i) { return i.style.display !== 'none'; });
        if (filterMode === 'ungrouped' && !g.classList.contains('action-group-ungrouped')) any = false;
        g.style.display = any ? '' : 'none';
      });
      var p = list.querySelector(':scope > p');
      if (p) p.style.display = (shown || q || filterMode !== 'all') ? 'none' : '';
    }
    if (search) search.addEventListener('input', applyFilters);
    if (filterAll) filterAll.addEventListener('click', function () {
      filterMode = 'all';
      filterAll.setAttribute('aria-pressed', 'true');
      filterNone.setAttribute('aria-pressed', 'false');
      applyFilters();
    });
    if (filterNone) filterNone.addEventListener('click', function () {
      filterMode = 'ungrouped';
      filterAll.setAttribute('aria-pressed', 'false');
      filterNone.setAttribute('aria-pressed', 'true');
      applyFilters();
    });
    if (list) {
      var lo = new MutationObserver(function () { refreshCounts(); applyFilters(); });
      lo.observe(list, { childList: true, subtree: true });
    }

    var disclosure = root.querySelector('.ag-disclosure');
    var sectionHost = root.querySelector('.ag-section-host');
    if (disclosure && sectionHost) {
      disclosure.addEventListener('click', function () {
        var open = disclosure.getAttribute('aria-expanded') === 'true';
        disclosure.setAttribute('aria-expanded', String(!open));
        sectionHost.style.display = open ? 'none' : '';
      });
    }

    function refreshCounts() {
      var items = list ? list.querySelectorAll('.action-item').length : 0;
      if (filterAll) {
        var c = filterAll.querySelector('[data-count]');
        if (c) c.textContent = items;
      }
      root.querySelectorAll('[data-count]').forEach(function (el) {
        if (el.closest('#cyanFilterAll')) return;
        el.textContent = items;
      });
      var history = document.getElementById('alertHistoryContainer');
      var rows = history ? history.querySelectorAll('tbody tr, .alert-history-row').length : 0;
      var cc = root.querySelector('#cyanConsoleCount');
      if (cc) cc.textContent = rows;
      var state = root.querySelector('#cyanActionsState');
      if (state) state.textContent = master && !master.checked ? 'الكل متوقف' : (items ? 'الإجراءات مفعّلة' : 'الكل متوقف');
    }
    refreshCounts();
  }

  function build() {
    var view = document.getElementById(VIEW_ID);
    if (!view) return;
    var legacy = view.querySelector(':scope > .actions-container');
    if (!legacy || legacy.dataset.studioBuilt === '1') return;
    for (var i = 0; i < REQUIRED.length; i++) {
      if (!document.getElementById(REQUIRED[i])) return;
    }

    legacy.dataset.studioBuilt = '1';

    var root = document.createElement('div');
    root.id = 'studio-main';
    root.tabIndex = -1;
    root.setAttribute('data-section', 'actions');
    root.className = 'to-main actions-studio-main';
    root.innerHTML = layout();
    view.insertBefore(root, legacy);

    // Relocate live nodes (listeners and ids survive a DOM move).
    var created = root.querySelector('#cyanCreateActionBtn');
    if (created) created.remove();
    move('createActionBtn', root.querySelector('.ag-create-tools'), true);
    var createBtn = document.getElementById('createActionBtn');
    if (createBtn) createBtn.classList.add('cyan-create');

    var groupCreated = root.querySelector('#cyanCreateGroupBtn');
    if (groupCreated) groupCreated.remove();
    move('createGroupBtn', root.querySelector('.ag-create-tools'));

    move('actionsList', root.querySelector('.ag-section-host'));
    move('countryLookupsContainer', root.querySelector('.cyan-country-host'));
    move('screensContainer', root.querySelector('.al-screens'));
    var store = document.getElementById('screensContainer');
    if (store) store.hidden = true;
    move('alertHistoryContainer', root.querySelector('.cyan-console-host'));
    move('alertConsoleObsUrl', root.querySelector('.cyan-obs-copy'), true);
    move('alertConsoleObsCopyBtn', root.querySelector('.cyan-obs-copy'));

    var mount = document.getElementById('actionAiAssistantMount');
    var mountSlot = root.querySelector('.cyan-ai-mount');
    if (mount && mountSlot) {
      while (mountSlot.firstChild) mountSlot.removeChild(mountSlot.firstChild);
      mountSlot.parentNode.replaceChild(mount, mountSlot);
    }
    var masterNative = move('actionsMasterToggle', root.querySelector('.cyan-run-controls'));
    if (masterNative) masterNative.classList.add('cyan-master-native');
    var masterLabel = move('actionsMasterToggleLabel', root.querySelector('.cyan-run-controls'));
    if (masterLabel) {
      masterLabel.classList.add('sr-only');
      masterLabel.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;';
    }

    legacy.classList.add('actions-studio-legacy');

    bind(root, legacy);
  }

  function start() {
    build();
    var view = document.getElementById(VIEW_ID);
    if (!view) return;
    var mo = new MutationObserver(function () { build(); });
    mo.observe(view, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
