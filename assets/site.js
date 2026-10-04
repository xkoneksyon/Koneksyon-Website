/* Progressive enhancement only: downloads and page content do not need JS. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const button = document.getElementById('menuBtn');
  const menu = document.getElementById('mobileMenu');
  const setMenu = (open, returnFocus = false) => {
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    if (returnFocus) button.focus();
  };
  if (button && menu) {
    button.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) setMenu(false, true);
    });
    document.addEventListener('click', event => {
      if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) setMenu(false);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
      if (event.matches) setMenu(false);
    });
  }
  const gallery = document.getElementById('appGallery');
  const previous = document.querySelector('[data-gallery-prev]');
  const next = document.querySelector('[data-gallery-next]');
  if (gallery && previous && next) {
    const update = () => {
      previous.disabled = gallery.scrollLeft < 3;
      next.disabled = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 3;
    };
    const move = direction => {
      const item = gallery.querySelector('figure');
      const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0;
      gallery.scrollBy({left: direction * ((item ? item.getBoundingClientRect().width : gallery.clientWidth) + gap),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    gallery.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update, {passive: true});
    update();
  }
  document.querySelectorAll('.store-badge img').forEach(image => {
    const fallback = () => { image.hidden = true; };
    image.addEventListener('error', fallback, {once: true});
    if (image.complete && image.naturalWidth === 0) fallback();
  });
})();
