import { allowsMotion } from '@/lib/motion';

export class MediaGallery extends HTMLElement {
  #events?: AbortController;
  #animations = new Set<Animation>();

  connectedCallback() {
    this.#events?.abort();
    this.#events = new AbortController();
    const { signal } = this.#events;
    const dialog = this.querySelector<HTMLDialogElement>('dialog');
    const image = this.querySelector<HTMLImageElement>('.lightbox-image');
    const title = this.querySelector<HTMLElement>('#lightbox-title');
    const status = this.querySelector<HTMLElement>('[data-media-status]');
    if (!dialog || !image || !title || !status) return;
    this.dataset.enhanced = '';
    let trigger: HTMLAnchorElement | undefined;
    const animate = (element: Element, delay = 0) => {
      if (!allowsMotion()) return;
      const animation = element.animate(
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 280, delay, easing: 'ease-out' },
      );
      this.#animations.add(animation);
      void animation.finished
        .then(() => this.#animations.delete(animation))
        .catch(() => this.#animations.delete(animation));
    };
    const filters = this.querySelectorAll<HTMLButtonElement>('[data-filter]');
    const items = this.querySelectorAll<HTMLElement>('.gallery-item');
    filters.forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          this.#animations.forEach((animation) => animation.cancel());
          this.#animations.clear();
          filters.forEach((filter) =>
            filter.setAttribute('aria-pressed', String(filter === button)),
          );
          let visible = 0;
          items.forEach((item) => {
            const wasHidden = item.hidden;
            item.hidden =
              button.dataset.filter !== 'all' && item.dataset.category !== button.dataset.filter;
            if (!item.hidden) {
              if (wasHidden) animate(item, Math.min(visible * 35, 140));
              visible++;
            }
          });
          const count = this.querySelector('[data-gallery-count]');
          if (count) count.textContent = `${visible} ${visible === 1 ? 'imagen' : 'imágenes'}`;
        },
        { signal },
      ),
    );

    this.querySelectorAll<HTMLAnchorElement>('.gallery-open').forEach((link) =>
      link.addEventListener(
        'click',
        (event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          trigger = link;
          title.textContent = link.dataset.title ?? '';
          status.textContent = '';
          image.alt = link.dataset.alt ?? '';
          image.src = link.href;
          dialog.showModal();
          animate(dialog);
        },
        { signal },
      ),
    );
    image.addEventListener(
      'error',
      () => {
        if (dialog.open) status.textContent = 'No se ha podido cargar la imagen.';
      },
      { signal },
    );
    this.querySelector('.lightbox-close')?.addEventListener('click', () => dialog.close(), {
      signal,
    });
    dialog.addEventListener(
      'click',
      (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          dialog.close();
      },
      { signal },
    );
    dialog.addEventListener(
      'close',
      () => {
        image.removeAttribute('src');
        trigger?.focus();
      },
      { signal },
    );
  }

  disconnectedCallback() {
    this.#events?.abort();
    this.#animations.forEach((animation) => animation.cancel());
    this.#animations.clear();
  }
}
