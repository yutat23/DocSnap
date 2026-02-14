"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export type Point = { x: number; y: number };

type CornerEditorProps = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  corners: [Point, Point, Point, Point];
  onCornersChange: (corners: [Point, Point, Point, Point]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const CORNER_LABELS = ["左上", "右上", "右下", "左下"];

function getDefaultCorners(width: number, height: number): [Point, Point, Point, Point] {
  const margin = Math.min(width, height) * 0.05;
  return [
    { x: margin, y: margin },
    { x: width - margin, y: margin },
    { x: width - margin, y: height - margin },
    { x: margin, y: height - margin },
  ];
}

export function CornerEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  corners,
  onCornersChange,
  containerRef,
}: CornerEditorProps) {
  const [displayCorners, setDisplayCorners] = useState(corners);
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; cornerIndex: number } | null>(null);

  useEffect(() => {
    setDisplayCorners(corners);
  }, [corners]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const img = container.querySelector("img");
    if (!img) return;

    const updateScale = () => {
      const rect = img.getBoundingClientRect();
      setScale({
        x: imageWidth / rect.width,
        y: imageHeight / rect.height,
      });
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();

    return () => observer.disconnect();
  }, [containerRef, imageWidth, imageHeight, imageUrl]);

  const toDisplayCoords = useCallback(
    (p: Point) => ({
      x: p.x / scale.x,
      y: p.y / scale.y,
    }),
    [scale]
  );

  const toImageCoords = useCallback(
    (displayX: number, displayY: number): Point => ({
      x: Math.max(0, Math.min(imageWidth, displayX * scale.x)),
      y: Math.max(0, Math.min(imageHeight, displayY * scale.y)),
    }),
    [scale, imageWidth, imageHeight]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      setActiveIndex(index);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        cornerIndex: index,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartRef.current === null || activeIndex === null) return;
      const rect = containerRef.current
        ?.querySelector("img")
        ?.getBoundingClientRect();
      if (!rect) return;

      const displayX = e.clientX - rect.left;
      const displayY = e.clientY - rect.top;
      const newPoint = toImageCoords(displayX, displayY);

      const newCorners = [...displayCorners] as [Point, Point, Point, Point];
      newCorners[activeIndex] = newPoint;

      setDisplayCorners(newCorners);
      onCornersChange(newCorners);
      dragStartRef.current = { x: e.clientX, y: e.clientY, cornerIndex: activeIndex };
    },
    [activeIndex, displayCorners, onCornersChange, toImageCoords, containerRef]
  );

  const handlePointerUp = useCallback(() => {
    setActiveIndex(null);
    dragStartRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    const defaults = getDefaultCorners(imageWidth, imageHeight);
    setDisplayCorners(defaults);
    onCornersChange(defaults);
  }, [imageWidth, imageHeight, onCornersChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          四隅のマーカーをドラッグしてドキュメントの範囲を指定
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          リセット
        </button>
      </div>
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="relative inline-block max-w-full"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt="編集対象"
          className="max-w-full h-auto block rounded-lg"
          draggable={false}
          style={{ maxHeight: "60vh" }}
        />
        <svg
          className="absolute left-0 top-0 w-full h-full pointer-events-none"
          style={{ maxHeight: "60vh" }}
          preserveAspectRatio="none"
        >
          <polygon
            points={[
              toDisplayCoords(displayCorners[0]),
              toDisplayCoords(displayCorners[1]),
              toDisplayCoords(displayCorners[2]),
              toDisplayCoords(displayCorners[3]),
            ]
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            fill="none"
            stroke="rgb(59 130 246)"
            strokeWidth="2"
            strokeDasharray="8 4"
            strokeLinejoin="round"
          />
        </svg>
        {displayCorners.map((corner, i) => {
          const d = toDisplayCoords(corner);
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={CORNER_LABELS[i]}
              className="absolute w-6 h-6 -ml-3 -mt-3 cursor-grab active:cursor-grabbing rounded-full bg-blue-500 border-2 border-white shadow-lg touch-none"
              style={{
                left: d.x,
                top: d.y,
              }}
              onPointerDown={(e) => handlePointerDown(e, i)}
            />
          );
        })}
      </div>
    </div>
  );
}

export { getDefaultCorners };
