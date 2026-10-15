/**
 * Central Typed Image Registry for LAUNDELLE
 *
 * Provides deterministic Cloudinary delivery URLs with WebP (f_auto, q_auto)
 * and seamless fallback to verified local paths.
 */

export interface ImageAssetMeta {
  publicId: string;
  localPath: string;
  width: number;
  height: number;
  alt: string;
}

export const LAUNDELLE_IMAGES = {
  // Brand & Illustrations
  logo: {
    publicId: 'laundelle/branding/laundelle-logo',
    localPath: '/Laundelle-Logo.png',
    width: 1254,
    height: 1254,
    alt: 'Laundelle brand logo',
  },
  heroRight: {
    publicId: 'laundelle/hero/laundelle-hero-right',
    localPath: '/laundelle-hero-right.png',
    width: 1308,
    height: 1214,
    alt: 'Laundelle garment care specialist with pristine folded laundry',
  },
  postcodeDriver: {
    publicId: 'laundelle/illustrations/postcode-driver-illustration',
    localPath: '/postcode-driver-illustration.png',
    width: 1254,
    height: 1254,
    alt: 'Laundelle professional driver collection illustration',
  },
  aiGirlFace: {
    publicId: 'laundelle/services/ai-girl-face',
    localPath: '/Images/AI Girl Face.png',
    width: 1254,
    height: 1254,
    alt: 'Laundelle AI Concierge avatar',
  },

  // Auth Portals
  customerAuthHero: {
    publicId: 'laundelle/auth/customer-auth-hero',
    localPath: '/assets/customer-auth-hero.jpg',
    width: 1122,
    height: 1402,
    alt: 'Laundelle customer portal sign-in background',
  },
  managerAuthHero: {
    publicId: 'laundelle/auth/manager-auth-hero',
    localPath: '/assets/manager-auth-hero.jpg',
    width: 1122,
    height: 1402,
    alt: 'Laundelle operations manager portal sign-in background',
  },
  adminAuthHero: {
    publicId: 'laundelle/auth/admin-auth-hero',
    localPath: '/assets/admin-auth-hero.jpg',
    width: 1122,
    height: 1402,
    alt: 'Laundelle administrator portal sign-in background',
  },

  // Support & Service Heroes
  supportAgent: {
    publicId: 'laundelle/assets/support-agent',
    localPath: '/assets/support-agent.jpg',
    width: 896,
    height: 1200,
    alt: 'Laundelle dedicated customer support concierge',
  },
  servicesHero: {
    publicId: 'laundelle/hero/services-hero',
    localPath: '/assets/services-hero.png',
    width: 1024,
    height: 532,
    alt: 'Laundelle state-of-the-art facility services hero',
  },
  subscriptionHeroTowels: {
    publicId: 'laundelle/hero/subscription-hero-towels',
    localPath: '/assets/subscription-hero-towels.jpg',
    width: 1200,
    height: 896,
    alt: 'Laundelle hotel quality subscription towels and linens',
  },

  // Before / After Gallery
  galleryShirtBefore: {
    publicId: 'laundelle/gallery/gallery-shirt-before',
    localPath: '/assets/gallery-shirt-before.jpg',
    width: 1312,
    height: 1199,
    alt: 'Formal shirt before stain removal treatment',
  },
  galleryShirtAfter: {
    publicId: 'laundelle/gallery/gallery-shirt-after',
    localPath: '/assets/gallery-shirt-after.jpg',
    width: 1312,
    height: 1199,
    alt: 'Formal shirt after specialist stain removal and steam pressing',
  },
  gallerySneakersBefore: {
    publicId: 'laundelle/gallery/gallery-sneakers-before',
    localPath: '/assets/gallery-sneakers-before.jpg',
    width: 1312,
    height: 1199,
    alt: 'Luxury sneakers before deep restoration treatment',
  },
  gallerySneakersAfter: {
    publicId: 'laundelle/gallery/gallery-sneakers-after',
    localPath: '/assets/gallery-sneakers-after.jpg',
    width: 1312,
    height: 1199,
    alt: 'Luxury sneakers after deep restoration treatment',
  },
  gallerySilkBefore: {
    publicId: 'laundelle/gallery/gallery-silk-before',
    localPath: '/assets/gallery-silk-before.jpg',
    width: 1312,
    height: 1199,
    alt: 'Delicate silk garment before restorative clean',
  },
  gallerySilkAfter: {
    publicId: 'laundelle/gallery/gallery-silk-after',
    localPath: '/assets/gallery-silk-after.jpg',
    width: 1312,
    height: 1199,
    alt: 'Delicate silk garment after restorative clean and hand finishing',
  },
} as const;

export const LAUNDELLE_SERVICE_IMAGES: Record<string, ImageAssetMeta> = {
  'Basic Alterations & Repairs': {
    publicId: 'laundelle/services/basic-alterations-repairs',
    localPath: '/Images/Basic Alterations & Repairs.png',
    width: 1536,
    height: 1024,
    alt: 'Basic Alterations & Repairs',
  },
  'Curtains & Heavy Drapes': {
    publicId: 'laundelle/services/curtains-heavy-drapes',
    localPath: '/Images/Curtains & Heavy Drapes.png',
    width: 1536,
    height: 1024,
    alt: 'Curtains & Heavy Drapes',
  },
  'Duvets & Bulky Bedding': {
    publicId: 'laundelle/services/duvets-bulky-bedding',
    localPath: '/Images/Duvets & Bulky Bedding.png',
    width: 1536,
    height: 1024,
    alt: 'Duvets & Bulky Bedding',
  },
  'Express Same-Day Service': {
    publicId: 'laundelle/services/express-same-day-service',
    localPath: '/Images/Express Same-Day Service.png',
    width: 1536,
    height: 1024,
    alt: 'Express Same-Day Service',
  },
  'Leather & Suede Jackets': {
    publicId: 'laundelle/services/leather-suede-jackets',
    localPath: '/Images/Leather & Suede Jackets.png',
    width: 1536,
    height: 1024,
    alt: 'Leather & Suede Jackets',
  },
  'Pet Beds & Blankets': {
    publicId: 'laundelle/services/pet-beds-blankets',
    localPath: '/Images/Pet Beds & Blankets.png',
    width: 1536,
    height: 1024,
    alt: 'Pet Beds & Blankets',
  },
  'Silk & Delicates Care': {
    publicId: 'laundelle/services/silk-delicates-care',
    localPath: '/Images/Silk & Delicates Care.png',
    width: 1536,
    height: 1024,
    alt: 'Silk & Delicates Care',
  },
  'Sneaker & Shoe Deep Clean': {
    publicId: 'laundelle/services/sneaker-shoe-deep-clean',
    localPath: '/Images/Sneaker & Shoe Deep Clean.png',
    width: 1536,
    height: 1024,
    alt: 'Sneaker & Shoe Deep Clean',
  },
  'Sports & Activewear': {
    publicId: 'laundelle/services/sports-activewear',
    localPath: '/Images/Sports & Activewear.png',
    width: 1536,
    height: 1024,
    alt: 'Sports & Activewear',
  },
  'Steam Ironing & Pressing': {
    publicId: 'laundelle/services/steam-ironing-pressing',
    localPath: '/Images/Steam Ironing & Pressing.png',
    width: 1536,
    height: 1024,
    alt: 'Steam Ironing & Pressing',
  },
  'Suit & Jacket Dry Cleaning': {
    publicId: 'laundelle/services/suit-jacket-dry-cleaning',
    localPath: '/Images/Suit & Jacket Dry Cleaning.png',
    width: 1536,
    height: 1024,
    alt: 'Suit & Jacket Dry Cleaning',
  },
  'Wash + Dry + Fold': {
    publicId: 'laundelle/services/wash-dry-fold',
    localPath: '/Images/Wash + Dry + Fold.png',
    width: 1536,
    height: 1024,
    alt: 'Wash + Dry + Fold',
  },
  'Wash + Steam Iron': {
    publicId: 'laundelle/services/wash-steam-iron',
    localPath: '/Images/Wash + Steam Iron.png',
    width: 1536,
    height: 1024,
    alt: 'Wash + Steam Iron',
  },
  'Wedding Dress Preservation': {
    publicId: 'laundelle/services/wedding-dress-preservation',
    localPath: '/Images/Wedding Dress Preservation.png',
    width: 1536,
    height: 1024,
    alt: 'Wedding Dress Preservation',
  },
};

/**
 * Resolves an image to its optimized Cloudinary URL (with f_auto, q_auto WebP delivery)
 * or falls back to localPath if Cloudinary is not yet active.
 */
export function getOptimizedImageUrl(
  asset: ImageAssetMeta,
  options?: { width?: number; height?: number; quality?: number | string; format?: string; crop?: string }
): string {
  const env = typeof globalThis !== 'undefined' ? (globalThis as any).process?.env : undefined;
  const cloudName = env?.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || env?.CLOUDINARY_CLOUD_NAME || 'b2st53lu';

  if (cloudName && asset.publicId) {
    const format = options?.format ? `f_${options.format}` : 'f_auto';
    const quality = options?.quality ? `q_${options.quality}` : 'q_auto';
    const transforms = [format, quality];
    if (options?.width) transforms.push(`w_${options.width}`);
    if (options?.height) transforms.push(`h_${options.height}`);
    if (options?.crop) transforms.push(`c_${options.crop}`);
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${asset.publicId}`;
  }

  return asset.localPath;
}
