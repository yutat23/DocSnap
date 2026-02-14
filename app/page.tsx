"use client";

import { useState, useCallback, useRef } from "react";
import { ImageInput } from "@/components/ImageInput";
import { CornerEditor, getDefaultCorners } from "@/components/CornerEditor";
import { DocumentProcessor } from "@/components/DocumentProcessor";
import type { Point } from "@/components/CornerEditor";

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [corners, setCorners] = useState<[Point, Point, Point, Point] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageSelect = useCallback((url: string, img: HTMLImageElement) => {
    setImageUrl((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return url;
    });
    setImageElement(img);
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    const defaults = getDefaultCorners(img.naturalWidth, img.naturalHeight);
    setCorners(defaults);
    setError(null);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleNewImage = useCallback(() => {
    if (imageUrl && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setImageElement(null);
    setImageSize(null);
    setCorners(null);
    setError(null);
  }, [imageUrl]);

  return (
    <div className="min-h-screen relative" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* ドット柄オーバーレイ */}
      <div className="fixed inset-0 pixel-bg pointer-events-none" aria-hidden />

      <header className="relative border-b-4 border-[var(--pixel-border)] bg-[var(--pixel-cream)]" style={{ boxShadow: "0 4px 0 var(--pixel-shadow)" }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-press-start), monospace" }}>
            DocSnap
          </h1>
          <p className="text-sm mt-2 opacity-90">
            紙ドキュメントをスマホで撮影して、きれいに整形
          </p>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-4 py-8">
        {!imageUrl ? (
          <div className="space-y-6">
            <div className="pixel-border bg-[var(--pixel-cream)] p-6">
              <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-press-start), monospace" }}>画像を選択</h2>
              <ImageInput onImageSelect={handleImageSelect} onError={handleError} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="pixel-border bg-red-100 p-4 text-red-700 text-sm border-red-400">
                {error}
              </div>
            )}

            <div className="pixel-border bg-[var(--pixel-cream)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-press-start), monospace" }}>角を指定</h2>
                <button
                  type="button"
                  onClick={handleNewImage}
                  className="pixel-btn text-sm px-3 py-1.5 bg-[var(--pixel-mint)] hover:bg-[#22c55e] transition-colors"
                  style={{ fontFamily: "var(--font-press-start), monospace" }}
                >
                  別の画像
                </button>
              </div>
              {imageSize && corners && (
                <CornerEditor
                  imageUrl={imageUrl}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  corners={corners}
                  onCornersChange={setCorners}
                  containerRef={containerRef}
                />
              )}
            </div>

            {imageElement && corners && (
              <div className="pixel-border bg-[var(--pixel-cream)] p-6">
                <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-press-start), monospace" }}>整形</h2>
                <DocumentProcessor
                  imageElement={imageElement}
                  corners={corners}
                  onError={handleError}
                />
              </div>
            )}
          </div>
        )}
        {/* フッター */}
        <div className="mt-8 text-center">
          <a 
            href="https://github.com/yutat23/DocSnap" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block opacity-70 hover:opacity-100 transition-opacity"
          >
            <img src="https://github.githubassets.com/favicons/favicon.svg" alt="GitHub" className="inline w-4 h-4 mr-1 mb-1" />
          </a>
        </div>
      </main>
    </div>
  );
}
