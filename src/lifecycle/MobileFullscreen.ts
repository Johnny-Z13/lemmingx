interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/**
 * Uses the first landscape tap to reclaim the browser chrome around the game.
 * Fullscreen APIs require a user gesture, so this cannot run on orientation
 * change alone. Unsupported/embedded browsers simply retain the fitted canvas.
 */
export function installMobileFullscreen(doc: FullscreenDocument = document): () => void {
  const root = doc.documentElement as FullscreenElement;
  const request = root.requestFullscreen
    ? () => root.requestFullscreen({ navigationUI: 'hide' })
    : root.webkitRequestFullscreen
      ? () => root.webkitRequestFullscreen?.()
      : null;

  if (!request) return () => {};

  const handlePointerUp = () => {
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      doc.removeEventListener('pointerup', handlePointerUp, true);
      return;
    }
    if (window.matchMedia('(orientation: portrait)').matches) return;

    doc.removeEventListener('pointerup', handlePointerUp, true);
    try {
      void Promise.resolve(request()).catch(() => {});
    } catch {
      // Fullscreen may be disallowed by an embedding host; FIT remains usable.
    }
  };

  doc.addEventListener('pointerup', handlePointerUp, true);
  return () => doc.removeEventListener('pointerup', handlePointerUp, true);
}
