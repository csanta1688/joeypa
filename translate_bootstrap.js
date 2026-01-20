/* translate_bootstrap.js — 全站共用 Google 翻譯啟動器（支援 bfcache / 分頁切回 / 連續往返） */
(function (w, d) {
  "use strict";

  var CFG = {
    fromLang: "zh-TW",
    langKey: "site_lang",
    included: "en,ja,ko,zh-CN,fr,de,es,vi,th,id,zh-TW",
    reloadKeyPrefix: "__gt_bfcache_reload_once__",
    settleMs: 700,
    comboPollMs: 200,
    comboPollMax: 50
  };

  function setCookie(name, value) {
    d.cookie = name + "=" + value + ";path=/";
    d.cookie = name + "=" + value + ";path=/;SameSite=Lax";
  }
  function delCookie(name) {
    d.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    d.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax";
  }
  function getCookie(name) {
    var m = d.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  function getLangFromGoogtransCookie() {
    var gt = getCookie("googtrans"); // e.g. /zh-TW/ja
    var m = gt.match(/^\/([^\/]+)\/([^\/]+)$/);
    if (!m) return null;
    return { from: m[1], to: m[2] };
  }

  function getSavedLangSafe() {
    try {
      var v = w.localStorage.getItem(CFG.langKey);
      if (v && v !== "null" && v !== "undefined") return v;
    } catch (e) {}
    var gt = getLangFromGoogtransCookie();
    if (gt && gt.to) return gt.to;
    return "original";
  }

  function setGoogTransCookie(fromLang, toLang) {
    var v = "/" + fromLang + "/" + toLang;
    setCookie("googtrans", v);
  }
  function clearGoogTransCookie() {
    delCookie("googtrans");
  }

  function isTranslatedNow() {
    var de = d.documentElement;
    return !!(
      de.classList.contains("translated-ltr") ||
      de.classList.contains("translated-rtl") ||
      d.querySelector("iframe.goog-te-banner-frame") ||
      d.querySelector(".goog-te-spinner-pos")
    );
  }

  function forceApplyLangByCombo() {
    var target = getSavedLangSafe();
    if (target === "original") return;

    var tries = 0;
    var timer = w.setInterval(function () {
      tries++;
      var combo = d.querySelector("select.goog-te-combo");
      if (combo) {
        combo.value = target;
        combo.dispatchEvent(new Event("change"));
        w.clearInterval(timer);
        return;
      }
      if (tries >= CFG.comboPollMax) w.clearInterval(timer);
    }, CFG.comboPollMs);
  }

  function pageReloadKey() {
    var p = (location && location.pathname) ? location.pathname : "page";
    p = p.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return CFG.reloadKeyPrefix + p;
  }

  function applyCookieFirst() {
    var lang = getSavedLangSafe();
    if (lang === "original") clearGoogTransCookie();
    else setGoogTransCookie(CFG.fromLang, lang);
  }

  function applyAgain(evt) {
    var lang = getSavedLangSafe();
    var rk = pageReloadKey();

    if (lang === "original") {
      try { w.sessionStorage.removeItem(rk); } catch (e) {}
      clearGoogTransCookie();
      return;
    }

    setGoogTransCookie(CFG.fromLang, lang);
    forceApplyLangByCombo();

    w.setTimeout(function () {
      if (isTranslatedNow()) {
        // 翻譯成功：清旗標，避免第二次返回失效
        try { w.sessionStorage.removeItem(rk); } catch (e) {}
        return;
      }

      // 僅在 bfcache 還原時允許 reload 一次
      if (!(evt && evt.persisted)) return;

      try {
        if (w.sessionStorage.getItem(rk) === "1") return;
        w.sessionStorage.setItem(rk, "1");
      } catch (e) {
        return;
      }
      location.reload();
    }, CFG.settleMs);
  }

  // 供 index 語言選單直接呼叫（立即生效，不必刷新）
  w.__gt_set_lang = function (lang) {
    try { w.localStorage.setItem(CFG.langKey, lang || "original"); } catch (e) {}
    if (!lang || lang === "original") clearGoogTransCookie();
    else setGoogTransCookie(CFG.fromLang, lang);
    // 若本頁已初始化過 TranslateElement，立即套用
    forceApplyLangByCombo();
  };

  // element.js callback（必須是全域）
  w.googleTranslateElementInit = function () {
    // eslint-disable-next-line no-undef
    new google.translate.TranslateElement({
      pageLanguage: CFG.fromLang,
      includedLanguages: CFG.included,
      autoDisplay: false
    }, "google_translate_element");

    forceApplyLangByCombo();
  };

  // 在 element.js 載入前先把 cookie 套好
  applyCookieFirst();

  w.addEventListener("load", function () {
    applyCookieFirst();
    forceApplyLangByCombo();
  });

  w.addEventListener("pageshow", function (evt) {
    applyAgain(evt);
  });

  d.addEventListener("visibilitychange", function () {
    if (!d.hidden) applyAgain(null);
  });

})(window, document);
