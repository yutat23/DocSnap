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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">DocSnap</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            ドキュメントをCamScanner風に見やすく整形
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!imageUrl ? (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">画像を選択</h2>
              <ImageInput onImageSelect={handleImageSelect} onError={handleError} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">角を指定</h2>
                <button
                  type="button"
                  onClick={handleNewImage}
                  className="text-sm px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">整形</h2>
                <DocumentProcessor
                  imageElement={imageElement}
                  corners={corners}
                  onError={handleError}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
