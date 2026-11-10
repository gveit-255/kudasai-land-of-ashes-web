import type { ImageMetadata } from 'astro';
import keyArt from './key-art.png';
import forest from './forest.png';
import alba from './alba.webp';
import cave from './cave.webp';
import caveDepths from './cave-depths.webp';
import council from './council.webp';
import inn from './inn.webp';
import dialogue from './dialogue.webp';
import urnao from './urnao.png';
import norte from './norte.png';
import akemi from './akemi.png';
import blackNeko from './black-neko.png';

export const images = {
  'key-art': keyArt,
  forest,
  alba,
  cave,
  'cave-depths': caveDepths,
  council,
  inn,
  dialogue,
  urnao,
  norte,
  akemi,
  'black-neko': blackNeko,
} satisfies Record<string, ImageMetadata>;

export type ImageName = keyof typeof images;
