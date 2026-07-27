(function(){
'use strict';
const P='#059669',PD='#047857',T='#1c1917',T2='#57534e',W='#ffffff',G1='#f5f5f4',G2='#e7e5e4';
function ic(p,s=18,c='currentColor'){return`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`}

function hero(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene illu-scene--hero">
<div class="illu-bg-gradient"></div><div class="illu-bg-grid"></div>
<div class="illu-glow illu-glow--lg illu-glow--top-right"></div>
<div class="illu-glow illu-glow--sm illu-glow--bottom-left"></div>
<div class="illu-obj illu-obj--bag"></div><div class="illu-obj illu-obj--box"></div>
<div class="illu-obj illu-obj--heart"></div>
<div class="illu-obj illu-obj--star" style="width:24px;height:24px;top:20%;right:8%"></div>
<div class="illu-phone">
<div class="illu-phone__notch"></div>
<div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">UniMartX</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div class="illu-ui-row">
<div class="illu-ui-block illu-ui-block--tall" style="flex:1">
<div class="illu-ui-block__img" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0)"></div>
<div class="illu-ui-block__text"><div class="illu-ui-skel illu-ui-skel--sm"></div><div class="illu-ui-skel illu-ui-skel--md"></div><span class="illu-ui-chip">Electronics</span></div>
</div>
<div class="illu-ui-col">
<div class="illu-ui-block illu-ui-block--wide"><div class="illu-ui-block__img" style="background:linear-gradient(135deg,#fef3c7,#fde68a)"></div><div class="illu-ui-block__text"><div class="illu-ui-skel illu-ui-skel--sm"></div></div></div>
<div class="illu-ui-block illu-ui-block--short"><div class="illu-ui-block__text" style="justify-content:center"><div class="illu-ui-skel illu-ui-skel--md"></div></div></div>
</div>
</div>
<div class="illu-ui-row">
<div class="illu-ui-block illu-ui-block--wide" style="flex:1.2"><div class="illu-ui-block__img" style="background:linear-gradient(135deg,#e0e7ff,#c7d2fe)"></div><div class="illu-ui-block__text"><div class="illu-ui-skel illu-ui-skel--sm"></div><div class="illu-ui-skel illu-ui-skel--md"></div></div></div>
<div class="illu-ui-block illu-ui-block--wide" style="flex:1"><div class="illu-ui-block__img" style="background:linear-gradient(135deg,#fce7f3,#fbcfe8)"></div><div class="illu-ui-block__text"><div class="illu-ui-skel illu-ui-skel--sm"></div></div></div>
</div>
</div>
<div class="illu-ui-nav"><div class="illu-ui-nav__item illu-ui-nav__item--active"></div><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item"></div></div>
</div>
</div>
<div class="illu-float illu-float--order" style="--rot:4deg"><div class="illu-float__icon">${ic('M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z')}</div><div class="illu-float__text"><span class="illu-float__label">New Order</span><span class="illu-float__value illu-float__value--green">GH₵ 245</span></div></div>
<div class="illu-float illu-float--stats" style="--rot:-3deg"><div class="illu-float__icon">${ic('M12 20V10 M18 20V4 M6 20v-4')}</div><div class="illu-float__text"><span class="illu-float__label">This Week</span><span class="illu-float__value">+28%</span></div></div>
<div class="illu-float illu-float--store" style="--rot:3deg"><div class="illu-float__icon">${ic('M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10')}</div><div class="illu-float__text"><span class="illu-float__label">Store Views</span><span class="illu-float__value">1,240</span></div></div>
<div class="illu-float illu-float--review" style="--rot:-4deg"><div class="illu-float__icon">${ic('M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')}</div><div class="illu-float__text"><span class="illu-float__label">Rating</span><span class="illu-float__value illu-float__value--green">4.9</span></div></div>
<div class="illu-float illu-float--badge" style="--rot:-5deg"><div class="illu-float__icon">${ic('M9 12l2 2 4-4 M21 12c-1 0-3-4-3-7s2-7 3-7 3 4 3 7-2 7-3 7-3-4-3-7z')}</div><div class="illu-float__text"><span class="illu-float__label">Verified</span><span class="illu-float__value">Seller</span></div></div>
</div>`;
}

function store(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-dots"></div><div class="illu-glow illu-glow--lg illu-glow--center"></div>
<div class="illu-obj illu-obj--star" style="width:28px;height:28px;top:10%;left:10%"></div>
<div class="illu-obj illu-obj--coin" style="bottom:22%;left:6%"></div>
<div class="illu-obj illu-obj--pin" style="top:18%;right:10%"></div>
<div class="illu-phone"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Create Store</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div class="illu-ui-block illu-ui-block--wide" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);display:flex;align-items:center;justify-content:center"><div style="width:56px;height:56px;border-radius:14px;background:rgba(5,150,105,0.12);border:2px dashed rgba(5,150,105,0.3);display:flex;align-items:center;justify-content:center;color:${P};font-size:24px;font-weight:800">+</div></div>
<div class="illu-ui-skel illu-ui-skel--lg" style="margin-top:4px"></div><div class="illu-ui-skel illu-ui-skel--md"></div>
<div style="background:${P};color:#fff;text-align:center;padding:10px;border-radius:8px;font-size:0.7rem;font-weight:700;font-family:'Quicksand',sans-serif">Launch Store</div>
</div></div></div>
<div class="illu-float" style="top:10%;left:-30px;--rot:-4deg;animation:illuFloat 5s ease-in-out infinite"><div class="illu-float__icon">${ic('M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10')}</div><div class="illu-float__text"><span class="illu-float__label">Store Created</span><span class="illu-float__value illu-float__value--green">Active</span></div></div>
<div class="illu-float" style="bottom:15%;right:-30px;--rot:3deg;animation:illuFloat 5.5s ease-in-out 0.5s infinite"><div class="illu-float__icon">${ic('M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z')}</div><div class="illu-float__text"><span class="illu-float__label">Success</span><span class="illu-float__value illu-float__value--green">Ready!</span></div></div>
</div>`;
}

function sell(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-grid"></div><div class="illu-glow illu-glow--sm illu-glow--top-right"></div>
<div class="illu-obj illu-obj--bag" style="top:12%;right:8%"></div><div class="illu-obj illu-obj--box" style="bottom:16%;left:4%"></div>
<div class="illu-phone"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Add Product</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div class="illu-ui-block illu-ui-block--wide" style="height:80px;background:linear-gradient(135deg,${G1},${G2});display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${T2}" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></div>
<div class="illu-ui-skel illu-ui-skel--lg"></div><div class="illu-ui-skel illu-ui-skel--md"></div><div class="illu-ui-skel illu-ui-skel--sm"></div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><span class="illu-ui-chip">Name</span><span class="illu-ui-chip">Price</span><span class="illu-ui-chip">Category</span></div>
</div></div></div>
<div class="illu-float" style="top:8%;right:-35px;--rot:4deg;animation:illuFloat 5s ease-in-out infinite"><div class="illu-float__icon">${ic('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z')}</div><div class="illu-float__text"><span class="illu-float__label">Image</span><span class="illu-float__value">Uploaded</span></div></div>
<div class="illu-float" style="bottom:12%;left:-35px;--rot:-3deg;animation:illuFloat 6s ease-in-out 1s infinite"><div class="illu-float__icon">${ic('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z')}</div><div class="illu-float__text"><span class="illu-float__label">Price</span><span class="illu-float__value illu-float__value--green">GH₵ 49</span></div></div>
</div>`;
}

function orders(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-grid"></div><div class="illu-glow illu-glow--lg illu-glow--bottom-left"></div>
<div class="illu-obj illu-obj--box" style="top:14%;right:10%;width:50px;height:50px"></div><div class="illu-obj illu-obj--pin" style="bottom:18%;right:6%"></div>
<div class="illu-phone" style="transform:rotate(3deg)"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Orders</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div class="illu-ui-block illu-ui-block--med" style="display:flex;align-items:center;gap:8px;padding:8px 12px"><div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);flex-shrink:0"></div><div style="flex:1"><div class="illu-ui-skel illu-ui-skel--md"></div><div class="illu-ui-skel illu-ui-skel--sm"></div></div><div style="color:${P};font-size:0.65rem;font-weight:700;font-family:'Poppins',sans-serif">#1024</div></div>
<div class="illu-ui-block illu-ui-block--med" style="display:flex;align-items:center;gap:8px;padding:8px 12px"><div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);flex-shrink:0"></div><div style="flex:1"><div class="illu-ui-skel illu-ui-skel--md"></div><div class="illu-ui-skel illu-ui-skel--sm"></div></div><div style="color:${P};font-size:0.65rem;font-weight:700;font-family:'Poppins',sans-serif">#1023</div></div>
<div class="illu-ui-block illu-ui-block--tall" style="padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between"><div style="display:flex;justify-content:space-between;align-items:center"><div class="illu-ui-skel illu-ui-skel--md"></div><span style="font-size:0.6rem;padding:2px 8px;border-radius:4px;background:rgba(5,150,105,0.1);color:${PD};font-weight:700">Ready</span></div><div style="height:1px;background:${G2}"></div><div style="display:flex;gap:6px"><div style="width:18px;height:18px;border-radius:4px;background:${G1};border:1px solid ${G2}"></div><div style="width:18px;height:18px;border-radius:4px;background:${G1};border:1px solid ${G2}"></div><div style="width:18px;height:18px;border-radius:4px;background:${G1};border:1px solid ${G2}"></div></div></div>
</div>
<div class="illu-ui-nav"><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item illu-ui-nav__item--active"></div><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item"></div></div>
</div></div>
<div class="illu-float" style="top:8%;left:-25px;--rot:-3deg;animation:illuFloat 4.5s ease-in-out infinite"><div class="illu-float__icon">${ic('M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z')}</div><div class="illu-float__text"><span class="illu-float__label">New Order</span><span class="illu-float__value illu-float__value--green">GH₵ 180</span></div></div>
<div class="illu-float" style="bottom:14%;right:-40px;--rot:4deg;animation:illuFloat 5.5s ease-in-out 1s infinite"><div class="illu-float__icon">${ic('M5 8h14M5 8a2 2 0 01-2-2V3a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 01-2 2M5 8v9a2 2 0 002 2h10a2 2 0 002-2V8')}</div><div class="illu-float__text"><span class="illu-float__label">Package</span><span class="illu-float__value">In Transit</span></div></div>
</div>`;
}

function analytics(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-dots"></div><div class="illu-glow illu-glow--sm illu-glow--center"></div>
<div class="illu-obj illu-obj--coin" style="top:12%;left:8%"></div><div class="illu-obj illu-obj--star" style="bottom:20%;right:8%;width:24px;height:24px"></div>
<div class="illu-phone"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Dashboard</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div style="display:flex;justify-content:space-between;gap:8px">
<div class="illu-ui-block" style="flex:1;height:44px;display:flex;align-items:flex-end;padding:8px"><div class="illu-ui-skel illu-ui-skel--sm" style="width:40%"></div><div class="illu-ui-skel illu-ui-skel--lg" style="width:70%"></div></div>
<div class="illu-ui-block" style="flex:1;height:44px;display:flex;align-items:flex-end;padding:8px"><div class="illu-ui-skel illu-ui-skel--sm" style="width:50%"></div><div class="illu-ui-skel illu-ui-skel--lg" style="width:60%"></div></div>
</div>
<div class="illu-ui-block illu-ui-block--tall" style="padding:12px;display:flex;flex-direction:column;justify-content:flex-end;gap:4px">
<svg viewBox="0 0 200 60" style="width:100%;height:auto;opacity:0.7"><path d="M0,50 Q30,45 50,30 T100,20 T150,25 T200,5" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/><path d="M0,50 Q30,45 50,30 T100,20 T150,25 T200,5 L200,60 L0,60 Z" fill="url(#ag)" opacity="0.2"/><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${P}"/><stop offset="100%" stop-color="${P}" stop-opacity="0"/></linearGradient></defs></svg>
</div>
<div style="display:flex;justify-content:center"><span style="font-size:0.65rem;padding:4px 12px;border-radius:5px;background:rgba(5,150,105,0.1);color:${PD};font-weight:700;font-family:'Poppins',sans-serif">+34% Growth</span></div>
</div></div></div>
<div class="illu-float" style="top:10%;right:-40px;--rot:3deg;animation:illuFloat 5s ease-in-out infinite"><div class="illu-float__icon">${ic('M7 17l9.2-9.2M17 17V7H7')}</div><div class="illu-float__text"><span class="illu-float__label">Revenue</span><span class="illu-float__value illu-float__value--green">+42%</span></div></div>
<div class="illu-float" style="bottom:16%;left:-40px;--rot:-3deg;animation:illuFloat 6s ease-in-out 1s infinite"><div class="illu-float__icon">${ic('M12 20V10 M18 20V4 M6 20v-4')}</div><div class="illu-float__text"><span class="illu-float__label">Sales</span><span class="illu-float__value">1,820</span></div></div>
</div>`;
}

function shop(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-grid"></div>
<div class="illu-glow illu-glow--lg illu-glow--top-right"></div><div class="illu-glow illu-glow--mint illu-glow--bottom-left"></div>
<div class="illu-obj illu-obj--pin" style="top:16%;left:6%"></div><div class="illu-obj illu-obj--cart" style="bottom:20%;right:6%"></div>
<div class="illu-phone"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Marketplace</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div class="illu-ui-block illu-ui-block--short" style="display:flex;align-items:center;gap:8px;padding:0 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${T2}" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><div class="illu-ui-skel illu-ui-skel--sm" style="width:70%"></div></div>
<div class="illu-ui-row" style="gap:6px"><span class="illu-ui-chip" style="font-size:0.5rem">All</span><span class="illu-ui-chip" style="font-size:0.5rem">Food</span><span class="illu-ui-chip" style="font-size:0.5rem">Tech</span><span class="illu-ui-chip" style="font-size:0.5rem">Fashion</span></div>
<div class="illu-ui-row" style="margin-top:4px"><div class="illu-ui-block" style="flex:1;height:60px;background:linear-gradient(135deg,#d1fae5,#a7f3d0)"></div><div class="illu-ui-block" style="flex:1;height:60px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe)"></div></div>
<div class="illu-ui-row"><div class="illu-ui-block" style="flex:1;height:60px;background:linear-gradient(135deg,#fef3c7,#fde68a)"></div><div class="illu-ui-block" style="flex:1;height:60px;background:linear-gradient(135deg,#fce7f3,#fbcfe8)"></div></div>
</div>
<div class="illu-ui-nav"><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item illu-ui-nav__item--active"></div><div class="illu-ui-nav__item"></div></div>
</div></div>
<div class="illu-float" style="top:6%;left:-20px;--rot:-4deg;animation:illuFloat 5s ease-in-out infinite"><div class="illu-float__icon">${ic('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z')}</div><div class="illu-float__text"><span class="illu-float__label">Search</span><span class="illu-float__value">Campus</span></div></div>
<div class="illu-float" style="bottom:10%;right:-25px;--rot:3deg;animation:illuFloat 6s ease-in-out 0.8s infinite"><div class="illu-float__icon">${ic('M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0')}</div><div class="illu-float__text"><span class="illu-float__label">Nearby</span><span class="illu-float__value illu-float__value--green">12 shops</span></div></div>
</div>`;
}

function chat(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-dots"></div><div class="illu-glow illu-glow--sm illu-glow--bottom-left"></div>
<div class="illu-obj illu-obj--box" style="top:14%;left:6%"></div><div class="illu-obj illu-obj--heart" style="bottom:18%;right:8%"></div>
<div class="illu-phone"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Messages</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body" style="gap:8px">
<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
<div style="display:flex;gap:8px;align-items:flex-start"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a78bfa);flex-shrink:0"></div><div style="background:${G1};border:1px solid ${G2};border-radius:12px 12px 12px 4px;padding:8px 12px;max-width:75%"><div class="illu-ui-skel illu-ui-skel--sm"></div><div class="illu-ui-skel illu-ui-skel--md" style="margin-top:4px"></div></div></div>
<div style="display:flex;gap:8px;align-items:flex-start;flex-direction:row-reverse"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#059669,#34d399);flex-shrink:0"></div><div style="background:${P};border-radius:12px 12px 4px 12px;padding:8px 12px;max-width:75%"><div style="height:6px;width:60%;background:rgba(255,255,255,0.25);border-radius:3px"></div><div style="height:6px;width:40%;background:rgba(255,255,255,0.25);border-radius:3px;margin-top:4px"></div></div></div>
<div style="display:flex;gap:8px;align-items:flex-start"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a78bfa);flex-shrink:0"></div><div style="background:${G1};border:1px solid ${G2};border-radius:12px 12px 12px 4px;padding:8px 12px;max-width:75%"><div class="illu-ui-skel illu-ui-skel--sm"></div><div class="illu-ui-skel illu-ui-skel--md" style="margin-top:4px"></div></div></div>
<div style="display:flex;gap:4px;padding:4px 0 4px 36px"><div style="width:5px;height:5px;border-radius:50%;background:${T2};animation:illuPulse 1.2s ease-in-out infinite"></div><div style="width:5px;height:5px;border-radius:50%;background:${T2};animation:illuPulse 1.2s ease-in-out 0.2s infinite"></div><div style="width:5px;height:5px;border-radius:50%;background:${T2};animation:illuPulse 1.2s ease-in-out 0.4s infinite"></div></div>
</div>
</div>
<div class="illu-ui-nav"><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item illu-ui-nav__item--active"></div><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item"></div></div>
</div></div>
<div class="illu-float" style="top:12%;right:-35px;--rot:3deg;animation:illuFloat 5s ease-in-out infinite"><div class="illu-float__icon">${ic('M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z')}</div><div class="illu-float__text"><span class="illu-float__label">New Message</span><span class="illu-float__value">From Ama</span></div></div>
<div class="illu-float" style="bottom:12%;left:-30px;--rot:-3deg;animation:illuFloat 6s ease-in-out 0.5s infinite"><div class="illu-float__icon">${ic('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}</div><div class="illu-float__text"><span class="illu-float__label">Delivery</span><span class="illu-float__value illu-float__value--green">Confirmed</span></div></div>
</div>`;
}

function checkout(ctr){
  if(!ctr)return;
  ctr.innerHTML=`
<div class="illu-scene"><div class="illu-bg-gradient"></div><div class="illu-bg-grid"></div><div class="illu-glow illu-glow--lg illu-glow--bottom-left"></div>
<div class="illu-obj illu-obj--shield" style="top:15%;left:8%;width:48px;height:52px"></div>
<div class="illu-obj illu-obj--box" style="bottom:18%;right:10%"></div>
<div class="illu-obj illu-obj--coin" style="top:60%;left:6%"></div>
<div class="illu-phone" style="transform:rotate(-4deg)"><div class="illu-phone__notch"></div><div class="illu-phone__screen">
<div class="illu-ui-header"><span class="illu-ui-header__title">Checkout</span><div class="illu-ui-header__icon"></div></div>
<div class="illu-ui-body">
<div class="illu-ui-block illu-ui-block--med" style="display:flex;align-items:center;gap:8px;padding:8px 12px"><div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);flex-shrink:0"></div><div style="flex:1"><div class="illu-ui-skel illu-ui-skel--md"></div><div class="illu-ui-skel illu-ui-skel--sm"></div></div><div style="color:${P};font-size:0.65rem;font-weight:700;font-family:'Poppins',sans-serif">GH₵ 120</div></div>
<div class="illu-ui-block illu-ui-block--tall" style="padding:12px;display:flex;flex-direction:column;gap:8px">
<div style="display:flex;align-items:center;gap:8px;padding:8px;background:${G1};border-radius:8px;border:1px solid ${G2}"><div style="width:20px;height:20px;border-radius:50%;background:${P};flex-shrink:0"></div><div class="illu-ui-skel illu-ui-skel--sm" style="width:60%"></div></div>
<div style="display:flex;align-items:center;gap:8px;padding:8px;background:${G1};border-radius:8px;border:1px solid ${G2}"><div style="width:20px;height:20px;border-radius:50%;background:#6366f1;flex-shrink:0"></div><div class="illu-ui-skel illu-ui-skel--sm" style="width:50%"></div></div>
<div style="background:${P};color:#fff;text-align:center;padding:10px;border-radius:8px;font-size:0.7rem;font-weight:700;font-family:'Quicksand',sans-serif;margin-top:auto">Pay GH₵ 120</div>
</div>
</div>
<div class="illu-ui-nav"><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item"></div><div class="illu-ui-nav__item illu-ui-nav__item--active"></div><div class="illu-ui-nav__item"></div></div>
</div></div>
<div class="illu-float" style="top:10%;right:-35px;--rot:3deg;animation:illuFloat 5s ease-in-out infinite"><div class="illu-float__icon">${ic('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}</div><div class="illu-float__text"><span class="illu-float__label">Payment</span><span class="illu-float__value illu-float__value--green">Success</span></div></div>
<div class="illu-float" style="bottom:14%;left:-30px;--rot:-3deg;animation:illuFloat 6s ease-in-out 1s infinite"><div class="illu-float__icon">${ic('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')}</div><div class="illu-float__text"><span class="illu-float__label">Package</span><span class="illu-float__value">Shipped</span></div></div>
</div>`;
}

/* ═══════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════ */
window.Illustrations={
  hero,store,sell,orders,analytics,shop,chat,checkout
};

/* ═══════════════════════════════════════════
   ENTRANCE OBSERVER
   ═══════════════════════════════════════════ */
function setupObserver(){
  if(!('IntersectionObserver' in window))return;
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('in-view');
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.15,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.illu-entrance').forEach(el=>obs.observe(el));
}

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{
    setupObserver();
    lucide.createIcons();
  });
}else{
  setupObserver();
  lucide.createIcons();
}
})();
