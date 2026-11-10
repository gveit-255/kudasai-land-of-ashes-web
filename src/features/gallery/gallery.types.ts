import type { ImageName } from '@/assets/images';

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  image: ImageName;
  alt: string;
  category: 'juego' | 'arte';
  fit?: 'contain';
}

export type GalleryFilter = 'all' | GalleryItem['category'];
