import { useState, useEffect } from 'react';

/** Returns the number of masonry columns based on viewport width. */
function getColCount() {
  if (typeof window === 'undefined') return 1;
  const w = window.innerWidth;
  return w >= 1024 ? 3 : w >= 768 ? 2 : 1;
}

export function useColumnCount(): number {
  const [cols, setCols] = useState(getColCount);
  useEffect(() => {
    const update = () => setCols(getColCount());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return cols;
}

/** Splits an array into N columns in interleaved order (0→col0, 1→col1, 2→col2, 3→col0 …). */
export function splitToColumns<T>(items: T[], numCols: number): T[][] {
  const cols: T[][] = Array.from({ length: numCols }, () => []);
  items.forEach((item, i) => cols[i % numCols].push(item));
  return cols;
}
