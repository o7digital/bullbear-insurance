(() => {
  const nav = document.querySelector('#primary-navigation');
  const toggle = document.querySelector('.mobile-toggle');
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label','Abrir menú');
    document.body.classList.remove('menu-open');
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav?.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-open',open);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', closeNav);
  nav?.querySelectorAll('a').forEach((a)=>a.addEventListener('click',closeNav));
  document.addEventListener('keydown', e=>{if(e.key==='Escape') closeNav()});
  document.querySelectorAll('a[data-service]').forEach((a) => a.addEventListener('click',()=>{
    const select=document.querySelector('#service');
    if(select) select.value=a.dataset.service || '';
  }));
  document.querySelector('#interest-form')?.addEventListener('submit', (event)=>{
    event.preventDefault();
    const form=event.currentTarget;
    if(!form.reportValidity()) return;
    const out=document.querySelector('#form-message');
    form.reset();
    if(out) out.textContent='Demostración completada. No se ha enviado ni guardado ningún dato. La conexión con Formspree se realizará en una fase posterior.';
  });
})();
