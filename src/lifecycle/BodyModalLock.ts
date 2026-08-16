interface ElementState {
  readonly inert: boolean;
  readonly ariaHidden: string | null;
  readonly owners: Set<symbol>;
}

const elementStates = new WeakMap<HTMLElement, ElementState>();
const activeLocks = new Set<BodyModalLock>();

function restoreElement(element: HTMLElement, state: ElementState): void {
  element.inert = state.inert;
  if (state.ariaHidden === null) element.removeAttribute('aria-hidden');
  else element.setAttribute('aria-hidden', state.ariaHidden);
}

/** Reference-counted body sibling inerting for overlapping modal surfaces. */
export class BodyModalLock {
  private readonly owner = Symbol('body-modal');
  private readonly elements = new Set<HTMLElement>();
  private readonly observer: MutationObserver;
  private released = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly allow: (element: HTMLElement) => boolean = () => false,
  ) {
    activeLocks.add(this);
    for (const child of Array.from(document.body.children)) {
      if (child instanceof HTMLElement) this.lock(child);
    }
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLElement) this.lock(node);
        }
      }
    });
    this.observer.observe(document.body, { childList: true });
  }

  lock(element: HTMLElement): void {
    if (this.released || element === this.root || this.allow(element) || this.elements.has(element)) return;
    let state = elementStates.get(element);
    if (!state) {
      state = {
        inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'),
        owners: new Set(),
      };
      elementStates.set(element, state);
    }
    state.owners.add(this.owner);
    this.elements.add(element);
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
  }

  release(): void {
    if (this.released) return;
    this.released = true;
    this.observer.disconnect();
    activeLocks.delete(this);
    for (const element of this.elements) {
      const state = elementStates.get(element);
      if (!state) continue;
      state.owners.delete(this.owner);
      if (state.owners.size === 0) {
        restoreElement(element, state);
        elementStates.delete(element);
      }
    }
    this.elements.clear();
  }
}

/** Immediately includes a new body child in every already-active parent modal. */
export function registerBodyModalChild(element: HTMLElement): void {
  for (const lock of activeLocks) lock.lock(element);
}
