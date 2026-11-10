(() => {
  const nav = document.querySelector('#primary-navigation');
  const toggle = document.querySelector('.mobile-toggle');
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', toggle.dataset.openLabel || 'Abrir menú');
    nav.querySelectorAll('.nav-products[open]').forEach(menu=>menu.removeAttribute('open'));
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
  document.addEventListener('click', event=>{
    document.querySelectorAll('.nav-products[open]').forEach(menu=>{if(!menu.contains(event.target))menu.removeAttribute('open');});
  });
  const heroSlides=[...document.querySelectorAll('[data-hero-slide]')];
  const heroControls=[...document.querySelectorAll('[data-hero-control]')];
  heroControls.forEach(button=>button.addEventListener('click',()=>{
    const index=Number(button.dataset.heroControl),slide=heroSlides[index];
    if(!slide)return;
    document.querySelector('.atelier-hero').dataset.heroKind=slide.dataset.slideKind;
    document.querySelector('#hero-title').innerHTML=slide.querySelector('[data-slide-title]').innerHTML;
    document.querySelector('#hero-subtitle').textContent=slide.querySelector('[data-slide-subtitle]').textContent;
    const contact=document.querySelector('#hero-contact'),link=slide.querySelector('[data-slide-contact]');
    contact.setAttribute('href',link.getAttribute('href'));
    contact.firstChild.textContent=link.textContent+' ';
    document.querySelectorAll('[data-hero-image]').forEach(image=>{image.hidden=Number(image.dataset.heroImage)!==index;});
    heroControls.forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
  }));
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
      const choice = form.querySelector('#service option:checked');
      const first = form.elements.name.value.trim(), last = form.elements.last_name.value.trim();
      const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${first} ${last}`, first_name: first, last_name: last, email: form.elements.email.value, phone: form.elements.phone.value, message: form.elements.message?.value || '', form: form.dataset.form, insurance_type: choice?.value || 'auto', service: choice?.dataset.service || form.dataset.service, consent: form.elements.consent.checked, website: form.elements.website.value, locale: form.dataset.locale || 'es' }) });
      if (!response.ok) throw new Error('Submission failed');
      form.reset();
      if(out) out.textContent = form.dataset.success;
    } catch { if(out) out.textContent = form.dataset.error; }
    finally { button.disabled = false; }
  });
})();
