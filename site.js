
/* ---- Configuration ----------------------------------------------------
   FORM_ENDPOINT: set to a form-handling service URL (for example a
   Formspree or Netlify form URL) on the live site. While it is empty, no enquiry is sent:
   the visitor is shown their completed enquiry with an email button and a copy button instead.
   Note: published Claude artifacts cannot make network requests, so the endpoint only works once
   this page is hosted on the client's own site. */
const CONFIG = { FORM_ENDPOINT: "", TO_EMAIL: "Sales@graniteteemarkers.co.uk" };

/* forms */
const msgs = {
  text: 'Enter this information so we can reply.',
  email: 'Enter an email address in the form name@example.co.uk.',
  tel: 'Enter a phone number we can reach you on.',
  number: 'Enter a whole number of blocks, 1 or more.',
  colours: 'Choose at least one colour.'
};
function labelOf(el){ const l = document.querySelector('label[for="'+el.id+'"]'); return l ? l.firstChild.textContent.trim() : el.name; }
function setErr(el, text){
  let box = el.closest('.field') || el.closest('fieldset');
  let e = box.querySelector('.err');
  if (!text){ if (e) e.remove(); el.removeAttribute('aria-invalid'); return; }
  if (!e){ e = document.createElement('p'); e.className = 'err'; e.id = (el.id || 'fs') + '-err-' + Math.random().toString(36).slice(2,6); box.appendChild(e); }
  e.textContent = text; el.setAttribute('aria-invalid','true');
  const d = (el.getAttribute('aria-describedby')||'').split(' ').filter(x=>x && !x.includes('-err-'));
  d.push(e.id); el.setAttribute('aria-describedby', d.join(' '));
}
function validate(form){
  const problems = [];
  form.querySelectorAll('input[required],textarea[required]').forEach(el => {
    const v = el.value.trim(); let m = '';
    if (!v) m = el.type==='email'?msgs.email: el.type==='tel'?msgs.tel: el.type==='number'?msgs.number: msgs.text;
    else if (el.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) m = msgs.email;
    else if (el.type==='tel' && !/^[0-9+()\s-]{7,}$/.test(v)) m = msgs.tel;
    else if (el.type==='number' && !(Number.isInteger(+v) && +v>=1)) m = msgs.number;
    setErr(el, m); if (m) problems.push([el, labelOf(el)+': '+m]);
  });
  const opt = form.querySelector('input[type=email]:not([required]),input[type=tel]:not([required])');
  form.querySelectorAll('input[type=tel]:not([required])').forEach(el=>{
    const v = el.value.trim(); const m = v && !/^[0-9+()\s-]{7,}$/.test(v) ? msgs.tel : '';
    setErr(el,m); if (m) problems.push([el, labelOf(el)+': '+m]);
  });
  const fs = form.querySelector('fieldset');
  if (fs){
    const any = fs.querySelector('input:checked');
    const first = fs.querySelector('input');
    setErr(first, any ? '' : msgs.colours);
    if (!any) problems.push([first, 'Colours needed: '+msgs.colours]);
  }
  return problems;
}
function showSummary(form, problems){
  const slot = form.querySelector('[data-slot]'); slot.innerHTML = '';
  if (!problems.length) return;
  const s = document.createElement('div'); s.className = 'summary'; s.setAttribute('role','alert'); s.tabIndex = -1;
  s.innerHTML = '<strong>Please fix '+problems.length+(problems.length>1?' fields':' field')+':</strong><ul></ul>';
  const ul = s.querySelector('ul');
  problems.forEach(([el,t]) => { const li = document.createElement('li'), a = document.createElement('a'); a.href = '#'+el.id; a.textContent = t; a.style.color='inherit';
    a.addEventListener('click', ev => { ev.preventDefault(); el.focus(); }); li.appendChild(a); ul.appendChild(li); });
  slot.appendChild(s); s.focus();
}
function composeText(form){
  const lines = [form.dataset.kind, ''];
  const data = new FormData(form); const seen = new Set();
  for (const [k] of data){ if (seen.has(k)) continue; seen.add(k);
    const v = data.getAll(k).map(x=>String(x).trim()).filter(Boolean).join(', ');
    if (v) lines.push(k+': '+v); }
  return lines.join('\n');
}
async function copyText(text, btn){
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch(e){ const pre = btn.closest('.result').querySelector('pre'); const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Text selected, press copy'; }
  setTimeout(()=>{ btn.textContent = 'Copy enquiry'; }, 2500);
}
function showResult(form, sent){
  const text = composeText(form), kind = form.dataset.kind;
  const box = document.createElement('div'); box.className = 'card-form result'; box.setAttribute('tabindex','-1');
  const h = document.createElement('h3');
  const p = document.createElement('p'); p.className = 'sub';
  const pre = document.createElement('pre'); pre.textContent = text;
  if (sent){
    h.textContent = 'Thank you, your enquiry has been sent';
    p.textContent = 'We will reply by phone or email. A copy of what you sent is below.';
    box.append(h,p,pre);
  } else {
    h.textContent = 'Your enquiry is ready to send';
    p.innerHTML = 'It has not been sent yet. Email it to <strong></strong> using the button, or copy it into an email or call us on 01926 865821.';
    p.querySelector('strong').textContent = CONFIG.TO_EMAIL;
    const row = document.createElement('div'); row.className = 'row';
    const a = document.createElement('a'); a.className = 'btn'; a.textContent = 'Open in your email app';
    a.href = 'mailto:'+CONFIG.TO_EMAIL+'?subject='+encodeURIComponent(kind+' - Granite Tee Markers')+'&body='+encodeURIComponent(text);
    const c = document.createElement('button'); c.type = 'button'; c.className = 'btn ghost'; c.textContent = 'Copy enquiry';
    c.addEventListener('click', () => copyText(text, c));
    const back = document.createElement('button'); back.type = 'button'; back.className = 'btn ghost'; back.textContent = 'Edit details';
    back.addEventListener('click', () => { box.replaceWith(form); form.querySelector('input,textarea').focus(); });
    row.append(a,c,back); box.append(h,p,pre,row);
  }
  box.id = form.id + '-result';
  form.replaceWith(box); box.focus();
  if (sent) box.dataset.sent = '1';
}
document.querySelectorAll('form.card-form').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const problems = validate(form); showSummary(form, problems);
    if (problems.length) return;
    if (CONFIG.FORM_ENDPOINT){
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const r = await fetch(CONFIG.FORM_ENDPOINT, {method:'POST', headers:{'Accept':'application/json'}, body:new FormData(form)});
        if (!r.ok) throw new Error('bad status');
        showResult(form, true);
      } catch(err){
        btn.disabled = false; btn.textContent = form.id==='sample' ? 'Request free samples' : 'Ask for a quote';
        const slot = form.querySelector('[data-slot]');
        slot.innerHTML = '<div class="summary" role="alert" tabindex="-1">We could not send this just now. Please try again, or email '+CONFIG.TO_EMAIL+' or call 01926 865821.</div>';
        slot.firstChild.focus();
      }
    } else { showResult(form, false); }
  });
  form.addEventListener('input', e => { const el = e.target; if (el.getAttribute('aria-invalid')==='true') setErr(el,''); });
});

/* soft pointer highlight on cards */
document.querySelectorAll('.journey a,.sw,.points li').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

/* product rail arrows */
document.querySelectorAll('[data-rail]').forEach(rail => {
  const sec = rail.closest('section');
  sec.querySelectorAll('.arrow').forEach(btn => btn.addEventListener('click', () => {
    const card = rail.querySelector('.pcard');
    const step = card ? card.getBoundingClientRect().width + 18 : 280;
    rail.scrollBy({ left: step * Number(btn.dataset.dir), behavior: 'smooth' });
  }));
});

/* golf tee scroll slider: a small tee that tracks page position and can be dragged */
(function(){
  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'teeslide';
  el.setAttribute('role','slider');
  el.setAttribute('aria-label','Scroll position');
  el.setAttribute('aria-orientation','vertical');
  el.setAttribute('aria-valuemin','0');
  el.setAttribute('aria-valuemax','100');
  el.setAttribute('aria-valuenow','0');
  el.tabIndex = 0;
  el.innerHTML = '<span class="teeslide-line"></span><span class="teeslide-thumb"><svg viewBox="0 2 18 33" aria-hidden="true" focusable="false"><circle cx="9" cy="7.2" r="4" fill="#fff" stroke="currentColor" stroke-width="1.1"/><path d="M3 9.5Q9 13 15 9.5L10.1 15L9.5 31L9 33.6L8.5 31L7.9 15Z" fill="currentColor"/></svg></span>';
  document.body.appendChild(el);
  const range = () => Math.max(0, root.scrollHeight - window.innerHeight);
  let queued = false;
  function paint(){
    queued = false;
    const m = range();
    el.hidden = m < 240;
    const p = m ? Math.min(1, Math.max(0, window.scrollY / m)) : 0;
    el.style.setProperty('--p', p.toFixed(4));
    el.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }
  function queue(){ if (!queued){ queued = true; requestAnimationFrame(paint); } }
  function jump(p){ window.scrollTo({ top: Math.min(1, Math.max(0, p)) * range(), behavior: 'instant' }); }
  function fromPointer(e){
    const r = el.getBoundingClientRect(), th = el.querySelector('.teeslide-thumb').offsetHeight;
    jump((e.clientY - r.top - th / 2) / (r.height - th));
  }
  let dragging = false;
  el.addEventListener('pointerdown', e => { dragging = true; el.classList.add('drag'); el.setPointerCapture(e.pointerId); fromPointer(e); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (dragging) fromPointer(e); });
  const stop = () => { dragging = false; el.classList.remove('drag'); };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('keydown', e => {
    const p = range() ? window.scrollY / range() : 0;
    const step = { ArrowDown: .08, ArrowUp: -.08, PageDown: .25, PageUp: -.25 }[e.key];
    if (step !== undefined){ jump(p + step); e.preventDefault(); }
    else if (e.key === 'Home'){ jump(0); e.preventDefault(); }
    else if (e.key === 'End'){ jump(1); e.preventDefault(); }
  });
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  paint();
})();
