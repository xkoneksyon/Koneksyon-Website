/* Presentation enhancements only; policy content and original handlers are left intact. */
(() => {
  'use strict';
  const titles = document.querySelectorAll('.policy-page .ph-title, .policy-page .section-title:not(h2)');
  titles.forEach(title => {
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', title.classList.contains('ph-title') ? '1' : '2');
  });
  const contents = document.querySelector('details.toc');
  if (contents) {
    const small = window.matchMedia('(max-width: 800px)');
    const adapt = () => { contents.open = !small.matches; };
    adapt();
    small.addEventListener('change', adapt);
  }
  const picker = document.getElementById('languagePicker');
  const languageButton = document.getElementById('langButton');
  if (picker && languageButton) {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && picker.classList.contains('open')) {
        picker.classList.remove('open');
        languageButton.setAttribute('aria-expanded', 'false');
        languageButton.focus();
      }
    });
  }
})();
