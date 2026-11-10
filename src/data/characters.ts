import type { ImageName } from '@/assets/images';

interface CharacterPortrait {
  id: string;
  name: string;
  image: ImageName;
  role: string;
  allegiance: string;
  description: string;
  alt: string;
}

export const characterPortraits = [
  {
    id: 'urnao',
    name: 'Urnao',
    image: 'urnao',
    role: 'Panadero · agente secreto',
    allegiance: 'Al servicio de Loussiana',
    description:
      'Tras el mostrador de la panadería, Urnao guarda otra identidad: la de agente secreto de Loussiana.',
    alt: 'Retrato de Urnao, de cabello castaño, ojos azules y camisa violeta con tirantes de cuero, sobre un fondo de papel con marco floral.',
  },
  {
    id: 'norte',
    name: 'Norte',
    image: 'norte',
    role: 'Mexicano · fanático de los coches',
    allegiance: 'Al servicio de Libu',
    description: 'Mexicano y fanático de los coches, Norte pone su lealtad al servicio de Libu.',
    alt: 'Retrato de Norte, de cabello plateado, ojos dorados y barba corta, con capa violeta y correa de cuero, sobre un fondo de papel con marco floral.',
  },
  {
    id: 'akemi',
    name: 'Akemi',
    image: 'akemi',
    role: 'Investigador · creador de pociones',
    allegiance: 'Investigaciones financiadas por Loussiana',
    description:
      'Akemi investiga y crea pociones como las Lágrimas de Eku. Loussiana financió sus investigaciones.',
    alt: 'Ilustración de Akemi, con cabello rubio, bata de laboratorio y un frasco de poción azul.',
  },
  {
    id: 'black-neko',
    name: 'Black neko',
    image: 'black-neko',
    role: 'El gato Judas',
    allegiance: 'Lealtad desconocida',
    description: 'El gato Judas: nunca se sabe de qué lado está Black neko.',
    alt: 'Ilustración de Black neko, un gato negro de ojos rojizos y mirada serena, sentado con la cola curvada.',
  },
] as const satisfies readonly CharacterPortrait[];
