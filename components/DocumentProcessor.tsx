"use client";

import { useCallback, useState } from "react";
import { getOpenCV } from "@/lib/opencv";
import type { Point } from "./CornerEditor";

type DocumentProcessorProps = {
  imageElement: HTMLImageElement;
  corners: [Point, Point, Point, Point];
  onError?: (message: string) => void;
};

type BinarizeLevel = "off" | "light" | "medium" | "strong";

export function DocumentProcessor({
  imageElement,
  corners,
  onError,
}: DocumentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [contrast, setContrast] = useState(200);
  const [sharpness, setSharpness] = useState(0);
  const [binarize, setBinarize] = useState<BinarizeLevel>("light");

  const processDocument = useCallback(async () => {
    setIsProcessing(true);
    setResultUrl(null);
    setLoadingMessage("OpenCVを読み込み中...");

    try {
      const cv = await getOpenCV();
      setLoadingMessage("画像を処理中...");

      const src = cv.imread(imageElement);
      const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        corners[0].x,
        corners[0].y,
        corners[1].x,
        corners[1].y,
        corners[2].x,
        corners[2].y,
        corners[3].x,
        corners[3].y,
      ]);

      const w1 = Math.hypot(
        corners[1].x - corners[0].x,
        corners[1].y - corners[0].y
      );
      const w2 = Math.hypot(
        corners[2].x - corners[3].x,
        corners[2].y - corners[3].y
      );
      const h1 = Math.hypot(
        corners[3].x - corners[0].x,
        corners[3].y - corners[0].y
      );
      const h2 = Math.hypot(
        corners[2].x - corners[1].x,
        corners[2].y - corners[1].y
      );
      const dstWidth = Math.max(w1, w2);
      const dstHeight = Math.max(h1, h2);

      const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        dstWidth,
        0,
        dstWidth,
        dstHeight,
        0,
        dstHeight,
      ]);

      const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
      let work = new cv.Mat();
      cv.warpPerspective(
        src,
        work,
        M,
        new cv.Size(dstWidth, dstHeight),
        cv.INTER_LINEAR
      );

      src.delete();
      srcPoints.delete();
      dstPoints.delete();
      M.delete();

      try {
        const alpha = contrast / 100;
        const beta = (1 - alpha) * 128;
        const contrastMat = new cv.Mat();
        cv.convertScaleAbs(work, contrastMat, alpha, beta);
        work.delete();
        work = contrastMat;

        if (sharpness > 0) {
          const blurred = new cv.Mat();
          cv.GaussianBlur(work, blurred, new cv.Size(0, 0), 3);
          const sharpResult = new cv.Mat();
          cv.addWeighted(
            work,
            1 + sharpness / 50,
            blurred,
            -sharpness / 50,
            0,
            sharpResult
          );
          blurred.delete();
          work.delete();
          work = sharpResult;
        }

        if (binarize !== "off") {
          const binParams: Record<Exclude<BinarizeLevel, "off">, [number, number]> = {
            light: [31, 5],
            medium: [21, 8],
            strong: [11, 10],
          };
          const [blockSize, C] = binParams[binarize];
          const gray = new cv.Mat();
          cv.cvtColor(work, gray, cv.COLOR_RGBA2GRAY);
          const binary = new cv.Mat();
          cv.adaptiveThreshold(
            gray,
            binary,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            blockSize,
            C
          );
          const rgba = new cv.Mat();
          cv.cvtColor(binary, rgba, cv.COLOR_GRAY2RGBA);
          gray.delete();
          binary.delete();
          work.delete();
          work = rgba;
        }

        const canvas = document.createElement("canvas");
        canvas.width = dstWidth;
        canvas.height = dstHeight;
        cv.imshow(canvas, work);
        const url = canvas.toDataURL("image/png");
        setResultUrl(url);
      } finally {
        work.delete();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "画像処理に失敗しました";
      onError?.(message);
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  }, [imageElement, corners, contrast, sharpness, binarize, onError]);

  const downloadResult = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `docsnap-${Date.now()}.png`;
    a.click();
  }, [resultUrl]);

  return (
    <div className="space-y-4">
      <div className="space-y-4 pixel-border bg-[var(--pixel-cream)]/50 p-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            コントラスト {contrast}%
          </label>
          <input
            type="range"
            min={50}
            max={500}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full h-3 appearance-none cursor-pointer bg-[var(--pixel-shadow)] accent-[var(--pixel-pink)]"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            シャープ {sharpness}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={sharpness}
            onChange={(e) => setSharpness(Number(e.target.value))}
            className="w-full h-3 appearance-none cursor-pointer bg-[var(--pixel-shadow)] accent-[var(--pixel-mint)]"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            二値化
          </label>
          <div className="flex flex-wrap gap-2">
            {(["off", "light", "medium", "strong"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setBinarize(level)}
                className={`pixel-btn px-3 py-1.5 text-sm font-bold transition-colors ${
                  binarize === level
                    ? "bg-[var(--pixel-pink)] text-white"
                    : "bg-[var(--pixel-shadow)] hover:bg-[var(--pixel-lavender)]"
                }`}
                style={{ fontFamily: "var(--font-press-start), monospace" }}
              >
                {level === "off" ? "オフ" : level === "light" ? "弱" : level === "medium" ? "中" : "強"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={processDocument}
        disabled={isProcessing}
        className="pixel-btn w-full py-3 bg-[var(--pixel-mint)] hover:bg-[#22c55e] disabled:bg-[var(--pixel-shadow)] disabled:cursor-not-allowed text-[var(--pixel-border)] font-bold transition-colors disabled:transform-none disabled:shadow-none"
        style={{ fontFamily: "var(--font-press-start), monospace" }}
      >
        {isProcessing ? loadingMessage || "処理中..." : "整形して適用"}
      </button>

      {resultUrl && (
        <div className="space-y-3">
          <img
            src={resultUrl}
            alt="整形済み"
            className="w-full pixel-border"
          />
          <button
            type="button"
            onClick={downloadResult}
            className="pixel-btn w-full py-3 bg-[var(--pixel-lavender)] hover:bg-[#14b8a6] text-[var(--pixel-border)] font-bold transition-colors"
            style={{ fontFamily: "var(--font-press-start), monospace" }}
          >
            ダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
