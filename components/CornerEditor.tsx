"use client";

import { useCallback, useRef, useState, useEffect, useLayoutEffect } from "react";

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
  const [pointerPosition, setPointerPosition] = useState<{
    clientX: number;
    clientY: number;
    displayX: number;
    displayY: number;
    imgRect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; cornerIndex: number } | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (!pointerPosition || activeIndex === null) return;
    const imgEl = containerRef.current?.querySelector("img") as HTMLImageElement | null;
    const canvas = loupeCanvasRef.current;
    if (!imgEl || !canvas || !imgEl.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { displayX, displayY, imgRect } = pointerPosition;
    const scaleX = imageWidth / imgRect.width;
    const scaleY = imageHeight / imgRect.height;

    const zoom = 3;
    const loupeSize = 96;
    const sourceSizeDisplay = loupeSize / zoom;
    const sourceSizeX = sourceSizeDisplay * scaleX;
    const sourceSizeY = sourceSizeDisplay * scaleY;

    const imgX = displayX * scaleX;
    const imgY = displayY * scaleY;
    const sx = Math.max(0, Math.min(imageWidth - sourceSizeX, imgX - sourceSizeX / 2));
    const sy = Math.max(0, Math.min(imageHeight - sourceSizeY, imgY - sourceSizeY / 2));

    canvas.width = loupeSize;
    canvas.height = loupeSize;
    ctx.drawImage(
      imgEl,
      sx, sy, sourceSizeX, sourceSizeY,
      0, 0, loupeSize, loupeSize
    );
  }, [pointerPosition, activeIndex, imageWidth, imageHeight, containerRef]);

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
      const imgEl = containerRef.current?.querySelector("img");
      const imgRect = imgEl?.getBoundingClientRect();
      if (imgRect) {
        setPointerPosition({
          clientX: e.clientX,
          clientY: e.clientY,
          displayX: e.clientX - imgRect.left,
          displayY: e.clientY - imgRect.top,
          imgRect: { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height },
        });
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [containerRef]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartRef.current === null || activeIndex === null) return;
      const imgEl = containerRef.current?.querySelector("img");
      const imgRect = imgEl?.getBoundingClientRect();
      if (!imgRect) return;

      const displayX = e.clientX - imgRect.left;
      const displayY = e.clientY - imgRect.top;
      const newPoint = toImageCoords(displayX, displayY);

      const newCorners = [...displayCorners] as [Point, Point, Point, Point];
      newCorners[activeIndex] = newPoint;

      setDisplayCorners(newCorners);
      onCornersChange(newCorners);
      setPointerPosition({
        clientX: e.clientX,
        clientY: e.clientY,
        displayX,
        displayY,
        imgRect: { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height },
      });
      dragStartRef.current = { x: e.clientX, y: e.clientY, cornerIndex: activeIndex };
    },
    [activeIndex, displayCorners, onCornersChange, toImageCoords, containerRef]
  );

  const handlePointerUp = useCallback(() => {
    setActiveIndex(null);
    setPointerPosition(null);
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
        <p className="text-sm opacity-90">
          四隅のマーカーをドラッグしてドキュメントの範囲を指定
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="pixel-btn text-sm px-3 py-1.5 bg-[var(--pixel-mint)] hover:bg-[#22c55e] transition-colors"
          style={{ fontFamily: "var(--font-press-start), monospace" }}
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
          className="max-w-full h-auto block pixel-border"
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
            fill="rgba(255, 158, 197, 0.2)"
            stroke="var(--pixel-pink)"
            strokeWidth="3"
            strokeDasharray="8 4"
            strokeLinejoin="miter"
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
              className="absolute w-6 h-6 -ml-3 -mt-3 cursor-grab active:cursor-grabbing touch-none pixel-border bg-[var(--pixel-pink)]"
              style={{
                left: d.x,
                top: d.y,
              }}
              onPointerDown={(e) => handlePointerDown(e, i)}
            />
          );
        })}
      </div>
      {activeIndex !== null && pointerPosition && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            width: 96,
            height: 96,
            left: (() => {
              const left = pointerPosition.clientX - 48;
              if (typeof window === "undefined") return left;
              return Math.max(0, Math.min(window.innerWidth - 96, left));
            })(),
            top: (() => {
              const topAbove = pointerPosition.clientY - 120;
              if (topAbove >= 0) return topAbove;
              return pointerPosition.clientY + 20;
            })(),
          }}
        >
          <div className="relative w-full h-full overflow-hidden pixel-border bg-[var(--pixel-cream)]">
            <canvas
              ref={loupeCanvasRef}
              width={96}
              height={96}
              className="absolute left-0 top-0 w-full h-full block"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { getDefaultCorners };
