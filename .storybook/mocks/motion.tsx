import React from 'react';

const TAGS = [
  'div', 'span', 'aside', 'nav', 'header', 'footer', 'main', 'section',
  'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'button', 'form', 'input', 'img', 'svg', 'path', 'circle', 'rect', 'g',
  'article', 'figure', 'figcaption', 'label', 'select', 'textarea', 'table',
  'thead', 'tbody', 'tr', 'th', 'td',
];

type AnyProps = Record<string, unknown>;

const MOTION_PROPS = new Set([
  'animate', 'initial', 'exit', 'transition', 'variants', 'whileHover', 'whileTap',
  'whileFocus', 'whileInView', 'whileDrag', 'drag', 'dragConstraints', 'dragElastic',
  'dragMomentum', 'layout', 'layoutId', 'onAnimationStart', 'onAnimationComplete',
  'onUpdate', 'onDrag', 'onDragStart', 'onDragEnd', 'viewport', 'custom',
]);

export const motion = Object.fromEntries(
  TAGS.map(tag => [
    tag,
    React.forwardRef<HTMLElement, AnyProps>(({ children, ...props }: AnyProps, ref) => {
      const safeProps = Object.fromEntries(
        Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k))
      );
      return React.createElement(tag, { ...safeProps, ref }, children);
    }),
  ])
) as Record<string, React.ComponentType<AnyProps>>;

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function LazyMotion({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function MotionConfig({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export const m = motion;
export const useAnimation = () => ({ start: () => {}, stop: () => {}, set: () => {} });
export const useMotionValue = (initial: unknown) => ({
  get: () => initial,
  set: () => {},
  onChange: () => () => {},
});
export const useTransform = () => ({ get: () => 0 });
export const useSpring = (v: unknown) => ({ get: () => v, set: () => {} });
export const useScroll = () => ({ scrollY: { get: () => 0 }, scrollX: { get: () => 0 } });
export const useInView = () => false;
