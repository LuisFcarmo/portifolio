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
  initCardExpansion();
  initCopyToClipboard();
  initTypedText();
  initTilt();
  initDataParticles();
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

  // 3. Resumo Profissional (.about-text)
  const aboutText = document.querySelector('.about-text');
  if (aboutText) {
    const extraParagraphs = aboutText.querySelectorAll('p:nth-of-type(n+2), .about-pillars');
    if (extraParagraphs.length > 0) {
      extraParagraphs.forEach(el => el.classList.add('about-extra'));

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'card-toggle-btn about-toggle-btn';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = `
        <span>Ver resumo profissional completo</span>
        <svg class="toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      `;

      const firstP = aboutText.querySelector('p');
      if (firstP) {
        firstP.after(toggleBtn);
      } else {
        aboutText.prepend(toggleBtn);
      }

      toggleBtn.addEventListener('click', () => {
        const isExpanded = aboutText.classList.toggle('details-expanded');
        toggleBtn.setAttribute('aria-expanded', String(isExpanded));
        toggleBtn.querySelector('span').textContent = isExpanded 
          ? 'Ocultar resumo adicional' 
          : 'Ver resumo profissional completo';
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
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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
 */
function initTypedText() {
  const el = document.getElementById('hero-typed-text');
  if (!el || typeof Typed === 'undefined') return;

  new Typed('#hero-typed-text', {
    strings: [
      'Data Platform Engineer Pleno',
      'Orquestração &amp; Pipelines em Alta Escala (+90k jobs)',
      'Infraestrutura Cloud &amp; IaC (AWS + Terraform)',
      'IA Aplicada, LLMs &amp; Agentes Autônomos'
    ],
    typeSpeed: 45,
    backSpeed: 25,
    backDelay: 2200,
    startDelay: 400,
    loop: true,
    showCursor: false
  });
}

/**
 * ─── 3D Tilt: Terminal & Project cards ────────────────────
 */
function initTilt() {
  if (typeof VanillaTilt === 'undefined') return;

  // Efeito 3D Tilt com brilho (glare) exclusivo para o Terminal do Hero
  const terminal = document.querySelector('.hero-terminal');
  if (terminal) {
    VanillaTilt.init(terminal, {
      max: 6,
      speed: 400,
      glare: true,
      "max-glare": 0.18,
      scale: 1.02
    });
  }
}

/**
 * ─── Canvas Data Graph Particles ─────────────────────────
 * Fundo de partículas com nós de dados e conexões em tempo real
 */
function initDataParticles() {
  const canvas = document.getElementById('data-particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = canvas.parentElement.offsetWidth || window.innerWidth);
  let height = (canvas.height = canvas.parentElement.offsetHeight || 600);

  const particles = [];
  const particleCount = Math.min(Math.floor(width / 24), 40);
  const mouse = { x: null, y: null, radius: 140 };

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
    height = canvas.height = canvas.parentElement.offsetHeight || 600;
  });

  const heroSection = document.getElementById('hero');
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
        if (dist < mouse.radius) {
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

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120;

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

    requestAnimationFrame(animate);
  }

  animate();
}

// ─── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSections);
