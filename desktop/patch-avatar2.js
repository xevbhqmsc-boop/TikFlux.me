const fs = require('fs');
const f = 'C:\\Users\\ibrah\\OneDrive\\Desktop\\HFW 4.93\\index-CFeH5TgX.js';
let c = fs.readFileSync(f, 'utf8');

// 1. Replace connected state in GA to show avatar with gold frame
const connectedOld = 'o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["\u0645\u0628\u0627\u0634\u10A0 \u2014 @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0643\u0628\u064A\u0633 \u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0631\u0627\u0628\u0637 OBS \u062D\u062A\u0649 \u0628\u0639\u062F \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u2014 \u062A\u064F\u0635\u0641\u0651\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0628\u062F\u0621 \u0628\u062B\u064A \u062C\u062F\u064A\u062F"})})]})';

const connectedNew = 'o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"px-4 pt-4 pb-3",children:[a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsxs("div",{className:"avatar-gold-container connected",children:[a.jsx("div",{className:"avatar-gold-glow"}),a.jsx("div",{className:"avatar-gold-frame"}),a.jsx("div",{className:"avatar-gold-sweep"}),a.jsx("img",{src:window._tikProfileAvatar?"/api/tiktok/avatar-proxy?url="+encodeURIComponent(window._tikProfileAvatar):"https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200",alt:f,className:"avatar-gold-img",onError:function(e){e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200"}}),a.jsx("div",{className:"avatar-gold-status online"})]}),a.jsxs("div",{className:"avatar-info",children:[a.jsx("div",{className:"avatar-info-name",children:window._tikProfileDisplayName||f}),a.jsx("div",{className:"avatar-info-username",children:"@"+f}),a.jsx("div",{className:"avatar-info-status s-connected",children:"\u25CF Connected"})]})]})]}),a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["\u0645\u0628\u0627\u0634\u10A0 \u2014 @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0643\u0628\u064A\u0633 \u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0631\u0627\u0628\u0637 OBS \u062D\u062A\u0649 \u0628\u0639\u062F \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u2014 \u062A\u064F\u0635\u0641\u0651\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0628\u062F\u0621 \u0628\u062B\u064A \u062C\u062F\u064A\u062F"})})]})';

if (c.includes(connectedOld)) {
  c = c.replace(connectedOld, connectedNew);
  console.log('OK: Replaced connected state');
} else {
  console.log('FAIL: Could not find connected state');
}

// 2. Modify connect success handler to capture profile data
const connectSuccessOld = 'f(Re),w(!0),localStorage.setItem("tiktok_username",Re),b(null);console.log("[Connect] SUCCESS @"+Re)';
const connectSuccessNew = 'if(u.avatarUrl)window._tikProfileAvatar=u.avatarUrl;if(u.displayName)window._tikProfileDisplayName=u.displayName;f(Re),w(!0),localStorage.setItem("tiktok_username",Re);localStorage.setItem("tiktok_avatar",u.avatarUrl||"");localStorage.setItem("tiktok_displayName",u.displayName||Re);b(null);console.log("[Connect] SUCCESS @"+Re,"avatar:",u.avatarUrl?"yes":"no","name:",u.displayName)';

if (c.includes(connectSuccessOld)) {
  c = c.replace(connectSuccessOld, connectSuccessNew);
  console.log('OK: Modified connect success handler');
} else {
  console.log('FAIL: Could not find connect success handler');
}

fs.writeFileSync(f, c);
console.log('Done. File size:', fs.statSync(f).size);
