'use client';

import {
  Children,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

const GAP = 20;

/**
 * Cards of different heights (16:9 videos, 9:16 Shorts) in columns with no
 * holes. Each card goes to the shortest column, so the order still reads
 * left to right, top to bottom. `heights` is each card's height in column
 * widths, in the same order as the children.
 */
export function MasonryGrid({
  children,
  heights,
  minColumnWidth = 210,
}: {
  children: ReactNode;
  heights: number[];
  minColumnWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setColumns(
        Math.max(
          1,
          Math.floor((element.clientWidth + GAP) / (minColumnWidth + GAP)),
        ),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minColumnWidth]);

  const stacks = Array.from({ length: columns }, () => ({
    height: 0,
    nodes: [] as ReactNode[],
  }));
  Children.toArray(children).forEach((node, index) => {
    const shortest = stacks.reduce((best, stack) =>
      stack.height < best.height ? stack : best,
    );
    shortest.nodes.push(node);
    shortest.height += heights[index] ?? 1;
  });

  return (
    <div ref={ref} className="flex items-start" style={{ gap: GAP }}>
      {stacks.map((stack, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: GAP }}
        >
          {stack.nodes}
        </div>
      ))}
    </div>
  );
}
