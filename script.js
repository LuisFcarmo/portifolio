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
  initScrollState();
  initCardExpansion();
  initCopyToClipboard();
  initTypedText();
  initTilt();
  initDataParticles();
  initReveal();
  initCounters();
  initSpotlight();
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
  // 1. Projetos: decisões de engenharia ficam recolhidas em qualquer largura
  document.querySelectorAll('.project-card').forEach(card => {
    const details = card.querySelector('.project-details');
    if (!details) return;

    details.id = details.id || `${card.id}-details`;
    const closedLabel = 'Decisões de engenharia';
    const toggleBtn = createToggle(closedLabel, details.id, 'project-toggle-btn');
    card.insertBefore(toggleBtn, details);

    toggleBtn.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('details-expanded');
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleBtn.querySelector('span').textContent = isExpanded ? 'Ocultar decisões' : closedLabel;
    });
  });

  // 2. Experiências com muitos bullets
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

  // 3. Resumo (.about-text)
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
 * ─── Spotlight nos cards ──────────────────────────────────
 * Só com mouse: um brilho segue o cursor (estilo em components.css).
 */
function initSpotlight() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('.project-card, .exp-item, .edu-card, .article-card, .contact-link, .contact-intro, .pillar-card, .stack-table, .cta-band')
    .forEach(card => {
      card.classList.add('spotlight');
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
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
      'Orquestração &amp; Pipelines em Alta Escala (+90k jobs)',
      'Infraestrutura Cloud &amp; IaC (AWS + Terraform)',
      'Lakehouse na AWS com Apache Iceberg',
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

/**
 * ─── 3D Tilt: Terminal ────────────────────────────────────
 */
function initTilt() {
  if (typeof VanillaTilt === 'undefined' || prefersReducedMotion.matches) return;

  // Efeito 3D Tilt com brilho (glare) exclusivo para o Terminal do Hero
  const terminal = document.querySelector('.hero-terminal');
  if (terminal) {
    VanillaTilt.init(terminal, {
      max: 6,
      speed: 400,
      glare: true,
      'max-glare': 0.18,
      scale: 1.02
    });
  }
}

/**
 * ─── Canvas Data Graph Particles ─────────────────────────
 * Fundo de partículas com nós de dados e conexões.
 * Só anima enquanto o hero está visível e a aba está ativa;
 * com prefers-reduced-motion, desenha um quadro estático.
 */
function initDataParticles() {
  const canvas = document.getElementById('data-particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const heroSection = document.getElementById('hero');
  const particles = [];
  const mouse = { x: null, y: null, radius: 140 };
  const maxDist = 120;
  let width = 0;
  let height = 0;
  let rafId = null;
  let heroVisible = true;

  function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
    height = canvas.height = canvas.parentElement.offsetHeight || 600;
  }

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 1.6 + 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x -= (dx / dist) * force * 1.2;
          this.y -= (dy / dist) * force * 1.2;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(79, 140, 255, 0.5)';
      ctx.fill();
    }
  }

  function drawFrame(move) {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      if (move) particles[i].update();
      particles[i].draw();

      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.22;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(79, 140, 255, ${alpha})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    drawFrame(true);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId !== null || prefersReducedMotion.matches) return;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  resize();
  const particleCount = Math.min(Math.floor(width / 24), 40);
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  window.addEventListener('resize', () => {
    resize();
    if (rafId === null) drawFrame(false);
  });

  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    heroSection.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible && !document.hidden) start();
      else stop();
    }).observe(heroSection);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (heroVisible) start();
  });

  prefersReducedMotion.addEventListener?.('change', () => {
    if (prefersReducedMotion.matches) stop();
    else if (heroVisible && !document.hidden) start();
  });

  drawFrame(false);
  start();
}

// ─── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSections);
