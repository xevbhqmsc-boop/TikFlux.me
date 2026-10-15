const fs = require('fs');
const f = 'C:\\Users\\ibrah\\OneDrive\\Desktop\\HFW 4.93\\index-CFeH5TgX.js';
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// === PATCH 1: Connected state -> avatar gold frame ===
const connMarker = 'rounded-xl overflow-hidden';
const connIdx = c.indexOf(connMarker);
if (connIdx === -1) { console.log('1. FAIL: no rounded-xl overflow-hidden'); }
else {
  let blockStart = connIdx;
  while (blockStart > 0 && !(c.substring(blockStart - 2, blockStart) === 'o?')) blockStart--;
  blockStart -= 2;

  const elseIdx = c.indexOf(':a.jsx("form",{onSubmit:p', connIdx);
  const blockEnd = elseIdx;

  const oldBlock = c.substring(blockStart, blockEnd);
  
  const liveTextMatch = oldBlock.match(/children:\["([\u0645\u0628\u0627\u0634\u0631 \u2014]+) @"/);
  const liveText = liveTextMatch ? liveTextMatch[1] : '\u0645\u0628\u0627\u0634\u0631 \u2014';
  
  const cutTextMatch = oldBlock.match(/children:"([\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644]+)"/);
  const cutText = cutTextMatch ? cutTextMatch[1] : '\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644';
  
  const savedTextMatch = oldBlock.match(/children:"([\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0643\u0628\u064A\u0633 \u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0631\u0627\u0628\u0637 OBS \u062D\u062A\u0649 \u0628\u0639\u062F \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u2014 \u062A\u064F\u0635\u0641\u0651\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0628\u062F\u0621 \u0628\u062B\u064A \u062C\u062F\u064A\u062F]+)"/);
  const savedText = savedTextMatch ? savedTextMatch[1] : '';

  // Build replacement WITHOUT template literals - use string concatenation
  var newBlock = 'o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"px-4 pt-4 pb-3",children:[a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsxs("div",{className:"avatar-gold-container connected",children:[a.jsx("div",{className:"avatar-gold-glow"}),a.jsx("div",{className:"avatar-gold-frame"}),a.jsx("div",{className:"avatar-gold-sweep"}),a.jsx("img",{src:window._tikProfileAvatar?"/api/tiktok/avatar-proxy?url="+encodeURIComponent(window._tikProfileAvatar):"https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200",alt:f,className:"avatar-gold-img",onError:function(e){e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200"}}),a.jsx("div",{className:"avatar-gold-status online"})]}),a.jsxs("div",{className:"avatar-info",children:[a.jsx("div",{className:"avatar-info-name",children:window._tikProfileDisplayName||f}),a.jsx("div",{className:"avatar-info-username",children:"@"+f}),a.jsx("div",{className:"avatar-info-status s-connected",children:"\u25CF Connected"})]})]})]}),a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["' + liveText + ' \\u2014 @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"' + cutText + '"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"' + savedText + '"})})]})}';

  c = c.substring(0, blockStart) + newBlock + c.substring(blockEnd);
  changes++;
  console.log('1. OK: Connected state -> avatar gold frame');
}

// === PATCH 2: Connect success handler -> capture avatar/displayName ===
const connectMarker = 'f(Re),w(!0),b(null)}catch{';
const connectIdx = c.indexOf(connectMarker);
if (connectIdx === -1) {
  console.log('2. FAIL: Connect success handler not found');
} else {
  var replacement = 'if(u.avatarUrl)window._tikProfileAvatar=u.avatarUrl;if(u.displayName)window._tikProfileDisplayName=u.displayName;f(Re),w(!0);try{localStorage.setItem("tiktok_avatar",u.avatarUrl||"");localStorage.setItem("tiktok_displayName",u.displayName||Re)}catch(e){}b(null)}catch{';
  c = c.substring(0, connectIdx) + replacement + c.substring(connectIdx + connectMarker.length);
  changes++;
  console.log('2. OK: Connect success handler patched');
}

// === PATCH 3: Internet overlay (append at end) ===
var internetOverlay = [
  '',
  ';(function(){',
  '  if(!window.electronAPI||!window.electronAPI.isElectron)return;',
  '  var overlay=document.createElement("div");',
  '  overlay.id="offline-overlay";',
  '  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(8,14,16,0.97);z-index:99999;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:Cairo,sans-serif;color:#fff;";',
  '  overlay.innerHTML="<div style=text-align:center><div style=font-size:64px;margin-bottom:24px;color:#E02519>&#x26A0;</div><h2 style=font-size:28px;margin-bottom:8px>No Internet Connection</h2><p style=color:#888;font-size:16px>\\u064A\\u0631\\u062C\\u0649 \\u0627\\u0644\\u062A\\u062D\\u0642\\u0642 \\u0645\\u0646 \\u0627\\u062A\\u0635\\u0627\\u0644\\u0643 \\u0628\\u0627\\u0644\\u0625\\u0646\\u062A\\u0631\\u0646\\u062A</p><div style=margin-top:24px;width:48px;height:4px;border-radius:2px;background:#E02519;animation:pc1 1.5s ease-in-out infinite></div></div>";',
  '  document.body.appendChild(overlay);',
  '  var style=document.createElement("style");',
  '  style.textContent="@keyframes pc1{0%,100%{opacity:.3;width:48px}50%{opacity:1;width:80px}}";',
  '  document.head.appendChild(style);',
  '  if(window.tiklinuxDesktop){',
  '    window.tiklinuxDesktop.onInternetStatus(function(online){',
  '      overlay.style.display=online?"none":"flex";',
  '    });',
  '    window.tiklinuxDesktop.checkInternet().then(function(online){',
  '      if(!online)overlay.style.display="flex";',
  '    });',
  '  }',
  '})();',
  ''
].join('\n');
c = c + internetOverlay;
changes++;
console.log('3. OK: Internet overlay appended');

fs.writeFileSync(f, c, 'utf8');
console.log('\nTotal changes:', changes);
console.log('File size:', fs.statSync(f).size, 'bytes');
