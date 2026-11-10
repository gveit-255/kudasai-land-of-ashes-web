type DemoMessage = { channel?: string; type?: string };

export class DemoPlayer extends HTMLElement {
  #events?: AbortController;
  #frame?: HTMLIFrameElement;
  #timeout?: ReturnType<typeof setTimeout>;

  connectedCallback() {
    this.#events?.abort();
    this.#events = new AbortController();
    const { signal } = this.#events;
    const stage = this.querySelector<HTMLElement>('[data-demo-stage]');
    const poster = this.querySelector<HTMLElement>('[data-demo-poster]');
    const host = this.querySelector<HTMLElement>('[data-demo-frame]');
    const start = this.querySelector<HTMLAnchorElement>('[data-demo-start]');
    const status = this.querySelector<HTMLElement>('[data-demo-status]');
    const fullscreen = this.querySelector<HTMLButtonElement>('[data-demo-fullscreen]');
    const stop = this.querySelector<HTMLButtonElement>('[data-demo-stop]');
    if (!stage || !poster || !host || !start || !status || !fullscreen || !stop) return;

    const close = () => {
      clearTimeout(this.#timeout);
      if (document.fullscreenElement === stage) void document.exitFullscreen().catch(() => {});
      this.#frame?.remove();
      this.#frame = undefined;
      poster.hidden = false;
      stage.removeAttribute('aria-busy');
      start.hidden = false;
      start.textContent = 'Jugar demo ▷';
      fullscreen.hidden = stop.hidden = true;
      status.textContent = 'Demo cerrada. Tus partidas guardadas permanecen en este navegador.';
      start.focus();
    };
    const failed = () => {
      close();
      status.textContent =
        'No se pudo cargar la demo. Comprueba tu conexión y vuelve a intentarlo.';
      start.textContent = 'Reintentar ▷';
    };
    start.addEventListener(
      'click',
      (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (this.#frame) return;
        stage.setAttribute('aria-busy', 'true');
        status.textContent =
          'Cargando Kudasai… Los escenarios se descargarán a medida que juegues.';
        start.hidden = true;
        stop.hidden = false;
        const frame = document.createElement('iframe');
        frame.title = 'Kudasai: Land of Ashes — demo jugable';
        frame.allow = 'autoplay; fullscreen; gamepad';
        frame.allowFullscreen = true;
        frame.src = start.href;
        this.#frame = frame;
        host.append(frame);
        this.#timeout = setTimeout(() => {
          status.textContent =
            'La carga está tardando. Puedes esperar o cerrar la demo y volver a intentarlo.';
        }, 45_000);
      },
      { signal },
    );

    window.addEventListener(
      'message',
      (event: MessageEvent<DemoMessage>) => {
        if (
          event.origin !== location.origin ||
          !this.#frame ||
          event.source !== this.#frame.contentWindow ||
          event.data?.channel !== 'kudasai-demo'
        )
          return;
        if (event.data.type === 'ready') {
          clearTimeout(this.#timeout);
          poster.hidden = true;
          stage.removeAttribute('aria-busy');
          fullscreen.hidden = !document.fullscreenEnabled;
          status.textContent =
            'Demo en marcha. Haz clic dentro del juego para usar el teclado y activar el sonido.';
          stage.scrollIntoView({ block: 'center' });
          this.#frame.focus({ preventScroll: true });
        } else if (event.data.type === 'exit') close();
        else if (event.data.type === 'error') failed();
      },
      { signal },
    );
    stop.addEventListener('click', close, { signal });
    fullscreen.addEventListener(
      'click',
      () => {
        const request =
          document.fullscreenElement === stage
            ? document.exitFullscreen()
            : stage.requestFullscreen();
        void request
          .then(() => this.#frame?.focus())
          .catch(() => {
            status.textContent =
              'Tu navegador no permite pantalla completa. Puedes seguir jugando aquí.';
          });
      },
      { signal },
    );
    document.addEventListener(
      'fullscreenchange',
      () => {
        fullscreen.textContent =
          document.fullscreenElement === stage
            ? 'Salir de pantalla completa ↙'
            : 'Pantalla completa ↗';
      },
      { signal },
    );
  }

  disconnectedCallback() {
    this.#events?.abort();
    clearTimeout(this.#timeout);
    this.#frame?.remove();
    this.#frame = undefined;
  }
}
