/* site_ui.js — 回主頁按鈕定位到框側邊中間 + 自動慢捲/滾輪雙模式 + 日文文案切換 */
(function(w,d){
  "use strict";

  function getLang(){
    try{ return w.localStorage.getItem("site_lang") || "original"; }catch(e){ return "original"; }
  }

  function ensureHomeButton(){
    var p = (location.pathname || "").toLowerCase();
    if (p.endsWith("/main.htm") || p.endsWith("main.htm")) return;

    if (d.getElementById("siteHomeBtn")) return;

    var a = d.createElement("a");
    a.id = "siteHomeBtn";
    a.className = "site-home-btn";
    a.href = "main.htm";
    a.innerHTML = '<span class="dot"></span><span>回主頁</span>';
    d.body.appendChild(a);
  }

  /* 讓回主頁按鈕「貼在框的側邊中間」 */
  function positionHomeButtonToCard(){
    var btn = d.getElementById("siteHomeBtn");
    if(!btn) return;

    var card = d.querySelector(".profile-card");
    if(!card){
      // 非 profile 頁：維持左側中間
      btn.style.left = "14px";
      btn.style.top = "50%";
      btn.style.transform = "translateY(-50%)";
      return;
    }

    var r = card.getBoundingClientRect();
    var btnW = btn.offsetWidth || 110;
    var gap = 12;

    // 計算：貼在 card 左側外面，垂直置中
    var left = r.left - btnW - gap;
    var top  = r.top + (r.height / 2);

    // 邊界保護：不要跑出視窗
    if(left < 10) left = 10; // 太靠左就貼在視窗邊
    var minTop = 60;
    var maxTop = w.innerHeight - 60;
    if(top < minTop) top = minTop;
    if(top > maxTop) top = maxTop;

    btn.style.left = Math.round(left) + "px";
    btn.style.top  = Math.round(top) + "px";
    btn.style.transform = "translateY(-50%)";
  }

  function initAutoScrollBox(boxId, opts){
    var el = d.getElementById(boxId);
    if(!el) return;

    opts = opts || {};
    var pxPerFrame = (typeof opts.pxPerFrame === "number") ? opts.pxPerFrame : 0.35;
    var idleResumeMs = (typeof opts.idleResumeMs === "number") ? opts.idleResumeMs : 1600;

    var raf = null;
    var paused = false;
    var idleTimer = null;
    var hoverPause = false;

    function stop(){
      paused = true;
      if(raf){ cancelAnimationFrame(raf); raf = null; }
    }
    function start(){
      if(hoverPause) return;
      if(!paused) return;
      paused = false;
      tick();
    }
    function tick(){
      if(paused || hoverPause) return;

      var atBottom = (el.scrollTop + el.clientHeight) >= (el.scrollHeight - 2);
      if(atBottom){
        paused = true;
        setTimeout(function(){
          el.scrollTop = 0;
          paused = false;
          tick();
        }, 1000);
        return;
      }

      el.scrollTop += pxPerFrame;
      raf = requestAnimationFrame(tick);
    }
    function pauseThenResume(){
      stop();
      if(idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function(){
        start();
      }, idleResumeMs);
    }

    el.addEventListener("wheel", function(){ pauseThenResume(); }, {passive:true});
    el.addEventListener("scroll", function(){ pauseThenResume(); }, {passive:true});
    el.addEventListener("touchstart", function(){ pauseThenResume(); }, {passive:true});
    el.addEventListener("touchmove", function(){ pauseThenResume(); }, {passive:true});

    el.addEventListener("mouseenter", function(){ hoverPause = true; stop(); });
    el.addEventListener("mouseleave", function(){ hoverPause = false; pauseThenResume(); });

    setTimeout(function(){ paused = true; start(); }, 900);
  }

  function applyProfileJapaneseCopy(){
    var lang = getLang();
    var cn = d.getElementById("profile_cn");
    var ja = d.getElementById("profile_ja");
    if(!cn || !ja) return;

    if(lang === "ja"){
      cn.style.display = "none";
      ja.style.display = "block";
    }else{
      ja.style.display = "none";
      cn.style.display = "block";
    }
  }

  function onReady(fn){
    if(d.readyState === "complete" || d.readyState === "interactive") fn();
    else d.addEventListener("DOMContentLoaded", fn);
  }

  function bindReposition(){
    // 捲動/縮放/返回都重算位置（卡片位置會變）
    w.addEventListener("resize", function(){ positionHomeButtonToCard(); });
    w.addEventListener("scroll", function(){ positionHomeButtonToCard(); }, {passive:true});
    w.addEventListener("pageshow", function(){ positionHomeButtonToCard(); });
    d.addEventListener("visibilitychange", function(){
      if(!d.hidden) positionHomeButtonToCard();
    });
  }

  onReady(function(){
    ensureHomeButton();
    applyProfileJapaneseCopy();
    initAutoScrollBox("companyScrollBox");

    // 首次定位（延遲一下，等字型/翻譯 banner 影響布局完成）
    setTimeout(positionHomeButtonToCard, 200);
    setTimeout(positionHomeButtonToCard, 800);

    bindReposition();
  });

})(window, document);
