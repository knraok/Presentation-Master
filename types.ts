
export enum SlideLayout {
  TITLE = 'TITLE',
  CONTENT = 'CONTENT',
  TWO_COLUMN = 'TWO_COLUMN',
  ACTIVITY = 'ACTIVITY',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CODE = 'CODE',
  QUIZ = 'QUIZ',
  SPEC = 'SPEC',
  COMPONENTS = 'COMPONENTS'
}

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type SlideAnimation = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom';
export type BackgroundAnimation = 'none' | 'pulse' | 'float' | 'zoom-slow' | 'pan-slow' | 'spin-slow';
export type CodeAnimationType = 'none' | 'typewriter' | 'fade' | 'slide-up';

export type SlideNumberPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
export type SlideNumberFormat = 'simple' | 'fraction' | 'prefix' | 'full';

export interface SlideContent {
  id: string;
  type: 'text' | 'bullet' | 'code' | 'image' | 'video' | 'quiz-option' | 'spec-item' | 'table-row';
  value: string;
  label?: string; 
  variant?: 'disc' | 'decimal' | 'square' | 'correct' | 'wrong';
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle: string;
  content: SlideContent[];
  notes: string;
  background: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundBlendMode?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundAnimation?: BackgroundAnimation;
  animation: SlideAnimation;
  codeAnimationType?: CodeAnimationType;
  codeAnimationSpeed?: number;
  order: number;
  titleSize: number;
  bodySize: number;
  fontWeight: 'normal' | 'bold' | 'black';
  letterSpacing: number; // in pixels or em, we'll use tracking (0 to 10)
  contentScale: number;
  fontFamily: string;
  lineHeight: 'tight' | 'normal' | 'loose';
  titleAlign: 'left' | 'center' | 'right';
  subtitleAlign: 'left' | 'center' | 'right';
  showSlideNumber: boolean;
  slideNumberPosition: SlideNumberPosition;
  slideNumberFormat: SlideNumberFormat;
  showBanner: boolean;
  bannerImage?: string;
  bannerHeight?: number;
  bannerOpacity?: number;
}

export interface Presentation {
  id: string;
  title: string;
  subtitle: string;
  aspectRatio: AspectRatio; // Global aspect ratio for the deck
  slides: Slide[];
  createdAt: string;
  updatedAt?: string;
  author: string;
}

export const GRADIENTS = [
  'bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900',
  'bg-gradient-to-br from-slate-900 to-slate-800',
  'bg-gradient-to-br from-emerald-900 to-teal-800',
  'bg-gradient-to-br from-rose-900 to-red-800',
  'bg-gradient-to-br from-cyan-900 to-blue-800',
  'bg-gradient-to-br from-violet-900 to-fuchsia-800'
];

export const FONTS = [
  { name: 'Inter Display', class: 'font-sans' },
  { name: 'JetBrains Mono', class: 'font-mono' },
  { name: 'Modern Serif', class: 'font-serif' }
];

export const LAYOUT_METADATA = {
  [SlideLayout.TITLE]: { icon: '📝', label: 'Heading Module' },
  [SlideLayout.CONTENT]: { icon: '📋', label: 'Tech Bulletins' },
  [SlideLayout.TWO_COLUMN]: { icon: '⚖️', label: 'Dual Analysis' },
  [SlideLayout.ACTIVITY]: { icon: '🎯', label: 'Lab Task' },
  [SlideLayout.IMAGE]: { icon: '🖼️', label: 'Media Lab' },
  [SlideLayout.VIDEO]: { icon: '🎥', label: 'Simulation' },
  [SlideLayout.CODE]: { icon: '💻', label: 'Logic Layer' },
  [SlideLayout.QUIZ]: { icon: '❓', label: 'Knowledge Check' },
  [SlideLayout.SPEC]: { icon: '🛠️', label: 'Hardware Specs' },
  [SlideLayout.COMPONENTS]: { icon: '📦', label: 'Components List' },
};

export const LINE_HEIGHT_OPTIONS = [
  { value: 'tight', label: 'Tight', class: 'leading-tight' },
  { value: 'normal', label: 'Normal', class: 'leading-normal' },
  { value: 'loose', label: 'Loose', class: 'leading-loose' },
];
