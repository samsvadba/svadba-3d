import { monogram, names } from './brand-v3.js';
import { createRSVP } from './rsvp-v3.js';
import './wedding-v3.css';
import maps from './wedding-maps-v3.js';

// A chapter inside V3: existing language, mood, audio and chapter routing stay global.
export function createWedding(root, wedding, { t, gsap, reducedMotion }) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = key => `<span data-wedding-i18n="${key}">${escape(t(key))}</span>`;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
  const paths = {
    church: '<path d="M5 29V15l11-8 11 8v14H5Zm8 0v-8a3 3 0 0 1 6 0v8M16 7V1m-3 3h6M10 16h2m8 0h2"/>',
    rings: '<circle cx="12" cy="19" r="8"/><circle cx="22" cy="19" r="8"/><path d="m11 8-3-4 4-3 4 3-3 4m8-1 3-4 4 3-3 4"/>',
    bus: '<rect x="6" y="3" width="20" height="24" rx="3"/><path d="M6 17h20M10 7h12M11 27v3m10-3v3"/><circle cx="11" cy="22" r="1"/><circle cx="21" cy="22" r="1"/>',
    gathering: '<path d="M7 29V13m-3 4 12-12 12 12M11 29V17h10v12M3 29h26"/>',
    table: '<path d="M9 2v9m-4-9v7a4 4 0 0 0 8 0V2M9 13v17M25 30V2c-5 4-7 10-7 16h7"/>'
  };
  const icon = name => `<svg class="w-icon" viewBox="0 0 34 34" aria-hidden="true">${paths[name] || paths.rings}</svg>`;
  const link = (url, key) => `<a class="w-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${copy(key)}${arrow}</a>`;
  const tabKeys = ['invitation','detail','program','menu','rsvp','faq'];
  const labels = {invitation:'wInvitationTab',detail:'wDetail',program:'wProgram',menu:'wMenu',rsvp:'wRsvp',faq:'wFaq'};
  const heading = (eyebrow, title, intro) => `<header class="w-panel-heading"><p class="w-eyebrow">${copy(eyebrow)}</p><h2 tabindex="-1">${copy(title)}</h2>${intro ? `<p class="w-intro">${copy(intro)}</p>` : ''}</header>`;
  const jump = (tab, key) => `<button class="w-link" type="button" data-wedding-tab="${tab}">${copy(key)}${arrow}</button>`;
  const venue = (item, ceremony) => `<article class="w-venue">${icon(ceremony?'church':'rings')}<p class="w-eyebrow">${copy(ceremony?'wCeremony':'wReception')}</p><h3>${escape(item.name)}</h3><p class="w-venue-time">${ceremony?escape(item.time):copy('wAfterCeremony')}</p><p class="w-address">${escape(item.address)}</p><a class="w-map-preview" href="${escape(item.maps)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(item.name+' — '+item.address)}">${maps[ceremony?'ceremony':'reception']}</a><a class="w-map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>${link(item.maps,'wMap')}</article>`;
  const invitationMarkup = `<section class="w-panel w-invitation" id="w-panel-invitation" role="tabpanel" aria-labelledby="w-tab-invitation" tabindex="0" aria-label="${escape(t('wInvitation'))}">
    <div class="w-invitation-inner">
      <div class="w-monogram" aria-hidden="true">${monogram}</div>
      <h2 tabindex="-1" class="w-invitation-names brand-names">${names()}</h2>
      <p class="w-invitation-announcement">${copy('wAnnounce')}<br>${copy('wSacrament')}</p>
      <div class="w-invitation-rule" aria-hidden="true"></div>
      <p class="w-invitation-date"><span>${copy('wInvitationDate')}</span><span class="w-invitation-time-separator" aria-hidden="true">·</span><span>${copy('wInvitationTime')}</span></p>
      <p class="w-invitation-place">${copy('wInvitationPlace')}</p>
      <p class="w-invitation-meeting">${copy('wInvitationMeeting')}</p>
      <div class="w-invitation-actions">${jump('rsvp','wConfirm')}${jump('detail','wInformation')}</div>
    </div>
  </section>`;
  root.innerHTML = `<div class="w-shell">
    <div class="w-tabs" role="tablist" aria-label="${escape(t('wTabs'))}">${tabKeys.map((id,i)=>`<button type="button" role="tab" id="w-tab-${id}" aria-controls="w-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${copy(labels[id])}</button>`).join('')}</div>
    <div class="w-pages">${invitationMarkup}
      <section class="w-panel" id="w-panel-detail" role="tabpanel" aria-labelledby="w-tab-detail" tabindex="0" hidden>
        <div class="w-detail-head"><p class="w-eyebrow">${copy('wChapter')}</p><h2 tabindex="-1" class="brand-names">${names()}</h2><p class="w-date">30 · 04 · 2027</p><p class="w-intro">${copy('wWelcome')}</p></div>
        <div class="w-countdown" role="timer" aria-live="off" aria-label="${escape(t('wCountdown'))}">${['wDays','wHours','wMinutes','wSeconds'].map((key,i)=>`<div><span class="w-count-number" data-w-count="${i}">00</span><span class="w-count-label">${copy(key)}</span></div>`).join('')}</div><p class="w-day-arrived" hidden>${copy('wDayArrived')}</p>
        <div class="w-venues">${venue(wedding.ceremony,true)}${venue(wedding.reception,false)}</div>
        <div class="w-practical"><div><p class="w-eyebrow">${copy('wTransport')}</p><p>${copy('wTransportShort')}</p></div><div><p class="w-eyebrow">${copy('wLodging')}</p><p>${copy('wLodgingShort')}</p></div></div>
        <div class="w-detail-links">${jump('rsvp','wConfirm')}${jump('faq','wPractical')}</div>
        <p class="w-signature brand-names">${names()}</p>
      </section>
      <section class="w-panel" id="w-panel-program" role="tabpanel" aria-labelledby="w-tab-program" tabindex="0" hidden>
        ${heading('wProgram','wProgramTitle','wProgramIntro')}
        <ol class="w-timeline">${wedding.timeline.map(item=>`<li>${icon(item.icon)}<div class="w-timeline-copy"><p class="w-time">${item.time?escape(item.time):copy(item.timeKey)}</p><h3>${copy(item.titleKey)}</h3><p>${copy(item.detailKey)}</p></div></li>`).join('')}</ol>
      </section>
      <section class="w-panel" id="w-panel-menu" role="tabpanel" aria-labelledby="w-tab-menu" tabindex="0" hidden>
        ${heading('wMenu','wMenuTitle')}
        <div class="w-menu-content">${icon('table')}<div class="w-menu-courses">${wedding.menuCourses.length ? wedding.menuCourses.map(course=>`<article><h3>${copy(course.titleKey)}</h3><p>${copy(course.descriptionKey)}</p></article>`).join('') : `<article><h3>${copy('wMenuPendingTitle')}</h3><p>${copy('wMenuPending')}</p></article>`}</div><div class="w-menu-diet"><h3>${copy('wDietTitle')}</h3><p>${copy('wDiet')}</p>${jump('rsvp','wConfirm')}</div></div>
      </section>
      <section class="w-panel" id="w-panel-rsvp" role="tabpanel" aria-labelledby="w-tab-rsvp" tabindex="0" hidden>
        ${heading('wRsvp','wRsvpTitle','wRsvpIntro')}<div id="w-rsvp-root"></div>
      </section>
      <section class="w-panel" id="w-panel-faq" role="tabpanel" aria-labelledby="w-tab-faq" tabindex="0" hidden>
        ${heading('wFaq','wFaqTitle','wFaqIntro')}
        <div class="w-faq">${wedding.faq.map((item,i)=>`<article><h3><button type="button" class="w-faq-toggle" id="w-question-${i}" aria-expanded="false" aria-controls="w-answer-${i}"><span class="w-faq-number">${String(i+1).padStart(2,'0')}</span>${copy(item.questionKey)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button></h3><div class="w-faq-answer" id="w-answer-${i}" aria-labelledby="w-question-${i}" hidden><div><p>${copy(item.answerKey)}</p>${(item.links||[]).map(item=>link(item.url,item.labelKey)).join('')}${item.tab?jump(item.tab,'wConfirm'):''}</div></div></article>`).join('')}</div>
        <p class="w-faq-signoff">${copy('wThanks')}<span class="w-signature brand-names">${names()}</span></p>
      </section>
    </div>
    <div class="w-scroll-hint" aria-hidden="true">SCROLL<svg viewBox="0 0 16 24"><path d="M8 2v18m-4-4 4 4 4-4"/></svg></div>
  </div>`;

  let active='invitation', animation, countdownTimer, hintTimer, entered=false;
  const panels = tabKeys.map(id=>root.querySelector(`#w-panel-${id}`));
  const tabs = tabKeys.map(id=>root.querySelector(`#w-tab-${id}`));
  const rsvp = createRSVP(root.querySelector('#w-rsvp-root'), {t,endpoint:wedding.rsvpEndpoint,gsap,reducedMotion});
  const seconds = value => reducedMotion.matches ? 0 : value;
  const hint=root.querySelector('.w-scroll-hint');
  function hideHint(){clearTimeout(hintTimer);gsap.to(hint,{opacity:0,duration:seconds(.2),overwrite:true});}
  function showHint(){
    hideHint();
    requestAnimationFrame(()=>{
      const panel=root.querySelector(`#w-panel-${active}`);
      if(!entered||panel.hidden||panel.scrollTop>2||panel.scrollHeight<=panel.clientHeight+2)return;
      gsap.to(hint,{opacity:.55,duration:seconds(.35),overwrite:true});
      hintTimer=setTimeout(hideHint,2600);
    });
  }
  panels.forEach(panel=>panel.addEventListener('scroll',hideHint,{passive:true}));
  function invitationEntrance(){
    const inner=root.querySelector('.w-invitation-inner');
    gsap.killTweensOf(inner.children);
    if(reducedMotion.matches){gsap.set(inner.children,{clearProps:'opacity,transform,clipPath'});return;}
    animation=gsap.timeline({onComplete:showHint})
      .fromTo(inner.children,{opacity:0,y:10,clipPath:'inset(0 0 100% 0)'},{opacity:1,y:0,clipPath:'inset(0 0 0% 0)',duration:1.05,stagger:.09,ease:'power2.out',clearProps:'opacity,transform,clipPath'});
  }

  function selectTab(id, focusPanel=false) {
    if(!tabKeys.includes(id))return;
    hideHint();
    gsap.killTweensOf(root.querySelector('.w-invitation-inner').children);
    gsap.set(root.querySelector('.w-invitation-inner').children,{clearProps:'opacity,transform,clipPath'});
    animation?.kill();
    const previous=root.querySelector(`#w-panel-${active}`), next=root.querySelector(`#w-panel-${id}`);
    active=id;
    tabs.forEach((tab,i)=>{const selected=tabKeys[i]===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    const show=()=>{
      panels.forEach(panel=>{panel.hidden=panel!==next;panel.inert=panel!==next;});
      gsap.set(next,{opacity:0,y:reducedMotion.matches?0:8});
      if(focusPanel)next.querySelector('h2')?.focus({preventScroll:true});
    };
    const ready=()=>{if(id==='invitation')invitationEntrance();else showHint();};
    if(previous===next){show();animation=gsap.to(next,{opacity:1,y:0,duration:seconds(.35),onComplete:ready});return;}
    panels.forEach(panel=>{panel.inert=true;});
    animation=gsap.timeline().to(previous,{opacity:0,duration:seconds(.14)})
      .call(show).to(next,{opacity:1,y:0,duration:seconds(.4),ease:'power2.out',onComplete:ready});
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>selectTab(tabKeys[i]));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      tabs[next].focus();selectTab(tabKeys[next]);
    });
  });
  root.querySelectorAll('[data-wedding-tab]').forEach(button=>button.addEventListener('click',()=>selectTab(button.dataset.weddingTab,true)));
  root.querySelectorAll('.w-faq-toggle').forEach(button=>button.addEventListener('click',()=>{
    const answer=root.querySelector('#'+button.getAttribute('aria-controls'));
    const open=button.getAttribute('aria-expanded')!=='true';
    button.setAttribute('aria-expanded',String(open));
    gsap.killTweensOf(answer);
    if(open){
      answer.hidden=false;answer.inert=false;
      gsap.fromTo(answer,{height:0,opacity:0},{height:'auto',opacity:1,duration:seconds(.32),ease:'power2.out',onComplete:()=>{answer.style.height='auto';}});
    }else{
      answer.inert=true;
      gsap.to(answer,{height:0,opacity:0,duration:seconds(.24),ease:'power2.inOut',onComplete:()=>{answer.hidden=true;}});
    }
  }));
  function updateCountdown() {
    const remaining=Math.max(0,Math.floor((new Date(wedding.date).getTime()-Date.now())/1000));
    const values=[Math.floor(remaining/86400),Math.floor(remaining/3600)%24,Math.floor(remaining/60)%60,remaining%60];
    root.querySelectorAll('[data-w-count]').forEach((element,i)=>{const value=String(values[i]).padStart(2,'0');if(element.textContent!==value)element.textContent=value;});
    root.querySelector('.w-countdown').hidden=remaining===0;
    root.querySelector('.w-day-arrived').hidden=remaining!==0;
  }
  function refreshLanguage() {
    root.setAttribute('aria-label',t('navWedding'));
    root.querySelector('.w-invitation').setAttribute('aria-label',t('wInvitation'));
    root.querySelectorAll('[data-wedding-i18n]').forEach(element=>{element.textContent=t(element.dataset.weddingI18n);});
    root.querySelector('[role="tablist"]').setAttribute('aria-label',t('wTabs'));
    root.querySelector('[role="timer"]').setAttribute('aria-label',t('wCountdown'));
    rsvp.refreshLanguage();
  }
  return {
    refreshLanguage,
    enter(){entered=true;clearInterval(countdownTimer);refreshLanguage();updateCountdown();countdownTimer=setInterval(updateCountdown,1000);selectTab('invitation',true);root.querySelector('#w-panel-invitation').scrollTop=0;},
    leave(){entered=false;hideHint();clearInterval(countdownTimer);animation?.kill();gsap.killTweensOf(root.querySelector('.w-invitation-inner').children);gsap.set(root.querySelector('.w-invitation-inner').children,{clearProps:'opacity,transform,clipPath'});panels.forEach(panel=>{panel.hidden=panel.id!==`w-panel-${active}`;panel.inert=panel.hidden;});gsap.set(panels,{opacity:1,y:0});}
  };
}
