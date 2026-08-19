import { IS_MOBILE_DEVICE } from '../deviceProfile';
import { isEmbeddedBrowser } from '../platform/PlatformAdapter';
import { IS_PLAYER_EXPERIENCE } from '../runtimeMode';

export interface MobileOrientationPolicyInput {
  readonly playerExperience: boolean;
  readonly mobileDevice: boolean;
  readonly embedded: boolean;
}

/** Direct mobile launches own the rotate gate; embedded hosts own their frame. */
export function shouldGameOwnMobileOrientation(input: MobileOrientationPolicyInput): boolean {
  return input.playerExperience
    && input.mobileDevice
    && !input.embedded;
}

export const GAME_OWNS_MOBILE_ORIENTATION = shouldGameOwnMobileOrientation({
  playerExperience: IS_PLAYER_EXPERIENCE,
  mobileDevice: IS_MOBILE_DEVICE,
  embedded: isEmbeddedBrowser(),
});
