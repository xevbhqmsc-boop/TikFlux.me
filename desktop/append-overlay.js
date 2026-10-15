const fs = require('fs');
const f = 'C:\\Users\\ibrah\\OneDrive\\Desktop\\HFW 4.93\\index-CFeH5TgX.js';
const content = fs.readFileSync(f, 'utf8');

const internetOverlay = `
;(function(){
  if(!window.electronAPI||!window.electronAPI.isElectron)return;
  var overlay=document.createElement('div');
  overlay.id='offline-overlay';
  overlay.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(8,14,16,0.97);z-index:99999;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:Cairo,sans-serif;color:#fff;';
  overlay.innerHTML='<div style=text-align:center><div style=font-size:64px;margin-bottom:24px;color:#E02519>&#x26A0;</div><h2 style=font-size:28px;margin-bottom:8px>No Internet Connection</h2><p style=color:#888;font-size:16px>\\u064A\\u0631\\u062C\\u0649 \\u0627\\u0644\\u062A\\u062D\\u0642\\u0642 \\u0645\\u0646 \\u0627\\u062A\\u0635\\u0627\\u0644\\u0643 \\u0628\\u0627\\u0644\\u0625\\u0646\\u062A\\u0631\\u0646\\u062A</p><div style=margin-top:24px;width:48px;height:4px;border-radius:2px;background:#E02519;animation:pc1 1.5s ease-in-out infinite></div></div>';
  document.body.appendChild(overlay);
  var style=document.createElement('style');
  style.textContent='@keyframes pc1{0%,100%{opacity:.3;width:48px}50%{opacity:1;width:80px}}';
  document.head.appendChild(style);
  if(window.tiklinuxDesktop){
    window.tiklinuxDesktop.onInternetStatus(function(online){
      overlay.style.display=online?'none':'flex';
    });
    window.tiklinuxDesktop.checkInternet().then(function(online){
      if(!online)overlay.style.display='flex';
    });
  }
})();
`;

fs.writeFileSync(f, content + internetOverlay);
console.log('Appended internet overlay, new size:', fs.statSync(f).size);
