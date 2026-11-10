/** Read current policy at the moment of interaction, including OS changes. */
export function allowsMotion(): boolean {
  return (
    document.documentElement.dataset.motion === 'enabled' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
