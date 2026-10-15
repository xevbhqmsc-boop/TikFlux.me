const fs = require('fs');
const f = 'C:\\Users\\ibrah\\OneDrive\\Desktop\\HFW 4.93\\index-CFeH5TgX.js';
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// 1. Replace connected state — add avatar with gold frame
const connectedOld = `o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["\u0645\u0628\u0627\u0634\u0631 \u2014 @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0643\u0628\u064A\u0633 \u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0631\u0627\u0628\u0637 OBS \u062D\u062A\u0649 \u0628\u0639\u062F \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u2014 \u062A\u064F\u0635\u0641\u0651\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0628\u062F\u0621 \u0628\u062B\u064A \u062C\u062F\u064A\u062F"})})]})`;

const connectedNew = `o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"px-4 pt-4 pb-3",children:[a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsxs("div",{className:"avatar-gold-container connected",children:[a.jsx("div",{className:"avatar-gold-glow"}),a.jsx("div",{className:"avatar-gold-frame"}),a.jsx("div",{className:"avatar-gold-sweep"}),a.jsx("img",{src:window._tikProfileAvatar?"/api/tiktok/avatar-proxy?url="+encodeURIComponent(window._tikProfileAvatar):"https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200",alt:f,className:"avatar-gold-img",onError:function(e){e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200"}}),a.jsx("div",{className:"avatar-gold-status online"})]}),a.jsxs("div",{className:"avatar-info",children:[a.jsx("div",{className:"avatar-info-name",children:window._tikProfileDisplayName||f}),a.jsx("div",{className:"avatar-info-username",children:"@"+f}),a.jsx("div",{className:"avatar-info-status s-connected",children:"\u25CF Connected"})]})]})]}),a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["\u0645\u0628\u0627\u0634\u0631 \u2014 @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0643\u0628\u064A\u0633 \u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0631\u0627\u0628\u0637 OBS \u062D\u062A\u0649 \u0628\u0639\u062F \u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u2014 \u062A\u064F\u0635\u0641\u0651\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0628\u062F\u0621 \u0628\u062B\u064A \u062C\u062F\u064A\u062F"})})]})`;

if (c.includes(connectedOld)) {
  c = c.replace(connectedOld, connectedNew);
  changes++;
  console.log('1. OK: Connected state -> avatar gold frame');
} else {
  console.log('1. FAIL: Connected state not found');
}

// 2. Patch connect success handler to save profile data
const connectOld = `f(Re),w(!0),b(null)}catch{b("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0634\u0628\u0643\u0629 \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644")}finally{x(!1)}}`;
const connectNew = `if(u.avatarUrl)window._tikProfileAvatar=u.avatarUrl;if(u.displayName)window._tikProfileDisplayName=u.displayName;f(Re),w(!0);try{localStorage.setItem("tiktok_avatar",u.avatarUrl||"");localStorage.setItem("tiktok_displayName",u.displayName||Re)}catch(e){}b(null)}catch{b("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0634\u0628\u0643\u0629 \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644")}finally{x(!1)}}`;

if (c.includes(connectOld)) {
  c = c.replace(connectOld, connectNew);
  changes++;
  console.log('2. OK: Connect success handler patched');
} else {
  console.log('2. FAIL: Connect success handler not found');
}

// 3. Add avatar preview + onInput fetch to the disconnect form area (when NOT connected)
// Find the form input area and add onInput handler for profile preview
const formInputOld = `placeholder:"\u0623\u062F\u062E\u0644 username \u0627\u0644\u062A\u064A\u0643 \u062A\u0648\u0643",value:e,onChange:b=>n(b.target.value),className:"flex-1 min-w-0 rounded-xl px-3 py-2.5 text-white text-sm outline-none",style:{background:"rgba(78,205,196,0.045)",border:"1px solid rgba(78,205,196,0.24)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.035)"},dir:"ltr"}`;
const formInputNew = `placeholder:"\u0623\u062F\u062E\u0644 username \u0627\u0644\u062A\u064A\u0643 \u062A\u0648\u0643",value:e,onChange:b=>n(b.target.value),className:"flex-1 min-w-0 rounded-xl px-3 py-2.5 text-white text-sm outline-none",style:{background:"rgba(78,205,196,0.045)",border:"1px solid rgba(78,205,196,0.24)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.035)"},dir:"ltr",onInput:function(ev){var u=ev.target.value.replace(/^@/,"").trim();if(u.length>1){window._tikPreviewAvatar="";window._tikPreviewDisplayName="";fetch("/api/tiktok/user/"+u).then(function(r){return r.json()}).then(function(d){if(d){var av=d.avatarThumb||d.profilePictureUrl||d.profilePicture||d.avatarLarge||d.avatarMedium||(typeof d.avatarThumb==="object"&&d.avatarThumb&&d.avatarThumb.urlList&&d.avatarThumb.urlList[0])||"";if(av)window._tikPreviewAvatar=av;if(d.nickname)window._tikProfileDisplayName=d.nickname;else if(d.uniqueId)window._tikProfileDisplayName=d.uniqueId}}).catch(function(){})}}`;

if (c.includes(formInputOld)) {
  c = c.replace(formInputOld, formInputNew);
  changes++;
  console.log('3. OK: Form input patched with avatar preview fetch');
} else {
  console.log('3. FAIL: Form input not found');
}

// 4. Wrap the disconnect form in a div with avatar preview
// Add avatar display before the input form when username is typed
const formDivOld = `a.jsxs("div",{className:"flex items-center gap-2",dir:"ltr",children:[a.jsx("input",{type:"text",placeholder`;
if (c.includes(formDivOld)) {
  const idx = c.indexOf(formDivOld);
  const before = c.substring(Math.max(0, idx - 100), idx);
  console.log('4. Context before form:', before.substring(before.length - 80));
}

fs.writeFileSync(f, c, 'utf8');
console.log('\nTotal changes:', changes);
console.log('File size:', fs.statSync(f).size, 'bytes');
