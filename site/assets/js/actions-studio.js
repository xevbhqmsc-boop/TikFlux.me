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
    pause: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    sliders: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/></svg>',
    activity: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
    clapper: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    layers: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    folderPlus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    copy: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    external: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    coins: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-type-icon lucide lucide-coins" aria-hidden="true"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"></path><path d="M15 6h1v4"></path><path d="m6.134 14.768.866-.5 2 3.464"></path><circle cx="16" cy="8" r="6"></circle></svg>',
    message: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-type-icon lucide lucide-message-square" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path></svg>',
    image: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-type-icon lucide lucide-image" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>',
    volume: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-type-icon lucide lucide-volume2 lucide-volume-2" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path></svg>',
    mic: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-type-icon lucide lucide-mic" aria-hidden="true"><path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect x="9" y="2" width="6" height="13" rx="3"></rect></svg>',
    keyboard: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-type-icon lucide lucide-keyboard" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M7 12h.001M11 12h.001M15 12h.001M8 16h8"></path></svg>',
    gift: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gift" aria-hidden="true"><path d="M12 7v14"></path><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"></path><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"></path><rect x="3" y="7" width="18" height="4" rx="1"></rect></svg>',
    rotate: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>',
    grid: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid2x2 lucide-grid-2x2" aria-hidden="true"><path d="M12 3v18"></path><path d="M3 12h18"></path><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings2 lucide-settings-2" aria-hidden="true"><path d="M14 17H5"></path><path d="M19 7h-9"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>',
    chevronDownSmall: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tf-select-chevron lucide lucide-chevron-down" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>'
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

  /* The alert-library picker is rendered by the untouched Actions bundle and
     writes raw translation keys as plain text. Keep the whole Actions area
     Arabic by supplying those keys through a small additive layer. */
  var ALERT_AR = {
    'alertLibrary.title': 'مكتبة الأليرتات',
    'alertLibrary.storeTitle': 'متجر الأليرتات',
    'alertLibrary.backToLibrary': 'العودة للمكتبة',
    'alertLibrary.backToLibraryAria': 'العودة إلى مكتبة الأليرتات',
    'alertLibrary.closeAria': 'إغلاق',
    'alertLibrary.mineBtn': 'أليرتاتي',
    'alertLibrary.mineTitle': 'أليرتاتي',
    'alertLibrary.ordersBtn': 'طلباتي',
    'alertLibrary.ordersTitle': 'طلباتي',
    'alertLibrary.cartBtn': 'السلة',
    'alertLibrary.cartBtnAria': 'فتح سلة الأليرتات',
    'alertLibrary.cartTitle': 'سلة الأليرتات',
    'alertLibrary.cartEmpty': 'سلتك فارغة حالياً',
    'alertLibrary.clearCart': 'إفراغ السلة',
    'alertLibrary.removeFromCart': 'إزالة من السلة',
    'alertLibrary.removeFromCartBtn': 'إزالة من السلة',
    'alertLibrary.goToCart': 'اذهب للسلة',
    'alertLibrary.inCart': 'في السلة',
    'alertLibrary.checkoutTitle': 'إتمام الشراء',
    'alertLibrary.loginRequiredStore': 'يرجى تسجيل الدخول للوصول للمتجر',
    'alertLibrary.loginToCheckout': 'تسجيل الدخول للشراء',
    'alertLibrary.total': 'الإجمالي',
    'alertLibrary.loading': 'جارٍ التحميل...',
    'alertLibrary.loadingOrders': 'جاري تحميل الطلبات...',
    'alertLibrary.loadFailed': 'تعذّر تحميل الأليرتات، حاول مرة ثانية',
    'alertLibrary.ordersEmpty': 'لا توجد طلبات',
    'alertLibrary.ordersLoadFailed': 'فشل تحميل الطلبات',
    'alertLibrary.selectFailed': 'تعذّر اختيار الأليرت، حاول مرة ثانية',
    'alertLibrary.emptyAll': 'ما فيه أليرتات متاحة الآن',
    'alertLibrary.emptyCategory': 'ما فيه أليرتات في هذا التصنيف',
    'alertLibrary.emptyDefault': 'ما فيه أليرتات',
    'alertLibrary.emptyFree': 'ما فيه أليرتات مجانية الآن',
    'alertLibrary.emptyMine': 'ما عندك أليرتات محفوظة لسه',
    'alertLibrary.emptyNew': 'ما فيه أليرتات جديدة الآن',
    'alertLibrary.emptyPaid': 'ما فيه أليرتات مدفوعة الآن',
    'alertLibrary.filters.all': 'الكل',
    'alertLibrary.filters.new': 'جديد',
    'alertLibrary.filters.free': 'مجاني',
    'alertLibrary.filters.paid': 'مدفوع',
    'alertLibrary.categories.likes': 'لايكات',
    'alertLibrary.categories.countries': 'دول',
    'alertLibrary.categories.boys': 'أولاد',
    'alertLibrary.categories.girls': 'بنات',
    'alertLibrary.categories.love': 'حب',
    'alertLibrary.categories.follow': 'فولو',
    'alertLibrary.categories.anime': 'أنمي',
    'alertLibrary.badgeNew': 'جديد',
    'alertLibrary.badgeFree': 'مجاني',
    'alertLibrary.badgePurchased': 'مشتري',
    'alertLibrary.use': 'استخدم',
    'alertLibrary.useHint': 'استخدم هذا الأليرت في الإجراء',
    'alertLibrary.useInAction': 'استخدم في الإجراء',
    'alertLibrary.apply': 'تطبيق',
    'alertLibrary.buyNow': 'اشترِ الآن',
    'alertLibrary.addToCart': 'أضف للسلة',
    'alertLibrary.cancel': 'إلغاء',
    'alertLibrary.ownershipNote': 'الأليرتات المدفوعة تحتاج شراء قبل استخدامها',
    'alertLibrary.alertLocked': 'هذا الأليرت مقفل، اشترِه أولاً',
    'alertLibrary.transparencyHint': 'شفافية الأليرت',
    'alertLibrary.durationTitle': 'المدة',
    'alertLibrary.durationUnit': 'ثانية',
    'alertLibrary.durationWord': 'مدة',
    'alertLibrary.playerPlayAria': 'تشغيل المعاينة',
    'alertLibrary.playerSeekAria': 'تقدّم الفيديو',
    'alertLibrary.playerVolumeAria': 'مستوى الصوت',
    'alertLibrary.paySuccessTitle': 'تم الدفع بنجاح',
    'alertLibrary.paySuccessSub': 'الأليرت صار متاح في أليرتاتي',
    'alertLibrary.checkoutErrors.generic': 'تعذّر إتمام الشراء، حاول مرة ثانية',
    'alertLibrary.orderStatus.pending': 'قيد الانتظار',
    'alertLibrary.orderStatus.paid': 'مدفوع',
    'alertLibrary.orderStatus.failed': 'فاشل',
    'alertLibrary.orderStatus.refunded': 'مسترجع'
  };

  function installAlertTranslations() {
    if (window.__tfAlertI18nInstalled === '1') return;
    window.__tfAlertI18nInstalled = '1';

    try {
      if (!window.__I18N_AR__) window.__I18N_AR__ = {};
      var nested = {};
      Object.keys(ALERT_AR).forEach(function (key) {
        var parts = key.split('.');
        var cur = nested;
        for (var i = 1; i < parts.length; i++) {
          if (!cur[parts[i]]) cur[parts[i]] = {};
          cur = cur[parts[i]];
        }
      });
      Object.keys(ALERT_AR).forEach(function (key) {
        var parts = key.split('.');
        var cur = nested;
        for (var i = 1; i < parts.length - 1; i++) cur = cur[parts[i]];
        cur[parts[parts.length - 1]] = ALERT_AR[key];
      });
      window.__I18N_AR__.alertLibrary = nested.alertLibrary;
    } catch (e) {}

    try {
      if (window.__MOCK_TRANSLATIONS__) {
        Object.keys(ALERT_AR).forEach(function (key) {
          if (!window.__MOCK_TRANSLATIONS__[key]) window.__MOCK_TRANSLATIONS__[key] = ALERT_AR[key];
        });
      }
    } catch (e) {}

    try {
      if (window.i18n && typeof window.i18n.t === 'function' && !window.i18n.__tfAlertWrapped) {
        var origT = window.i18n.t;
        window.i18n.__tfAlertWrapped = true;
        window.i18n.t = function (key) {
          if (ALERT_AR[key]) return ALERT_AR[key];
          return origT.apply(this, arguments);
        };
      }
    } catch (e) {}
  }

  function translateAlertText(root) {
    var scope = root || document;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (n) {
      var value = n.textContent;
      if (!value) return;
      var trimmed = value.replace(/^\s+|\s+$/g, '');
      if (Object.prototype.hasOwnProperty.call(ALERT_AR, trimmed) && value !== ALERT_AR[trimmed]) {
        n.textContent = value.replace(trimmed, ALERT_AR[trimmed]);
      }
    });
    var attrs = ['title', 'aria-label', 'placeholder'];
    scope.querySelectorAll && scope.querySelectorAll('[title],[aria-label],[placeholder]').forEach(function (el) {
      attrs.forEach(function (attr) {
        var value = el.getAttribute(attr);
        if (!value) return;
        var trimmed = value.replace(/^\s+|\s+$/g, '');
        if (Object.prototype.hasOwnProperty.call(ALERT_AR, trimmed) && value !== ALERT_AR[trimmed]) {
          el.setAttribute(attr, ALERT_AR[trimmed]);
        }
      });
    });
  }

  function fixBrokenAvatars() {
    var fallback = '/assets/img/avatar1.png';
    var avatar = document.getElementById('roomAvatar');
    if (avatar && avatar.getAttribute('src') === '/' && !avatar.dataset.tfAvatarFixed) {
      avatar.dataset.tfAvatarFixed = '1';
      avatar.setAttribute('src', fallback);
    }
    document.querySelectorAll('.action-avatar-face img[src="/ranking-avatars/man-gold.webp"]').forEach(function (img) {
      img.setAttribute('src', fallback);
    });
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

  /* The copied screen link must carry the alert itself, not just a uid. The
     bundles build a bare /overlay/actions.html?uid=..&screen=.. link, so we add
     the current video and overlay settings to any copied screen URL. */
  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }
  function fieldChecked(id) {
    var el = document.getElementById(id);
    return !el || el.checked !== false;
  }
  function fieldNumber(id, fallback) {
    var n = parseInt(fieldValue(id), 10);
    return isFinite(n) ? n : fallback;
  }
  function absoluteUrl(url) {
    if (!url) return '';
    try { return new URL(url, window.location.href).href; } catch (e) { return String(url); }
  }
  function currentVideoUrl() {
    var nameEl = document.getElementById('currentVideoName');
    var name = nameEl ? String(nameEl.textContent || '').replace(/\s+/g, ' ').trim() : '';
    var lib = window.__tfLastLibraryAlert;
    /* Library previews are proxied through our own origin; the catalog URL can
       expire or return 403 when opened directly in OBS. */
    if (lib && lib.id && (!name || name === lib.name || name.indexOf(lib.name) >= 0 || lib.name.indexOf(name) >= 0)) {
      return absoluteUrl('/api/alert-library/previews/' + encodeURIComponent(lib.id) + '/video');
    }
    var sign = window.__tfLastUploadSign;
    if (sign && sign.videoUrl && (!name || name === (sign.videoFilename || sign.video_filename))) {
      return absoluteUrl(sign.videoUrl);
    }
    var stageVideo = document.getElementById('tfStageVideo');
    var src = stageVideo ? (stageVideo.getAttribute('src') || stageVideo.currentSrc || '') : '';
    if (!src || /^blob:/i.test(src)) {
      var advanced = document.getElementById('advancedPreviewVideo');
      if (advanced) src = advanced.getAttribute('data-src') || advanced.getAttribute('src') || '';
    }
    return absoluteUrl(src);
  }
  function currentAlertConfig() {
    var mirror = document.getElementById('tfLinkedMirror');
    var nameField = document.getElementById('actionName');
    var messageField = document.getElementById('messageText');
    var nameOut = mirror && mirror.querySelector('[data-tf-src-id="previewName"]');
    var messageOut = mirror && mirror.querySelector('[data-tf-src-id="previewMessage"]');
    var avatar = document.getElementById('previewAvatar');
    var gift = document.querySelector('#previewGiftWrap img');
    var shape = document.querySelector('input[name="avatarShape"]:checked');
    return {
      video: currentVideoUrl(),
      name: (nameField && nameField.value.trim()) || (nameOut && nameOut.textContent) || 'مستخدم تجريبي',
      message: (messageField && messageField.value.trim()) || (messageOut && messageOut.textContent) || '',
      avatar: absoluteUrl((avatar && avatar.getAttribute('src')) || '/assets/img/avatar1.png'),
      gift: absoluteUrl((gift && gift.getAttribute('src')) || '/assets/img/tx-logo.png'),
      avatarSize: fieldNumber('avatarSize', 150),
      avatarShape: (shape && shape.value) || 'circle',
      borderColor: fieldValue('borderColor') || '#00aeff',
      nameColor: fieldValue('nameColor') || '#00aeff',
      messageColor: fieldValue('messageColor') || '#ffffff',
      nameFontSize: fieldNumber('nameFontSize', 28),
      messageFontSize: fieldNumber('messageFontSize', 22),
      nameFontFamily: fieldValue('nameFontFamily') || "'Thmanyah Sans', sans-serif",
      messageFontFamily: fieldValue('messageFontFamily') || "'Thmanyah Sans', sans-serif",
      showAvatar: fieldChecked('overlayShowAvatar'),
      showName: fieldChecked('overlayShowName'),
      showGift: fieldChecked('overlayShowGiftImage'),
      avatarPosX: fieldNumber('avatarPosX', 0),
      avatarPosY: fieldNumber('avatarPosY', -34),
      textPosX: fieldNumber('textPosX', 0),
      textPosY: fieldNumber('textPosY', 12),
      duration: fieldNumber('duration', 5),
      volume: fieldNumber('volumeLevel', 80),
      screen: fieldNumber('targetScreen', 1),
      type: fieldValue('eventTypeSelect') || 'gift'
    };
  }
  var ENRICHABLE_LINK = /\/overlay\/actions\.html|\/widgets\/action-alert-console\/index\.html/i;
  function enrichCopiedLink(value) {
    var text = String(value || '');
    if (!ENRICHABLE_LINK.test(text)) return text;
    try {
      var url = new URL(text, window.location.href);
      if (url.searchParams.get('tf') === '1') return url.href;
      var cfg = currentAlertConfig();
      url.searchParams.set('tf', '1');
      url.searchParams.set('v', cfg.video);
      url.searchParams.set('a', cfg.avatar);
      url.searchParams.set('g', cfg.gift);
      url.searchParams.set('n', cfg.name);
      url.searchParams.set('m', cfg.message);
      url.searchParams.set('cfg', JSON.stringify(cfg));
      window.__tfLastCopiedText = url.href;
      return url.href;
    } catch (e) { return text; }
  }
  function installScreenCopyEnricher() {
    if (window.__tfScreenCopyEnricher === '1') return;
    window.__tfScreenCopyEnricher = '1';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      var originalWrite = navigator.clipboard.writeText;
      navigator.clipboard.writeText = function (text) {
        var enriched = enrichCopiedLink(text);
        window.__tfLastCopiedText = enriched;
        return originalWrite.call(navigator.clipboard, enriched);
      };
    }
    var originalExec = document.execCommand;
    document.execCommand = function (command) {
      if (String(command).toLowerCase() === 'copy') {
        var active = document.activeElement;
        if (active && active.value && ENRICHABLE_LINK.test(active.value)) {
          var enriched = enrichCopiedLink(active.value);
          if (enriched !== active.value) {
            var old = active.value;
            active.value = enriched;
            if (active.setSelectionRange) active.setSelectionRange(0, enriched.length);
            var result = originalExec.apply(document, arguments);
            active.value = old;
            return result;
          }
        }
      }
      return originalExec.apply(document, arguments);
    };
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
      var link = enrichCopiedLink(src.value || '');
      urlInput.value = link;
      openBtn.href = link;
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

  /* ------------------------------------------------ studio create-action dialog */

  function previewMarkup() {
    return '<div class="al-player">' +
      '<div class="al-stage al-checker" id="tfPreviewStage">' +
        '<svg class="ts-brand-logo al-preview-logo" viewBox="0 0 1254 1254" aria-hidden="true" focusable="false">' +
          '<defs>' +
            '<image id="tf-modal-logo-art" href="/assets/img/tx-logo.png" width="1254" height="1254"></image>' +
            '<clipPath id="tf-modal-logo-crop" clipPathUnits="userSpaceOnUse"><path d="M97 87H1164V991H368V930H97Z"></path></clipPath>' +
          '</defs>' +
          '<g clip-path="url(#tf-modal-logo-crop)"><use href="#tf-modal-logo-art"></use></g>' +
        '</svg>' +
        '<div class="al-transition" id="tfPreviewTransition">' +
          '<div class="action-output">' +
            '<div class="action-avatar-position">' +
              '<div class="action-avatar-shell action-profile-circle">' +
                '<div class="action-avatar-face"><img src="/assets/img/avatar1.png" alt=""></div>' +
              '</div>' +
            '</div>' +
            '<div class="action-copy-position">' +
              '<strong id="tfPreviewName">مستخدم تجريبي</strong>' +
              '<div id="tfPreviewMessage">رسالة تجريبية</div>' +
              '<span class="action-gift-image">' + ICON.gift + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="al-player-controls">' +
        '<button type="button" id="tfPreviewPlay" aria-label="تشغيل المعاينة">' + ICON.play + '</button>' +
        '<button type="button" id="tfPreviewReplay" aria-label="إعادة المعاينة">' + ICON.rotate + '</button>' +
        '<input class="al-preview-seek" id="tfPreviewSeek" dir="ltr" min="0" max="5" step="0.1" value="0" type="range" aria-label="تقدم المعاينة">' +
        '<span dir="ltr" id="tfPreviewTime">0.0 / 5ث</span>' +
        '<button type="button" id="tfPreviewChecker" aria-pressed="true" aria-label="خلفية الشفافية">' + ICON.grid + '</button>' +
      '</div>' +
    '</div>' +
    '<div id="tfPreviewAdvancedHost" class="tf-preview-advanced-host"></div>' +
    '<p class="al-rule-preview-note">اضبط مواضع الصورة والاسم والرسالة والألوان والأحجام من الإعدادات المتقدمة.</p>';
  }

  function directChild(el, root) {
    while (el && el.parentElement && el.parentElement !== root) el = el.parentElement;
    return el && el.parentElement === root ? el : null;
  }

  function hintNode(text) {
    var p = document.createElement('p');
    p.className = 'field-hint';
    p.textContent = text;
    return p;
  }

  function insertToken(input, token) {
    if (!input) return;
    var start = input.selectionStart == null ? input.value.length : input.selectionStart;
    var end = input.selectionEnd == null ? start : input.selectionEnd;
    var before = input.value.slice(0, start);
    var after = input.value.slice(end);
    var padBefore = before && !/\s$/.test(before) ? ' ' : '';
    var padAfter = after && !/^\s/.test(after) ? ' ' : '';
    var value = before + padBefore + token + padAfter + after;
    input.value = value.substring(0, 240);
    var caret = Math.min(input.value.length, before.length + padBefore.length + token.length + padAfter.length);
    try { input.focus(); input.setSelectionRange(caret, caret); } catch (e) {}
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function addSelectChevron(node) {
    if (!node || node.querySelector('.tf-select-chevron')) return;
    var old = node.querySelector('.event-type-trigger-chevron, i.fa-chevron-down, i.fas.fa-chevron-down');
    if (old) old.style.display = 'none';
    node.classList.add('choice');
    node.setAttribute('data-slot', 'select-trigger');
    node.insertAdjacentHTML('beforeend', ICON.chevronDownSmall);
  }

  function paintEventIcon() {
    var host = document.querySelector('#eventTypeTrigger .event-type-trigger-icon');
    if (!host || host.querySelector('svg')) return;
    var old = host.querySelector('i');
    if (old) old.style.display = 'none';
    host.insertAdjacentHTML('beforeend', ICON.coins);
  }

  /* Cosmetic only: the upload handlers and the 50MB guard live in the app bundle. */
  function skinUploadControls() {
    var area = document.getElementById('videoUploadArea');
    var libBtn = document.getElementById('openAlertLibraryBtn');
    var row = libBtn && libBtn.closest('.alib-upload-row');

    if (row) row.classList.add('tf-upload-row');
    if (libBtn) {
      libBtn.classList.add('tf-library-btn');
      /* goals.html adds an inline handler that switches the page to the store.
         The bundle listener still opens the picker; keep only that behaviour. */
      libBtn.onclick = null;
      var libOld = libBtn.querySelector('i');
      if (libOld) libOld.style.display = 'none';
      if (!libBtn.querySelector('.tf-type-icon')) libBtn.insertAdjacentHTML('afterbegin', ICON.image);
    }

    if (!area) return;
    area.classList.add('tf-dropzone');
    var iconHost = area.querySelector(':scope > div:first-child');
    var oldIcon = iconHost && iconHost.querySelector('i');
    if (oldIcon) oldIcon.style.display = 'none';
    if (iconHost && !iconHost.querySelector('.tf-type-icon')) iconHost.insertAdjacentHTML('afterbegin', ICON.image);
    var maxHint = area.querySelector('[data-i18n="actions.max50mb"]');
    if (maxHint && maxHint.parentElement) maxHint.parentElement.classList.add('tf-max-hint');

    if (area.dataset.uploadSkinBound === '1') return;
    area.dataset.uploadSkinBound = '1';
    ['dragenter', 'dragover'].forEach(function (type) {
      area.addEventListener(type, function () { area.classList.add('tf-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      area.addEventListener(type, function () { area.classList.remove('tf-dragover'); });
    });
  }

  /* Remember the URL returned by our local sign endpoint, and the alert the
     library picker was clicked on. The bundles keep both states private, so we
     observe them without editing the bundles. */
  function rememberVideoChoices() {
    if (window.__tfVideoChoiceHook === '1') return;
    window.__tfVideoChoiceHook = '1';

    var originalFetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      var input = args[0];
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var promise = originalFetch.apply(this, args);
      if (String(url).indexOf('/api/actions/upload-video/sign') !== -1 && promise && promise.then) {
        promise.then(function (resp) {
          if (resp && resp.ok && resp.clone) {
            resp.clone().json().then(function (data) {
              if (data && data.videoUrl) window.__tfLastUploadSign = data;
            }).catch(function () {});
          }
        }).catch(function () {});
      }
      return promise;
    };

    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!target || !target.closest) return;
      var card = target.closest('.alib-card');
      if (!card) return;
      var thumb = card.querySelector('[data-url]');
      if (!thumb) return;
      var nameEl = card.querySelector('.alib-card__name');
      var poster = card.querySelector('.alib-card__poster');
      window.__tfLastLibraryAlert = {
        id: thumb.getAttribute('data-id') || '',
        url: thumb.getAttribute('data-url') || '',
        name: thumb.getAttribute('data-name') || (nameEl ? nameEl.textContent.trim() : ''),
        duration: thumb.getAttribute('data-duration') || '',
        poster: poster ? (poster.getAttribute('src') || '') : ''
      };
    }, true);
  }

  function syncVideoTimeUI() {
    var video = document.getElementById('tfStageVideo');
    var seek = document.getElementById('tfPreviewSeek');
    var time = document.getElementById('tfPreviewTime');
    if (!video || !seek || !time) return;
    var durationField = document.getElementById('duration');
    var fallback = durationField ? parseInt(durationField.value, 10) : 5;
    if (!isFinite(fallback) || fallback < 2) fallback = 5;
    var total = (isFinite(video.duration) && video.duration > 0) ? video.duration : fallback;
    var current = Math.min(total, Math.max(0, video.currentTime || 0));
    seek.max = String(Math.round(total * 10) / 10);
    seek.value = String(Math.round(current * 10) / 10);
    time.textContent = current.toFixed(1) + ' / ' + total.toFixed(1) + 'ث';
    var transition = document.getElementById('tfPreviewTransition');
    if (transition) transition.style.opacity = '1';
    document.getElementById('tfPreviewStage')?.classList.add('is-playing');
  }

  function syncVideoPreview() {
    var display = document.getElementById('videoDisplay');
    var stage = document.getElementById('tfPreviewStage');
    if (!display || !stage) return;

    var nameEl = document.getElementById('currentVideoName');
    var name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '';
    var visible = display.style.display === 'block' || getComputedStyle(display).display !== 'none';
    var src = '';
    var kind = '';
    var poster = '';
    var duration = '';

    if (visible && name) {
      var lib = window.__tfLastLibraryAlert;
      if (lib && lib.url && lib.name === name) {
        src = lib.url;
        kind = 'مكتبة الأليرتات';
        poster = lib.poster || '';
        duration = lib.duration || '';
      } else {
        var up = window.__tfLastUploadSign;
        if (up && up.videoUrl && (!up.videoFilename || up.videoFilename === name)) {
          src = up.videoUrl;
          kind = 'من سطح المكتب';
        }
      }
    }

    var row = display.querySelector('.tf-video-selection');
    if (!row) {
      row = document.createElement('div');
      row.className = 'tf-video-selection';
      row.innerHTML =
        '<div class="tf-video-thumb">' +
          '<video class="tf-video-thumb-player" muted playsinline preload="metadata"></video>' +
          '<img class="tf-video-thumb-poster" src="/assets/img/tx-logo.png" alt="">' +
          '<span class="tf-video-thumb-play" aria-hidden="true">▶</span>' +
        '</div>' +
        '<div class="tf-video-selection-info">' +
          '<strong class="tf-video-selection-name"></strong>' +
          '<span class="tf-video-selection-kind"></span>' +
        '</div>' +
        '<button type="button" class="tf-video-advanced-btn" data-slot="advanced-settings"></button>';
      display.appendChild(row);

      var fallback = row.querySelector('.tf-video-thumb-poster');
      fallback.addEventListener('error', function () {
        if (this.getAttribute('src') !== '/assets/img/tx-logo.png') {
          this.setAttribute('src', '/assets/img/tx-logo.png');
        }
      });
      row.querySelector('.tf-video-advanced-btn').addEventListener('click', function () {
        var advanced = document.getElementById('advancedSettingsBtn');
        if (advanced) advanced.click();
      });
    }

    var label = row.querySelector('.tf-video-selection-name');
    var meta = row.querySelector('.tf-video-selection-kind');
    var advancedBtn = row.querySelector('.tf-video-advanced-btn');
    var advanced = document.getElementById('advancedSettingsBtn');
    var advancedText = advanced ? advanced.textContent.replace(/\s+/g, ' ').trim() : 'إعدادات متقدمة';
    var metaText = kind + (duration ? ' • ' + duration + 'ث' : '');
    if (label && label.textContent !== name) label.textContent = name;
    if (meta && meta.textContent !== metaText) meta.textContent = metaText;
    if (advancedBtn && advancedBtn.textContent !== advancedText) advancedBtn.textContent = advancedText;

    var player = row.querySelector('.tf-video-thumb-player');
    var posterEl = row.querySelector('.tf-video-thumb-poster');
    if (row.getAttribute('data-src') !== src) {
      row.setAttribute('data-src', src);
      row.classList.toggle('tf-preview-failed', false);
      if (player) {
        if (src) { player.src = src; player.load(); }
        else { player.removeAttribute('src'); player.load(); }
      }
      if (posterEl && poster) posterEl.setAttribute('src', poster);
    }
    if (player && player.dataset.previewBound !== '1') {
      player.dataset.previewBound = '1';
      player.addEventListener('error', function () {
        row.classList.add('tf-preview-failed');
        stage.classList.remove('tf-has-video');
      });
      player.addEventListener('loadeddata', function () {
        row.classList.remove('tf-preview-failed');
        stage.classList.add('tf-has-video');
      });
    }

    var stageVideo = document.getElementById('tfStageVideo');
    if (!stageVideo) {
      stageVideo = document.createElement('video');
      stageVideo.id = 'tfStageVideo';
      stageVideo.className = 'tf-stage-video';
      stageVideo.setAttribute('muted', '');
      stageVideo.setAttribute('playsinline', '');
      stageVideo.setAttribute('preload', 'metadata');
      stage.insertBefore(stageVideo, stage.firstChild);
      stageVideo.addEventListener('error', function () { stage.classList.remove('tf-has-video'); });
      stageVideo.addEventListener('loadeddata', function () { stage.classList.add('tf-has-video'); });
      stageVideo.addEventListener('loadedmetadata', syncVideoTimeUI);
      stageVideo.addEventListener('timeupdate', syncVideoTimeUI);
      stageVideo.addEventListener('play', function () {
        var btn = document.getElementById('tfPreviewPlay');
        if (btn) btn.innerHTML = ICON.pause;
      });
      stageVideo.addEventListener('pause', function () {
        var btn = document.getElementById('tfPreviewPlay');
        if (btn) btn.innerHTML = ICON.play;
      });
    }
    if (stageVideo.getAttribute('src') !== src) {
      if (src) { stageVideo.src = src; stageVideo.load(); }
      else { stageVideo.removeAttribute('src'); stageVideo.load(); stage.classList.remove('tf-has-video'); }
    }
    if (!src) stage.classList.remove('tf-has-video');
    var transition = document.getElementById('tfPreviewTransition');
    var wantOpacity = src ? '1' : '0';
    if (transition && transition.style.opacity !== wantOpacity) transition.style.opacity = wantOpacity;
    stage.classList.toggle('is-playing', !!src);
  }

  /* Link the studio preview to the real advanced-settings preview. The bundle
     writes its overlay styles on #previewAvatarLayer / #previewTextLayer; we
     mirror those layers (ids stripped) into the studio stage and keep them in
     sync. Nothing in the bundles is changed. */
  function cloneAdvancedLayer(id) {
    var src = document.getElementById(id);
    if (!src) return null;
    var clone = src.cloneNode(true);
    function mark(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.id) {
        node.setAttribute('data-tf-src-id', node.id);
        node.removeAttribute('id');
      }
      Array.prototype.forEach.call(node.children, mark);
    }
    mark(clone);
    return clone;
  }

  function ensureLinkedMirror() {
    if (window.__tfLinkedMirrorBuilt === '1') return;
    var stage = document.getElementById('tfPreviewStage');
    var transition = document.getElementById('tfPreviewTransition');
    var output = transition && transition.querySelector('.action-output');
    if (!stage || !output || !document.getElementById('previewAvatarLayer') || !document.getElementById('previewTextLayer')) return;
    window.__tfLinkedMirrorBuilt = '1';

    var mirror = document.createElement('div');
    mirror.id = 'tfLinkedMirror';
    mirror.className = 'tf-linked-mirror';
    var canvas = document.createElement('div');
    canvas.id = 'tfLinkedCanvas';
    canvas.className = 'tf-linked-canvas actions-advanced-preview__canvas';
    canvas.appendChild(cloneAdvancedLayer('previewAvatarLayer'));
    canvas.appendChild(cloneAdvancedLayer('previewTextLayer'));
    mirror.appendChild(canvas);
    output.appendChild(mirror);
    output.classList.add('tf-linked-ready');
    syncLinkedMirror();
  }

  function setStyleText(el, value) {
    if (el && el.style.cssText !== value) el.style.cssText = value;
  }
  function setClassText(el, value) {
    if (el && (el.getAttribute('class') || '') !== value) el.setAttribute('class', value);
  }
  function setAttr(el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function syncLinkedMirror() {
    var stage = document.getElementById('tfPreviewStage');
    var transition = document.getElementById('tfPreviewTransition');
    var mirror = document.getElementById('tfLinkedMirror');
    var canvas = document.getElementById('tfLinkedCanvas');
    if (!stage || !mirror || !canvas) { ensureLinkedMirror(); return; }

    var scale = Math.max(0.04, stage.clientWidth / 1920);
    var transform = 'translate(-50%, -50%) scale(' + scale + ')';
    setStyleText(canvas, 'width: 1920px; height: 1080px; left: 50%; top: 50%; transform: ' + transform + ';');

    ['previewAvatarLayer', 'previewTextLayer'].forEach(function (id) {
      var src = document.getElementById(id);
      var dst = mirror.querySelector('[data-tf-src-id="' + id + '"]');
      if (!src || !dst) return;
      setStyleText(dst, src.style.cssText);
      setClassText(dst, src.getAttribute('class') || '');
      var srcNodes = [src].concat(Array.prototype.slice.call(src.querySelectorAll('[id]')));
      srcNodes.forEach(function (sn) {
        var dn = sn === src ? dst : mirror.querySelector('[data-tf-src-id="' + sn.id + '"]');
        if (!dn) return;
        if (sn !== src) {
          setStyleText(dn, sn.style.cssText);
          setClassText(dn, sn.getAttribute('class') || '');
        }
        if (sn.tagName === 'IMG' && sn.getAttribute('src')) setAttr(dn, 'src', sn.getAttribute('src'));
      });
    });

    var nameField = document.getElementById('actionName');
    var messageField = document.getElementById('messageText');
    setText(mirror.querySelector('[data-tf-src-id="previewName"]'), (nameField && nameField.value.trim()) || 'مستخدم تجريبي');
    setText(mirror.querySelector('[data-tf-src-id="previewMessage"]'), (messageField && messageField.value.trim()) || 'رسالة تجريبية');

    var wrap = document.getElementById('previewAvatarWrap');
    var frame = wrap ? wrap.style.getPropertyValue('--frame-color').trim() : '';
    var output = transition && transition.querySelector('.action-output');
    if (output && frame && output.style.getPropertyValue('--action-border').trim() !== frame) {
      output.style.setProperty('--action-border', frame);
    }

    var video = document.getElementById('tfStageVideo');
    var hasVideo = !!(video && video.getAttribute('src'));
    var wantOpacity = hasVideo ? '1' : '0';
    if (transition && transition.style.opacity !== wantOpacity) transition.style.opacity = wantOpacity;
    stage.classList.toggle('is-playing', hasVideo);
  }

  function bindAdvancedSync() {
    if (window.__tfAdvancedSyncBound === '1') return;
    window.__tfAdvancedSyncBound = '1';
    ensureLinkedMirror();

    var canvas = document.getElementById('advancedPreviewCanvas');
    if (canvas) {
      new MutationObserver(syncLinkedMirror).observe(canvas, {
        attributes: true, childList: true, subtree: true, characterData: true
      });
    }
    var form = document.getElementById('advancedSettingsForm');
    if (form) {
      ['input', 'change'].forEach(function (type) {
        form.addEventListener(type, syncLinkedMirror, true);
      });
    }
    var later = function () { setTimeout(function () { setTimeout(syncLinkedMirror, 0); }, 0); };
    var advancedBtn = document.getElementById('advancedSettingsBtn');
    if (advancedBtn) advancedBtn.addEventListener('click', later);
    var saveBtn = document.getElementById('saveAdvancedSettingsBtn');
    if (saveBtn) saveBtn.addEventListener('click', later);
    window.addEventListener('resize', syncLinkedMirror);
  }

  function bindPreview(form) {
    function syncText() {
      var name = document.getElementById('actionName');
      var msg = document.getElementById('messageText');
      var outName = document.getElementById('tfPreviewName');
      var outMsg = document.getElementById('tfPreviewMessage');
      var nextName = (name && name.value.trim()) || 'مستخدم تجريبي';
      var nextMsg = (msg && msg.value.trim()) || 'رسالة تجريبية';
      if (outName && outName.textContent !== nextName) outName.textContent = nextName;
      if (outMsg && outMsg.textContent !== nextMsg) outMsg.textContent = nextMsg;
      syncLinkedMirror();
    }

    if (form.dataset.previewBound === '1') { syncText(); return; }
    form.dataset.previewBound = '1';

    var stage = document.getElementById('tfPreviewStage');
    var transition = document.getElementById('tfPreviewTransition');
    var seek = document.getElementById('tfPreviewSeek');
    var time = document.getElementById('tfPreviewTime');
    var checker = document.getElementById('tfPreviewChecker');
    var play = document.getElementById('tfPreviewPlay');
    var replay = document.getElementById('tfPreviewReplay');
    var duration = document.getElementById('duration');
    function getVideo() { return document.getElementById('tfStageVideo'); }

    function maxSeconds() {
      var n = duration ? parseInt(duration.value, 10) : 5;
      if (!isFinite(n) || n < 2) n = 2;
      if (n > 120) n = 120;
      return n;
    }
    function paint() {
      if (!seek || !time || !transition || !stage) return;
      var m = maxSeconds();
      var v = Math.min(m, Math.max(0, Number(seek.value) || 0));
      seek.max = String(m);
      seek.value = String(v);
      time.textContent = v.toFixed(1) + ' / ' + m + 'ث';
      var on = v > 0 || !!(getVideo() && getVideo().getAttribute('src'));
      transition.style.opacity = on ? '1' : '0';
      stage.classList.toggle('is-playing', on);
    }
    if (seek) seek.addEventListener('input', function () {
      var video = getVideo();
      if (video && isFinite(video.duration) && video.duration > 0) {
        var ratio = Number(seek.value) / Math.max(0.1, Number(seek.max) || maxSeconds());
        video.currentTime = Math.max(0, Math.min(video.duration, ratio * video.duration));
        syncVideoTimeUI();
      } else paint();
    });
    if (duration) duration.addEventListener('input', paint);
    if (play) play.addEventListener('click', function () {
      var video = getVideo();
      if (video && video.getAttribute('src')) {
        if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        else video.pause();
        return;
      }
      if (!seek) return;
      seek.value = Number(seek.value) > 0 ? '0' : String(Math.min(maxSeconds(), 5));
      paint();
    });
    if (replay) replay.addEventListener('click', function () {
      var video = getVideo();
      if (video && video.getAttribute('src')) {
        video.currentTime = 0;
        var p = video.play(); if (p && p.catch) p.catch(function () {});
        return;
      }
      if (seek) { seek.value = '0'; paint(); }
    });
    if (checker && stage) checker.addEventListener('click', function () {
      var off = stage.classList.toggle('no-checker');
      checker.setAttribute('aria-pressed', String(!off));
    });
    [document.getElementById('actionName'), document.getElementById('messageText')].forEach(function (el) {
      if (el) el.addEventListener('input', syncText);
    });
    form.addEventListener('reset', function () { setTimeout(function () { syncText(); paint(); }, 0); });

    bindAdvancedSync();
    syncText();
    paint();
  }

  /* The create-action modal is mounted into a portal outside #actionsView.
     Its markup is reshaped here, but every original id and listener is kept. */
  function upgradeDialogClose() {
    var btn = document.getElementById('closeModalBtn');
    if (!btn || btn.dataset.dialogX === '1') return;
    btn.dataset.dialogX = '1';
    btn.setAttribute('type', 'button');
    btn.setAttribute('data-slot', 'dialog-close');
    btn.setAttribute('aria-label', 'إغلاق');
    btn.classList.remove('modal-close');
    btn.classList.add('dialog-x');
    btn.innerHTML = ICON.close;
  }

  function upgradeCreateActionForm() {
    upgradeDialogClose();
    var modal = document.getElementById('createActionModal');
    var form = document.getElementById('createActionForm');
    if (!modal || !form) return;
    if (form.dataset.studioSkinned === '1') { bindPreview(form); paintEventIcon(); skinUploadControls(); return; }
    form.dataset.studioSkinned = '1';

    modal.classList.add('studio-action-modal');
    form.classList.add('studio-action-form');
    var content = modal.querySelector('.modal-content');
    var header = modal.querySelector('.modal-header');
    var body = modal.querySelector('.modal-body');
    var actions = modal.querySelector('.form-actions');
    if (content) content.classList.add('studio-action-dialog');
    if (header) header.classList.add('studio-dialog-header');
    if (body) body.classList.add('studio-dialog-body');

    var layout = document.createElement('div');
    layout.className = 'al-rule-layout';
    var fields = document.createElement('fieldset');
    fields.className = 'action-editor-fields';
    var preview = document.createElement('div');
    preview.className = 'al-rule-preview';
    preview.innerHTML = previewMarkup();
    layout.appendChild(fields);
    layout.appendChild(preview);

    while (form.firstChild) fields.appendChild(form.firstChild);
    form.appendChild(layout);
    if (actions) {
      actions.classList.add('dialog-footer');
      form.appendChild(actions);
    }

    var advanced = document.getElementById('advancedSettingsBtn');
    var advancedHost = layout.querySelector('#tfPreviewAdvancedHost');
    if (advanced && advancedHost) {
      advanced.style.cssText = '';
      advanced.classList.add('action-advanced-button');
      if (!advanced.querySelector('svg')) advanced.insertAdjacentHTML('afterbegin', ICON.settings);
      advancedHost.appendChild(advanced);
    }
    var cancel = document.getElementById('cancelModalBtn');
    var save = document.getElementById('saveActionBtn');
    if (cancel) {
      cancel.classList.add('dialog-btn', 'dialog-btn-outline');
      cancel.setAttribute('data-slot', 'button');
      cancel.setAttribute('data-variant', 'outline');
      cancel.setAttribute('data-size', 'default');
    }
    if (save) {
      save.classList.add('dialog-btn', 'dialog-btn-primary');
      save.setAttribute('data-slot', 'button');
      save.setAttribute('data-variant', 'default');
      save.setAttribute('data-size', 'default');
    }

    fields.querySelectorAll('.form-group').forEach(function (g) { g.classList.add('field'); });
    fields.querySelectorAll('input,select,textarea').forEach(function (el) {
      if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'range' || el.type === 'file') return;
      if (el.classList.contains('event-type-select-native') || el.id === 'giftSelect' || el.id === 'countryFilter') return;
      el.setAttribute('data-slot', 'input');
    });
    fields.querySelectorAll('label').forEach(function (l) {
      if (!l.closest('.action-type-toggle') && !l.closest('.action-actor-filter')) l.setAttribute('data-slot', 'label');
    });

    var typeCards = [
      ['messageCard', ICON.message], ['videoCard', ICON.image],
      ['audioCard', ICON.volume], ['ttsCard', ICON.mic], ['keyboardCard', ICON.keyboard]
    ];
    typeCards.forEach(function (pair) {
      var card = document.getElementById(pair[0]);
      if (!card) return;
      card.classList.add('action-type');
      var label = card.querySelector(':scope > label');
      if (label) {
        label.classList.add('action-type-toggle');
        var cb = label.querySelector('input[type="checkbox"]');
        var text = cb && cb.nextElementSibling;
        if (text && !text.querySelector('.tf-type-icon')) text.insertAdjacentHTML('afterbegin', pair[1]);
      }
    });
    [['messageTextGroup', 'action-type-body'], ['videoUploadGroup', 'action-type-body'],
      ['audioUploadGroup', 'action-type-body'], ['ttsMessageGroup', 'action-type-body'],
      ['keyboardConfigGroup', 'action-type-body']].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.classList.add(pair[1]);
    });
    var messageCard = document.getElementById('messageCard');
    var typeGroup = messageCard && messageCard.closest('.form-group');
    var typeTitle = typeGroup && typeGroup.querySelector(':scope > label');
    if (typeTitle) typeTitle.classList.add('action-types-title');

    var actor = document.getElementById('actorFilterGroup');
    if (actor) {
      actor.classList.add('action-actor-filter');
      var choiceRow = actor.querySelector(':scope > div');
      if (choiceRow) choiceRow.classList.add('action-actor-choices');
    }
    var screenSelect = document.getElementById('targetScreen');
    var screenGroup = screenSelect && screenSelect.closest('.form-group');
    if (screenGroup && screenGroup.parentElement) screenGroup.parentElement.classList.add('form-columns');

    var delay = document.getElementById('infoDelaySeconds');
    var volume = document.getElementById('volumeLevel');
    var delayBlock = delay && directChild(delay, fields);
    var volumeBlock = volume && directChild(volume, fields);
    if (delayBlock) delayBlock.classList.add('field', 'range-field');
    if (volumeBlock) volumeBlock.classList.add('field', 'range-field');
    fields.querySelectorAll('div').forEach(function (d) {
      if ((d.textContent || '').trim() === 'اختر وقت ظهور المعلومات' ||
          (d.textContent || '').trim() === 'اضبط مستوى الصوت') d.classList.add('field-hint');
    });
    var countryCard = document.getElementById('countryFilterCard');
    if (countryCard) {
      countryCard.classList.add('field', 'switch-row');
      var countryLabel = countryCard.querySelector(':scope > label');
      if (countryLabel) countryLabel.classList.add('switch-row');
    }

    var minCoins = document.getElementById('minCoinsGroup');
    if (minCoins && !minCoins.querySelector('.field-hint')) {
      minCoins.appendChild(hintNode('يعمل أعلى حد مطابق فقط. الهدية المحددة لها الأولوية.'));
    }
    var messageBody = document.getElementById('messageTextGroup');
    if (messageBody && !messageBody.querySelector('.action-variable-chips')) {
      var chips = document.createElement('div');
      chips.className = 'action-variable-chips';
      ['{name}', '{count}', '{comment}'].forEach(function (token) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tf-variable-chip';
        chip.textContent = token;
        chip.addEventListener('click', function () { insertToken(document.getElementById('messageText'), token); });
        chips.appendChild(chip);
      });
      messageBody.appendChild(chips);
    }
    var ttsToken = document.querySelector('.tts-action-token-btn');
    if (ttsToken && ttsToken.parentElement) {
      ttsToken.parentElement.classList.add('action-variable-chips');
      fields.querySelectorAll('.tts-action-token-btn').forEach(function (b) { b.classList.add('tf-variable-chip'); });
    }
    [document.getElementById('eventTypeTrigger'), document.getElementById('giftSelectTrigger'),
      document.getElementById('emoteSelectTrigger'), document.getElementById('modalGroupTrigger')]
      .forEach(addSelectChevron);

    var eventHost = document.querySelector('#eventTypeTrigger .event-type-trigger-icon');
    paintEventIcon();
    if (eventHost && !eventHost.dataset.iconWatched) {
      eventHost.dataset.iconWatched = '1';
      new MutationObserver(paintEventIcon).observe(eventHost, { childList: true });
    }

    bindPreview(form);
    skinUploadControls();
  }

  function refreshStudioChrome() {
    upgradeDialogClose();
    upgradeCreateActionForm();
    syncVideoPreview();
    fixBrokenAvatars();
    translateAlertText();
  }

  function start() {
    installAlertTranslations();
    build();
    rememberVideoChoices();
    installScreenCopyEnricher();
    refreshStudioChrome();
    var view = document.getElementById(VIEW_ID);
    if (view) {
      var mo = new MutationObserver(function () { build(); });
      mo.observe(view, { childList: true });
    }
    var docMo = new MutationObserver(refreshStudioChrome);
    docMo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
