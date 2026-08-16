/** Original, nonnumeric fuse language shared by both crew render paths. */
export const FUSE_WARNING_SEGMENTS = 5;

export function fuseUrgencySegments(fuseMs: number): number {
  return Math.max(1, Math.min(FUSE_WARNING_SEGMENTS, Math.ceil(fuseMs / 1000)));
}
