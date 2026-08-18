export interface RendererRecoveryEvents {
  onLost: () => void;
  onRestored: () => void;
}

/** Keeps a lost WebGL context from becoming an unexplained blank portal frame. */
export function installRendererRecovery(
  canvas: HTMLCanvasElement,
  events: RendererRecoveryEvents,
): () => void {
  const root = document.createElement('div');
  root.className = 'renderer-recovery';
  root.hidden = true;
  root.innerHTML = `
    <section role="alert" aria-live="assertive">
      <span>Renderer interrupted</span>
      <strong>Restoring the rescue…</strong>
      <button type="button" hidden>Reload game</button>
    </section>`;
  const button = root.querySelector('button') as HTMLButtonElement;
  document.body.append(root);

  let restoreAttempted = false;
  let revealTimer: number | null = null;
  const onLost = (event: Event) => {
    event.preventDefault();
    root.hidden = false;
    button.hidden = true;
    events.onLost();
    if (!restoreAttempted) {
      restoreAttempted = true;
      window.setTimeout(() => {
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        gl?.getExtension('WEBGL_lose_context')?.restoreContext();
      }, 100);
    }
    revealTimer = window.setTimeout(() => {
      button.hidden = false;
      button.focus({ preventScroll: true });
    }, 5000);
  };
  const onRestored = () => {
    if (revealTimer !== null) window.clearTimeout(revealTimer);
    revealTimer = null;
    root.hidden = true;
    events.onRestored();
  };
  const onReload = () => window.location.reload();

  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  button.addEventListener('click', onReload);
  return () => {
    if (revealTimer !== null) window.clearTimeout(revealTimer);
    canvas.removeEventListener('webglcontextlost', onLost, false);
    canvas.removeEventListener('webglcontextrestored', onRestored, false);
    button.removeEventListener('click', onReload);
    root.remove();
  };
}
