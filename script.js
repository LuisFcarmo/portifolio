document.documentElement.classList.add('js');

/**
 * ─── Component Loader ─────────────────────────────────────
 * Carrega seções HTML externas em placeholders [data-section]
 */
async function loadSections() {
  const placeholders = document.querySelectorAll('[data-section]');
  await Promise.all([...placeholders].map(async (el) => {
    const file = el.dataset.section;
    try {
      const res = await fetch(`sections/${file}`);
      if (!res.ok) throw new Error(`${file} not found`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (e) {
      console.warn(`Could not load section: ${file}`, e);
    }
  }));

  // após carregar todos os componentes, inicializa comportamentos
  initNav();
  initReveal();
  initCardExpansion();
}

/**
 * ─── Nav: scroll + active link ────────────────────────────
 */
function initNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const navToggle = nav.querySelector('.nav-toggle');

  const closeMenu = () => {
    nav.classList.remove('menu-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Abrir menu de navegação');
  };

  navToggle?.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('menu-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
  });

  navLinks.forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
          }
        });
      }
    });
  }, { rootMargin: '-25% 0px -60%', threshold: 0 });

  sections.forEach(s => sectionObserver.observe(s));
}

/**
 * ─── Scroll Reveal ────────────────────────────────────────
 */
function initReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4%' });

  revealElements.forEach(el => observer.observe(el));
}

/**
 * ─── Card Expansion (Mobile Accordion) ───────────────────
 * Adiciona botões de expansão/recolhimento para cards extensos no mobile
 */
function initCardExpansion() {
  // 1. Projetos com .project-details
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    const details = card.querySelector('.project-details');
    if (!details) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'card-toggle-btn';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = `
      <span>Ver detalhes e responsabilidades</span>
      <svg class="toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    `;

    card.insertBefore(toggleBtn, details);

    toggleBtn.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('details-expanded');
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleBtn.querySelector('span').textContent = isExpanded 
        ? 'Ocultar detalhes' 
        : 'Ver detalhes e responsabilidades';
    });
  });

  // 2. Experiências com muitos bullets
  const expCards = document.querySelectorAll('.exp-item');
  expCards.forEach(card => {
    const bullets = card.querySelectorAll('.exp-bullets li');
    if (bullets.length > 3) {
      const bulletsList = card.querySelector('.exp-bullets');
      bullets.forEach((li, idx) => {
        if (idx >= 2) li.classList.add('bullet-extra');
      });

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'card-toggle-btn exp-toggle-btn';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = `
        <span>Ver mais realizações (+${bullets.length - 2})</span>
        <svg class="toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      `;

      bulletsList.after(toggleBtn);

      toggleBtn.addEventListener('click', () => {
        const isExpanded = card.classList.toggle('details-expanded');
        toggleBtn.setAttribute('aria-expanded', String(isExpanded));
        toggleBtn.querySelector('span').textContent = isExpanded 
          ? 'Ocultar realizações adicionais' 
          : `Ver mais realizações (+${bullets.length - 2})`;
      });
    }
  });
}

// ─── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSections);
