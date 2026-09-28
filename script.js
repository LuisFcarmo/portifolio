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
  initCardExpansion();
  initCopyToClipboard();
  initTypedText();
  initTilt();
  initDataParticles();
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
  // 1. Projetos: decisões e resultado ficam recolhidos no mobile
  document.querySelectorAll('.project-card').forEach(card => {
    const details = card.querySelector('.project-details');
    if (!details) return;

    details.id = details.id || `${card.id}-details`;
    const closedLabel = 'Ver decisões de engenharia e resultado';
    const toggleBtn = createToggle(closedLabel, details.id);
    card.insertBefore(toggleBtn, details);

    toggleBtn.addEventListener('click', () => {
      const isExpanded = card.classList.toggle('details-expanded');
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleBtn.querySelector('span').textContent = isExpanded ? 'Ocultar detalhes' : closedLabel;
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
  if (!contactItems.length) return;

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

      if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const msg = toast.querySelector('.copy-toast-msg');
          if (msg) msg.textContent = `"${textToCopy}" copiado!`;

          toast.classList.add('show');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => {
            toast.classList.remove('show');
          }, 2000);
        }).catch(() => {});
      }
    });
  });
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
