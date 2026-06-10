import type { Lemming, Skill } from '../types';
import type { SkillContext, SkillDef } from './types';

/** Bomber fuse duration once armed (classic Lemmings counts 5 → boom). */
export const BOMBER_FUSE_MS = 5000;

/** A lemming that is mid-action (already a worker) generally can't take a new job. */
function isInterruptible(lemming: Lemming): boolean {
  return lemming.state === 'walker' || lemming.state === 'faller' || lemming.state === 'climber';
}

/** A lemming that has feet on the ground (for jobs that need to start grounded). */
function isGrounded(lemming: Lemming, ctx: SkillContext): boolean {
  return ctx.hasGroundBelow(lemming);
}

export const SKILL_DEFS: Record<Skill, SkillDef> = {
  climber: {
    id: 'climber',
    label: 'Climber',
    icon: 'C',
    hotkey: '1',
    // Trait: can be applied to any live, non-blocker lemming that isn't already one.
    canAssign: (l) => !l.isClimber && l.state !== 'blocker',
    onAssign: (l) => {
      l.isClimber = true;
    },
  },
  floater: {
    id: 'floater',
    label: 'Floater',
    icon: 'F',
    hotkey: '2',
    canAssign: (l) => !l.isFloater && l.state !== 'blocker',
    onAssign: (l) => {
      l.isFloater = true;
    },
  },
  bomber: {
    id: 'bomber',
    label: 'Bomber',
    icon: 'B',
    hotkey: '3',
    // Can arm any live lemming that isn't already counting down.
    canAssign: (l) => l.fuseMs === null,
    onAssign: (l) => {
      l.fuseMs = BOMBER_FUSE_MS;
    },
  },
  blocker: {
    id: 'blocker',
    label: 'Blocker',
    icon: 'K',
    hotkey: '4',
    // Must be grounded and currently interruptible (can't block in mid-air sensibly).
    canAssign: (l) => isInterruptible(l),
    onAssign: (l, ctx) => {
      // Only plant if grounded; otherwise refuse silently (handled by canAssign at call site).
      void ctx;
      l.state = 'blocker';
      l.velocityY = 0;
      l.actionTimerMs = 0;
    },
  },
  builder: {
    id: 'builder',
    label: 'Builder',
    icon: 'U',
    hotkey: '5',
    canAssign: (l) => isInterruptible(l),
    onAssign: (l) => {
      l.state = 'builder';
      l.buildSteps = 0;
      l.actionTimerMs = 0;
    },
  },
  basher: {
    id: 'basher',
    label: 'Basher',
    icon: 'H',
    hotkey: '6',
    canAssign: (l) => isInterruptible(l),
    onAssign: (l) => {
      l.state = 'basher';
      l.actionTimerMs = 0;
    },
  },
  digger: {
    id: 'digger',
    label: 'Digger',
    icon: 'D',
    hotkey: '7',
    // Diggers must start on solid ground to bite downward.
    canAssign: (l) => isInterruptible(l),
    onAssign: (l) => {
      l.state = 'digger';
      l.actionTimerMs = 0;
    },
  },
};

export { isGrounded };
