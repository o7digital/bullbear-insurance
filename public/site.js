(() => {
  const nav = document.querySelector('#primary-navigation');
  const toggle = document.querySelector('.mobile-toggle');
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', toggle.dataset.openLabel || 'Abrir menú');
    document.body.classList.remove('menu-open');
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav?.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? (toggle.dataset.closeLabel || 'Cerrar menú') : (toggle.dataset.openLabel || 'Abrir menú'));
    document.body.classList.toggle('menu-open',open);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', closeNav);
  nav?.querySelectorAll('a').forEach((a)=>a.addEventListener('click',closeNav));
  document.addEventListener('keydown', e=>{if(e.key==='Escape') closeNav()});
  document.querySelectorAll('a[data-service]').forEach((a) => a.addEventListener('click',()=>{
    const select=document.querySelector('#service');
    if(select) select.value=a.dataset.service || '';
  }));
  document.querySelector('#interest-form')?.addEventListener('submit', async (event)=>{
    event.preventDefault();
    const form=event.currentTarget;
    if(!form.reportValidity()) return;
    const out=document.querySelector('#form-message');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    if(out) out.textContent = form.dataset.pending;
    try {
      const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.elements.name.value, email: form.elements.email.value, service: form.elements.service.value, consent: form.elements.consent.checked, website: form.elements.website.value, locale: form.dataset.locale || 'es' }) });
      if (!response.ok) throw new Error('Submission failed');
      form.reset();
      if(out) out.textContent = form.dataset.success;
    } catch { if(out) out.textContent = form.dataset.error; }
    finally { button.disabled = false; }
  });
})();
