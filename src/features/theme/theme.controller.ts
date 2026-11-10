export function initializeTheme() {
  const key = 'kudasai:theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference: string | null = null;
  try {
    preference = localStorage.getItem(key);
  } catch {
    /* Storage is optional. */
  }
  const valid = (value: string | null) => value === 'dark' || value === 'light';
  const apply = (theme: string) => {
    root.dataset.theme = theme;
    const dark = theme === 'dark';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#201b2b' : '#fff5fa');
    document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
      button.hidden = false;
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    });
  };
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-theme-toggle]')) return;
    preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(preference);
    try {
      localStorage.setItem(key, preference);
    } catch {
      /* Keep the choice for this page. */
    }
  });
  system.addEventListener('change', () => {
    if (!valid(preference)) apply(system.matches ? 'dark' : 'light');
  });
  addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = event.newValue;
    apply(valid(preference) ? preference! : system.matches ? 'dark' : 'light');
  });
  apply(valid(preference) ? preference! : system.matches ? 'dark' : 'light');
}
