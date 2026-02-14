"use client";

import { useRef, useCallback, useState } from "react";

type ImageInputProps = {
  onImageSelect: (imageUrl: string, imageElement: HTMLImageElement) => void;
  onError?: (message: string) => void;
};

export function ImageInput({ onImageSelect, onError }: ImageInputProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        onError?.("画像ファイルを選択してください");
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        onImageSelect(url, img);
      };
      img.onerror = () => {
        onError?.("画像の読み込みに失敗しました");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [onImageSelect, onError]
  );

  const handleGalleryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleCameraFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraMode(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "カメラへのアクセスに失敗しました";
      setCameraError(message);
      onError?.(message);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraMode(false);
    setCameraError(null);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          processFile(file);
        }
      },
      "image/jpeg",
      0.95
    );

    stopCamera();
  }, [processFile, stopCamera]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="pixel-btn flex-1 px-4 py-3 bg-[var(--pixel-pink)] hover:bg-[#4a9eff] text-[var(--pixel-border)] font-bold transition-colors"
          style={{ fontFamily: "var(--font-press-start), monospace" }}
        >
          ギャラリーから選択
        </button>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryChange}
          className="hidden"
        />

        {/* {!isCameraMode ? (
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            カメラで撮影
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-500 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            キャンセル
          </button>
        )}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraFileChange}
          className="hidden"
        /> */}
      </div>

      {cameraError && (
        <p className="text-sm text-red-600">{cameraError}</p>
      )}

      {isCameraMode && (
        <div className="relative overflow-hidden pixel-border bg-[var(--pixel-border)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[50vh] object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <button
              type="button"
              onClick={capturePhoto}
              className="pixel-btn w-full py-3 bg-[var(--pixel-cream)] text-[var(--pixel-border)] font-bold hover:bg-white transition-colors"
              style={{ fontFamily: "var(--font-press-start), monospace" }}
            >
              撮影
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
