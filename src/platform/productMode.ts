export type ProductMode = 'basic' | 'full' | 'local';

export const PRODUCT_MODE: ProductMode = __PRODUCT_MODE__;
export const ADS_ENABLED = PRODUCT_MODE === 'full';
