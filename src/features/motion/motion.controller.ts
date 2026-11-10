const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const desktopDepth = window.matchMedia('(min-width: 800px) and (pointer: fine)');
const ease = 'cubic-bezier(.18,.72,.22,1)';

export class SiteMotion extends HTMLElement {
  #events?: AbortController;
  #observer?: IntersectionObserver;
  #animations = new Set<Animation>();
  #seen = new WeakSet<Element>();
  #paused = false;
  #hero?: HTMLElement;
  #overlay?: HTMLElement;
  #introTimer?: ReturnType<typeof setTimeout>;
  #frame = 0;

  #enabled() {
    return !this.#paused && !reducedMotion.matches;
  }

  #animate(element: Element, frames: Keyframe[], duration = 850, delay = 0) {
    if (!this.#enabled()) return;
    const animation = element.animate(frames, { duration, delay, easing: ease, fill: 'backwards' });
    this.#animations.add(animation);
    void animation.finished
      .catch(() => undefined)
      .finally(() => this.#animations.delete(animation));
  }

  #finishIntro() {
    if (this.#introTimer) clearTimeout(this.#introTimer);
    if (this.#overlay?.contains(document.activeElement)) {
      this.#hero?.querySelector<HTMLAnchorElement>('.button')?.focus({ preventScroll: true });
    }
    if (this.#overlay) this.#overlay.hidden = true;
    if (document.documentElement.dataset.intro === 'running') {
      document.documentElement.dataset.intro = 'complete';
    }
  }

  #syncPolicy() {
    const enabled = this.#enabled();
    document.documentElement.dataset.motion = reducedMotion.matches
      ? 'reduced'
      : enabled
        ? 'enabled'
        : 'paused';
    document.documentElement.toggleAttribute('data-background', document.hidden);
    document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]').forEach((button) => {
      button.hidden = false;
      button.disabled = reducedMotion.matches;
      button.setAttribute('aria-pressed', String(!enabled));
      button.setAttribute(
        'aria-label',
        reducedMotion.matches
          ? 'Movimiento reducido del sistema'
          : enabled
            ? 'Pausar animaciones'
            : 'Activar animaciones',
      );
    });
    if (!enabled) {
      this.#animations.forEach((animation) => animation.cancel());
      this.#animations.clear();
      this.#finishIntro();
    }
    if (!enabled || document.hidden) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
    this.#requestDepth();
  }

  #requestDepth() {
    if (!this.#hero) return;
    if (!this.#enabled() || !desktopDepth.matches) {
      this.#hero.style.removeProperty('--hero-depth');
      return;
    }
    if (this.#frame || document.hidden || !this.#hero.hasAttribute('data-inview')) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#hero?.style.setProperty('--hero-depth', `${Math.min(window.scrollY * 0.12, 60)}px`);
    });
  }

  #reveal(element: Element) {
    if (this.#seen.has(element)) return;
    this.#seen.add(element);
    if (!this.#enabled()) return;
    if (element.hasAttribute('data-motion-scene')) {
      element.setAttribute('data-entered', '');
      const direction = element.classList.contains('character-loussiana') ? 1 : -1;
      const layers: [string, Keyframe[], number, number][] = [
        [
          '.character-art',
          [
            { opacity: 0.35, transform: 'scale(1.16)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          1700,
          0,
        ],
        [
          '.character-watermark',
          [
            { opacity: 0, transform: `translateX(${direction * 36}px)` },
            { opacity: 0.28, transform: 'translateX(0)' },
          ],
          1100,
          130,
        ],
        [
          '.character-copy .eyebrow',
          [
            { opacity: 0, transform: `translateX(${direction * 24}px)` },
            { opacity: 1, transform: 'translateX(0)' },
          ],
          750,
          240,
        ],
        [
          '.character-copy h3',
          [
            { opacity: 0, transform: 'translateY(30px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          950,
          380,
        ],
        [
          '.character-copy > p:last-child',
          [
            { opacity: 0, transform: 'translateY(22px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          850,
          550,
        ],
      ];
      for (const [selector, frames, duration, delay] of layers) {
        const layer = element.querySelector(selector);
        if (layer) this.#animate(layer, frames, duration, delay);
      }
      return;
    }
    const targets = element.matches('.story-copy, .section-heading')
      ? Array.from(element.children)
      : [element];
    targets.forEach((target, index) => {
      const x = element.matches('.story-visual') ? 32 : 0;
      this.#animate(
        target,
        [
          { opacity: 0, transform: `translate3d(${x}px,24px,0)` },
          { opacity: 1, transform: 'translate3d(0,0,0)' },
        ],
        900,
        Math.min(index * 95, 450),
      );
    });
  }

  connectedCallback() {
    this.#events?.abort();
    this.#observer?.disconnect();
    this.#events = new AbortController();
    const { signal } = this.#events;
    this.#hero = document.querySelector<HTMLElement>('.hero') ?? undefined;
    this.#overlay = this.querySelector<HTMLElement>('[data-opening-overlay]') ?? undefined;
    this.#syncPolicy();

    reducedMotion.addEventListener('change', () => this.#syncPolicy(), { signal });
    desktopDepth.addEventListener('change', () => this.#syncPolicy(), { signal });
    document.addEventListener('visibilitychange', () => this.#syncPolicy(), { signal });
    document.addEventListener(
      'click',
      (event) => {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest('[data-motion-toggle]')) {
          this.#paused = !this.#paused;
          this.#syncPolicy();
        }
        if (document.documentElement.dataset.intro === 'running') this.#finishIntro();
      },
      { signal },
    );
    document.addEventListener('keydown', () => this.#finishIntro(), { signal });
    window.addEventListener('scroll', () => this.#requestDepth(), { passive: true, signal });
    window.addEventListener('resize', () => this.#requestDepth(), { passive: true, signal });
    this.addEventListener(
      'animationend',
      (event) => {
        if (event.animationName === 'opening-curtain' && this.#overlay) this.#overlay.hidden = true;
      },
      { signal },
    );
    document.addEventListener(
      'animationend',
      (event) => {
        if (event.target instanceof Element && event.target.matches('[data-opening="action"]'))
          this.#finishIntro();
      },
      { signal },
    );

    // A short decorative opening, never a fake progress bar or asset-loading gate.
    if (
      this.#hero &&
      this.#overlay &&
      this.#enabled() &&
      window.scrollY < 20 &&
      (!location.hash || location.hash === '#inicio') &&
      performance.now() < 1800
    ) {
      this.#overlay.hidden = false;
      document.documentElement.dataset.intro = 'running';
      this.#introTimer = setTimeout(() => this.#finishIntro(), 2300);
    }

    if (!('IntersectionObserver' in window)) return;
    const topLink = document.querySelector<HTMLAnchorElement>('[data-scroll-top]');
    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target;
          if (element === this.#hero) {
            element.toggleAttribute('data-inview', entry.isIntersecting);
            if (topLink)
              topLink.hidden = entry.isIntersecting || entry.boundingClientRect.bottom > 0;
            this.#requestDepth();
          } else if (element.hasAttribute('data-motion-scene')) {
            element.toggleAttribute('data-inview', entry.isIntersecting);
            if (entry.isIntersecting) this.#reveal(element);
          } else if (entry.isIntersecting) {
            this.#observer?.unobserve(element);
            this.#reveal(element);
          }
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px 64px 0px' },
    );
    document
      .querySelectorAll('[data-reveal], [data-motion-scene], .hero')
      .forEach((element) => this.#observer?.observe(element));
  }

  disconnectedCallback() {
    this.#events?.abort();
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#animations.forEach((animation) => animation.cancel());
    this.#animations.clear();
    this.#finishIntro();
  }
}
