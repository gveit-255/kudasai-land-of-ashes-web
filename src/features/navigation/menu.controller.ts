export class SiteNavigation extends HTMLElement {
  #events?: AbortController;

  connectedCallback() {
    this.#events?.abort();
    this.#events = new AbortController();
    const { signal } = this.#events;
    const button = this.querySelector<HTMLButtonElement>('.menu-toggle');
    const navigation = this.querySelector<HTMLElement>('nav');
    if (!button || !navigation) return;
    this.dataset.enhanced = '';
    button.hidden = false;
    const close = (returnFocus = false) => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Abrir menú');
      navigation.removeAttribute('data-open');
      if (returnFocus) button.focus();
    };
    button.addEventListener(
      'click',
      () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        navigation.toggleAttribute('data-open', open);
      },
      { signal },
    );
    this.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Element && event.target.closest('a')) close();
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') close(true);
      },
      { signal },
    );
    window.matchMedia('(max-width: 600px)').addEventListener('change', () => close(), { signal });
  }

  disconnectedCallback() {
    this.#events?.abort();
  }
}
