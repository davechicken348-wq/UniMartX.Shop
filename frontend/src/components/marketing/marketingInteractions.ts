const motionTargets = [
  'main > section:not(.hero-carousel)',
  'main .section-heading',
  'main .category',
  'main .step-grid > article',
  'main .value-grid > article',
  'main .story-art',
  'main .story-copy',
  'main .contact-note',
  'main .contact-form',
  'main .faq-list > details',
  'main .faq-contact',
  '.footer-main > *',
].join(',');

export function initMarketingInteractions() {
  const body = document.body;
  const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.querySelector<HTMLElement>('.nav-links');
  const cleanups: Array<() => void> = [];

  const closeMenu = () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    nav?.classList.remove('is-open');
    body.classList.remove('menu-open');
  };

  if (menuButton && nav) {
    const toggleMenu = () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      nav.classList.toggle('is-open', !isOpen);
      body.classList.toggle('menu-open', !isOpen);
    };
    menuButton.addEventListener('click', toggleMenu);
    nav.addEventListener('click', closeMenu);
    cleanups.push(() => {
      menuButton.removeEventListener('click', toggleMenu);
      nav.removeEventListener('click', closeMenu);
      closeMenu();
    });
  }

  if (!body.dataset.theme) {
    if (document.querySelector('.story-panel')) body.dataset.theme = 'clay';
    else if (document.querySelector('.contact-layout')) body.dataset.theme = 'signal';
    else if (document.querySelector('.faq-list')) body.dataset.theme = 'form';
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('motion-in');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
    const revealItems = [...document.querySelectorAll<HTMLElement>(motionTargets)];
    const siblings = new Map<Element, number>();
    revealItems.forEach((element) => {
      const parent = element.parentElement;
      const order = parent ? siblings.get(parent) || 0 : 0;
      if (parent) siblings.set(parent, order + 1);
      element.dataset.motion = 'rise';
      element.style.setProperty('--motion-delay', `${Math.min(order, 5) * 75}ms`);
      observer.observe(element);
    });
    document.documentElement.classList.add('motion-ready');
    cleanups.push(() => {
      observer.disconnect();
      document.documentElement.classList.remove('motion-ready');
      revealItems.forEach((element) => {
        element.classList.remove('motion-in');
        delete element.dataset.motion;
        element.style.removeProperty('--motion-delay');
      });
    });
  }

  const carousel = document.querySelector<HTMLElement>('.hero-carousel');
  if (carousel) {
    const slides = [...carousel.querySelectorAll<HTMLElement>('.hero-slide')];
    const dots = [...carousel.querySelectorAll<HTMLButtonElement>('.carousel-dot')];
    const previous = carousel.querySelector<HTMLButtonElement>('.carousel-prev');
    const next = carousel.querySelector<HTMLButtonElement>('.carousel-next');
    const pauseButton = carousel.querySelector<HTMLButtonElement>('.carousel-pause');
    const themes = ['form', 'clay', 'signal', 'groove', 'claystore', 'lucko'];
    let activeIndex = 0;
    let timer = 0;
    let paused = false;

    const showSlide = (index: number) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === activeIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === activeIndex;
        dot.classList.toggle('is-active', active);
        if (active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      body.dataset.theme = themes[activeIndex];
      carousel.dataset.theme = slides[activeIndex].classList.contains('hero-slide--campus') ? 'dark' : 'light';
    };
    const startTimer = () => {
      window.clearInterval(timer);
      if (!paused && !document.hidden) timer = window.setInterval(() => showSlide(activeIndex + 1), 7000);
    };
    const onPrevious = () => { showSlide(activeIndex - 1); startTimer(); };
    const onNext = () => { showSlide(activeIndex + 1); startTimer(); };
    const onPause = () => {
      paused = !paused;
      pauseButton?.setAttribute('aria-pressed', String(paused));
      pauseButton?.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      if (pauseButton) pauseButton.textContent = paused ? '▶' : 'Ⅱ';
      startTimer();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onPrevious();
      if (event.key === 'ArrowRight') onNext();
    };
    const onVisibility = () => startTimer();
    const dotHandlers = dots.map((dot, index) => {
      const handler = () => { showSlide(index); startTimer(); };
      dot.addEventListener('click', handler);
      return () => dot.removeEventListener('click', handler);
    });

    previous?.addEventListener('click', onPrevious);
    next?.addEventListener('click', onNext);
    pauseButton?.addEventListener('click', onPause);
    carousel.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    showSlide(0);
    startTimer();
    cleanups.push(() => {
      window.clearInterval(timer);
      dotHandlers.forEach((remove) => remove());
      previous?.removeEventListener('click', onPrevious);
      next?.removeEventListener('click', onNext);
      pauseButton?.removeEventListener('click', onPause);
      carousel.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  return () => cleanups.reverse().forEach((cleanup) => cleanup());
}
