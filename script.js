document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * ─── Component Loader ─────────────────────────────────────
 * Carrega seções HTML externas em placeholders [data-section]
 */
async function loadSections() {
  const placeholders = document.querySelectorAll('[data-section]');
  await Promise.all([...placeholders].map(async (el) => {
    const file = el.dataset.section;
    try {
      const res = await fetch(`sections/${file}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${file} not found`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (e) {
      console.warn(`Could not load section: ${file}`, e);
    }
  }));

  // após carregar todos os componentes, inicializa comportamentos
  initNav();
  initScrollState();
  initCardExpansion();
  initCopyToClipboard();
  initReveal();
  initCounters();
  initTypedText();
  initPipelineFlow();
  scrollToHash();
}

/**
 * ─── Deep link ────────────────────────────────────────────
 * As seções chegam depois do load, então o navegador não acha
 * o #id da URL sozinho; rola até ele manualmente.
 */
function scrollToHash() {
  if (!location.hash) return;
  const target = document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
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
            link.setAttribute('aria-current', 'true');
          }
        });
      }
    });
  }, { rootMargin: '-25% 0px -60%', threshold: 0 });

  sections.forEach(s => sectionObserver.observe(s));
}

/**
 * ─── Nav: fundo ao rolar + progresso de leitura ───────────
 */
function initScrollState() {
  const nav = document.querySelector('nav');
  const bar = document.querySelector('.scroll-progress');
  if (!nav) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
    bar?.style.setProperty('--scroll', progress.toFixed(4));
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/**
 * ─── Card Expansion (Mobile Accordion) ───────────────────
 * Adiciona botões de expansão/recolhimento para cards extensos no mobile
 */
function createToggle(label, controlsId, extraClass = '') {
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = `card-toggle-btn ${extraClass}`.trim();
  toggleBtn.setAttribute('aria-expanded', 'false');
  if (controlsId) toggleBtn.setAttribute('aria-controls', controlsId);
  toggleBtn.innerHTML = `
    <span>${label}</span>
    <svg class="toggle-icon" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
  `;
  return toggleBtn;
}

function initCardExpansion() {
  // 1. Experiências com muitos bullets
  document.querySelectorAll('.exp-item').forEach(card => {
    const bullets = card.querySelectorAll('.exp-bullets li');
    if (bullets.length <= 3) return;

    const bulletsList = card.querySelector('.exp-bullets');
    bullets.forEach((li, idx) => {
      if (idx >= 2) li.classList.add('bullet-extra');
    });

    const closedLabel = `Ver mais realizações (+${bullets.length - 2})`;
    const toggleBtn = createToggle(closedLabel, null, 'exp-toggle-btn');
    bulletsList.after(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('details-expanded');
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleBtn.querySelector('span').textContent = isExpanded ? 'Ocultar realizações adicionais' : closedLabel;
    });
  });

  // 2. Resumo (.about-text)
  const aboutText = document.querySelector('.about-text');
  if (aboutText) {
    const extraParagraphs = aboutText.querySelectorAll('p:nth-of-type(n+2), .about-pillars');
    if (extraParagraphs.length > 0) {
      extraParagraphs.forEach(el => el.classList.add('about-extra'));

      const closedLabel = 'Ver resumo completo';
      const toggleBtn = createToggle(closedLabel, null, 'about-toggle-btn');

      const firstP = aboutText.querySelector('p');
      if (firstP) {
        firstP.after(toggleBtn);
      } else {
        aboutText.prepend(toggleBtn);
      }

      toggleBtn.addEventListener('click', () => {
        const isExpanded = aboutText.classList.toggle('details-expanded');
        toggleBtn.setAttribute('aria-expanded', String(isExpanded));
        toggleBtn.querySelector('span').textContent = isExpanded ? 'Ocultar resumo' : closedLabel;
      });
    }
  }
}

/**
 * ─── Copy to Clipboard Toast ──────────────────────────────
 * Feedback visual instantâneo ao clicar em e-mail ou telefone
 */
function initCopyToClipboard() {
  const contactItems = document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]');
  const copyButtons = document.querySelectorAll('[data-copy]');
  if (!contactItems.length && !copyButtons.length) return;

  let toast = document.querySelector('.copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span class="copy-toast-msg">Copiado para a área de transferência!</span>
    `;
    document.body.appendChild(toast);
  }

  let toastTimer;

  // navigator.clipboard só existe em HTTPS; fora disso, cai no execCommand
  const writeClipboard = (text) => {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);

    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok ? Promise.resolve() : Promise.reject();
  };

  const copy = (textToCopy) => {
    return writeClipboard(textToCopy).then(() => {
      const msg = toast.querySelector('.copy-toast-msg');
      if (msg) msg.textContent = `"${textToCopy}" copiado!`;

      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    });
  };

  contactItems.forEach(item => {
    item.addEventListener('click', () => {
      let textToCopy = '';
      const href = item.getAttribute('href') || '';

      if (href.startsWith('mailto:')) {
        textToCopy = href.replace('mailto:', '').trim();
      } else if (href.startsWith('tel:')) {
        textToCopy = href.replace('tel:', '').replace('+55', '').trim();
      }

      if (!textToCopy) textToCopy = item.textContent.trim();
      copy(textToCopy).catch(() => {});
    });
  });

  // Botão "Copiar e-mail": para quem não usa cliente de e-mail no navegador
  copyButtons.forEach(btn => {
    const label = btn.querySelector('span');
    const original = label?.textContent;
    let labelTimer;

    btn.addEventListener('click', () => {
      copy(btn.dataset.copy).then(() => {
        if (!label) return;
        label.textContent = 'E-mail copiado';
        clearTimeout(labelTimer);
        labelTimer = setTimeout(() => { label.textContent = original; }, 2000);
      }).catch(() => {});
    });
  });
}

/**
 * ─── Reveal on scroll ─────────────────────────────────────
 * Marca .is-visible quando o elemento entra na tela; depois da
 * transição tira .reveal, para o hover dos cards voltar a animar.
 */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.remove('reveal'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);
      el.classList.add('is-visible');
      setTimeout(() => el.classList.remove('reveal', 'is-visible'), 1100);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(el => observer.observe(el));
}

/**
 * ─── Contadores ───────────────────────────────────────────
 * Os números de resultado (90k+, 100%) contam a partir de zero
 * quando entram na tela. O valor final já está no HTML.
 */
function initCounters() {
  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) return;

  const counters = [...document.querySelectorAll('.about-metric-value, .project-metrics strong')]
    .map(el => ({ el, match: el.textContent.trim().match(/^(\d+)(.*)$/) }))
    .filter(({ match }) => match && Number(match[1]) >= 10);
  if (!counters.length) return;

  const run = ({ el, match }) => {
    const target = Number(match[1]);
    const suffix = match[2];
    const start = performance.now();
    const duration = 1400;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      run(counters.find(c => c.el === entry.target));
    });
  }, { threshold: 0.6 });

  counters.forEach(counter => {
    // largura do valor final, para o sufixo não pular durante a contagem
    counter.el.style.minWidth = `${counter.el.getBoundingClientRect().width}px`;
    counter.el.textContent = `0${counter.match[2]}`;
    observer.observe(counter.el);
  });
}

/**
 * ─── Fluxo nos diagramas de pipeline ──────────────────────
 * A animação (projects.css) só roda enquanto o diagrama está na tela.
 */
function initPipelineFlow() {
  const pipelines = document.querySelectorAll('.pipeline');
  if (!pipelines.length || prefersReducedMotion.matches || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.target.classList.toggle('is-flowing', entry.isIntersecting));
  }, { threshold: 0.35 });

  pipelines.forEach(pipeline => observer.observe(pipeline));
}

/**
 * ─── Typed.js: Hero dynamic role ──────────────────────────
 * O cargo já vem escrito no HTML e fica na tela no carregamento;
 * depois o Typed apaga e alterna as frentes, voltando ao cargo
 * (com pausa maior) a cada volta. Leitores de tela leem o texto
 * fixo em .sr-only, não este.
 */
function initTypedText() {
  const el = document.getElementById('hero-typed-text');
  if (!el || typeof Typed === 'undefined' || prefersReducedMotion.matches) return;

  new Typed('#hero-typed-text', {
    strings: [
      'Lakehouse na AWS com Apache Iceberg',
      'Orquestração &amp; Pipelines em Alta Escala (+90k jobs)',
      'Infraestrutura Cloud &amp; IaC (AWS + Terraform)',
      'IA Aplicada, LLMs &amp; Agentes Autônomos',
      'Data Platform Engineer Pleno^1800'
    ],
    typeSpeed: 45,
    backSpeed: 25,
    backDelay: 2200,
    startDelay: 2600,
    loop: true,
    showCursor: false
  });
}

// ─── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSections);
