const fs = require('fs');
const f = 'C:\\Users\\ibrah\\OneDrive\\Desktop\\HFW 4.93\\index-CFeH5TgX.js';
let c = fs.readFileSync(f, 'utf8');

// Replace the GA component to add avatar with gold frame
// Find the connected state in GA component and add avatar display
// The connected state starts with: o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)"

const connectedOld = 'o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["مباشر — @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"قطع الاتصال"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"بيانات التكبيس محفوظة لرابط OBS حتى بعد قطع الاتصال — تُصفَّر تلقائياً عند بدء بث جديد"})})]})';

const connectedNew = 'o?a.jsxs("div",{className:"rounded-xl overflow-hidden",style:{background:"rgba(195,255,100,0.06)",border:"1px solid rgba(195,255,100,0.2)"},children:[a.jsxs("div",{className:"px-4 pt-4 pb-3",children:[a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsxs("div",{className:"avatar-gold-container connected",children:[a.jsx("div",{className:"avatar-gold-glow"}),a.jsx("div",{className:"avatar-gold-frame"}),a.jsx("div",{className:"avatar-gold-sweep"}),a.jsx("img",{src:window._tikProfileAvatar?"/api/tiktok/avatar-proxy?url="+encodeURIComponent(window._tikProfileAvatar):"https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200",alt:f,className:"avatar-gold-img",onError:function(e){e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(window._tikProfileDisplayName||f)+"&background=E02519&color=fff&size=200"}}),a.jsx("div",{className:"avatar-gold-status online"})]}),a.jsxs("div",{className:"avatar-info",children:[a.jsx("div",{className:"avatar-info-name",children:window._tikProfileDisplayName||f}),a.jsx("div",{className:"avatar-info-username",children:"@"+f}),a.jsx("div",{className:"avatar-info-status s-connected",children:"● Connected"})]})]})]}),a.jsxs("div",{className:"flex items-center justify-between px-4 py-3",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[a.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3FF64] opacity-75"}),a.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C3FF64]"})]}),a.jsxs("span",{className:"text-sm font-bold text-white",children:["مباشر — @",f]})]}),a.jsx("button",{type:"button",onClick:x,className:"text-xs text-white/40 hover:text-white transition-colors",children:"قطع الاتصال"})]}),m&&a.jsxs("div",{className:"px-4 pb-3 text-xs text-white/40 flex items-center gap-1.5",children:[a.jsx(By,{size:13}),m]}),a.jsx("div",{className:"px-4 pb-3 border-t border-white/5 pt-2.5",children:a.jsx("span",{className:"text-xs text-white/30",children:"بيانات التكبيس محفوظة لرابط OBS حتى بعد قطع الاتصال — تُصفَّر تلقائياً عند بدء بث جديد"})})]})';

if (c.includes(connectedOld)) {
  c = c.replace(connectedOld, connectedNew);
  console.log('Replaced connected state in GA component');
} else {
  console.log('WARNING: Could not find connected state in GA component');
}

// Now replace the form (disconnected state) to add avatar preview when username is entered
const formOld = 'a.jsx("form",{onSubmit:p,children:a.jsxs("div",{className:"flex items-center gap-2",dir:"ltr",children:[a.jsx("input",{type:"text",placeholder:"\u0623\u062F\u062E\u0644 username \u0627\u0644\u062A\u064A\u0643 \u062A\u0648\u0643",value:e,onChange:b=>n(b.target.value),className:"flex-1 min-w-0 rounded-xl px-3 py-2.5 text-white text-sm outline-none",style:{background:"rgba(78,205,196,0.045)",border:"1px solid rgba(78,205,196,0.24)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.035)"},dir:"ltr"}),';

const formNew = 'a.jsx("form",{onSubmit:p,children:a.jsxs("div",{className:"flex flex-col gap-3",children:[e.trim()?a.jsxs("div",{className:"flex items-center gap-3 px-3 py-2 rounded-xl",style:{background:"rgba(78,205,196,0.03)",border:"1px solid rgba(78,205,196,0.12)"},children:[a.jsxs("div",{className:"avatar-gold-container"+(l?" connecting":""),children:[a.jsx("div",{className:"avatar-gold-glow"}),a.jsx("div",{className:"avatar-gold-frame"}),a.jsx("div",{className:"avatar-gold-sweep"}),a.jsx("img",{src:window._tikPreviewAvatar?"/api/tiktok/avatar-proxy?url="+encodeURIComponent(window._tikPreviewAvatar):"https://ui-avatars.com/api/?name="+encodeURIComponent(e.replace(/^@/,"").trim())+"&background=E02519&color=fff&size=200",alt:e,className:"avatar-gold-img",onError:function(er){er.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(e.replace(/^@/,"").trim())+"&background=E02519&color=fff&size=200"}}),l?a.jsx("div",{className:"avatar-gold-status connecting-status"}):a.jsx("div",{className:"avatar-gold-status offline"})]}),a.jsxs("div",{className:"avatar-info",children:[a.jsx("div",{className:"avatar-info-name",children:window._tikPreviewDisplayName||e.replace(/^@/,"").trim()}),a.jsx("div",{className:"avatar-info-username",children:"@"+e.replace(/^@/,"").trim()}),a.jsx("div",{className:"avatar-info-status s-disconnected",children:l?"Connecting...":"Ready to connect"})]})]}):null,a.jsxs("div",{className:"flex items-center gap-2",dir:"ltr",children:[a.jsx("input",{type:"text",placeholder:"\u0623\u062F\u062E\u0644 username \u0627\u0644\u062A\u064A\u0643 \u062A\u0648\u0643",value:e,onChange:b=>n(b.target.value),className:"flex-1 min-w-0 rounded-xl px-3 py-2.5 text-white text-sm outline-none",style:{background:"rgba(78,205,196,0.045)",border:"1px solid rgba(78,205,196,0.24)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.035)"},dir:"ltr",onInput:function(ev){var u=ev.target.value.replace(/^@/,"").trim();if(u.length>1){window._tikPreviewAvatar="";window._tikPreviewDisplayName="";fetch("/api/tiktok/user/"+u).then(function(r){return r.json()}).then(function(d){if(d){var av=d.avatarThumb||d.profilePictureUrl||d.profilePicture||d.avatarLarge||d.avatarMedium||(typeof d.avatarThumb==="object"&&d.avatarThumb&&d.avatarThumb.urlList&&d.avatarThumb.urlList[0])||"";if(av)window._tikPreviewAvatar=av;if(d.nickname)window._tikPreviewDisplayName=d.nickname;else if(d.uniqueId)window._tikPreviewDisplayName=d.uniqueId}}).catch(function(){})}}),';

if (c.includes(formOld)) {
  c = c.replace(formOld, formNew);
  console.log('Replaced form state in GA component');
} else {
  console.log('WARNING: Could not find form state in GA component');
}

// Now modify the Ka (handleConnect) function to capture avatar from response
const connectSuccessOld = 'f(Re),w(!0),localStorage.setItem("tiktok_username",Re),b(null);console.log("[Connect] SUCCESS @"+Re)';
const connectSuccessNew = 'if(u.avatarUrl)window._tikProfileAvatar=u.avatarUrl;if(u.displayName)window._tikProfileDisplayName=u.displayName;f(Re),w(!0),localStorage.setItem("tiktok_username",Re);localStorage.setItem("tiktok_avatar",u.avatarUrl||"");localStorage.setItem("tiktok_displayName",u.displayName||Re);b(null);console.log("[Connect] SUCCESS @"+Re,"avatar:",u.avatarUrl?"yes":"no","name:",u.displayName)';

if (c.includes(connectSuccessOld)) {
  c = c.replace(connectSuccessOld, connectSuccessNew);
  console.log('Modified connect success handler');
} else {
  console.log('WARNING: Could not find connect success handler');
}

// Add profile loading on page load (for auto-reconnect)
const autoConnectOld = 'localStorage.getItem("tiktok_username")';
if (c.includes(autoConnectOld)) {
  // Add profile loading after localStorage check
  const loadProfile = 'window._tikProfileAvatar=localStorage.getItem("tiktok_avatar")||"";window._tikProfileDisplayName=localStorage.getItem("tiktok_displayName")||"";' + autoConnectOld;
  c = c.replace(autoConnectOld, loadProfile);
  console.log('Added profile loading on page load');
}

fs.writeFileSync(f, c);
console.log('Done. File size:', fs.statSync(f).size);
