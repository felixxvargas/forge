'use client';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, type SpringOptions } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import './Dock.css';

interface DockItemData {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

interface DockItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
  isHovered?: ReturnType<typeof useMotionValue<number>>;
  active?: boolean;
  activeColor?: string;
}

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize, active, activeColor }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  const activeStyle = active && activeColor ? {
    backgroundColor: activeColor + '26',
    borderColor: activeColor + '66',
  } : undefined;

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size, ...activeStyle }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, child => cloneElement(child as React.ReactElement<{ isHovered: typeof isHovered }>, { isHovered }))}
    </motion.div>
  );
}

export function DockLabel({ children, className = '', ...rest }: { children: React.ReactNode; className?: string; isHovered?: ReturnType<typeof useMotionValue<number>> }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', latest => setIsVisible(latest === 1));
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' } as any}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DockIcon({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`dock-icon ${className}`} style={style}>{children}</div>;
}

interface DockProps {
  items: DockItemData[];
  className?: string;
  spring?: SpringOptions;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  dockHeight?: number;
  baseItemSize?: number;
  activeColor?: string;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  activeColor,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height, scrollbarWidth: 'none' } as any} className="dock-outer">
      <motion.div
        onMouseMove={({ pageX }) => { isHovered.set(1); mouseX.set(pageX); }}
        onMouseLeave={() => { isHovered.set(0); mouseX.set(Infinity); }}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Game navigation"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.active ? 'dock-item-active' : ''}
            active={item.active}
            activeColor={activeColor}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon style={item.active && activeColor ? { color: activeColor } : undefined}>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
