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
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

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
      setIsVideoReady(false);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        const onReady = () => {
          video.play().catch(() => {});
          setIsVideoReady(true);
        };
        video.onloadedmetadata = onReady;
        if (video.readyState >= 1) onReady();
        readyTimeoutRef.current = setTimeout(() => setIsVideoReady((r) => r || true), 2000);
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
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.srcObject = null;
    }
    setIsCameraMode(false);
    setIsVideoReady(false);
    setCameraError(null);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const stream = streamRef.current;
    if (!video || !canvas || !stream) return;

    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width === 0 || height === 0) {
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      if (settings?.width && settings?.height) {
        width = settings.width;
        height = settings.height;
      }
    }
    if (width === 0 || height === 0) {
      onError?.("カメラの準備ができていません。少し待ってから再度お試しください");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
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
  }, [processFile, stopCamera, onError]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors"
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

        {!isCameraMode ? (
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
        />
      </div>

      {cameraError && (
        <p className="text-sm text-red-600 dark:text-red-400">{cameraError}</p>
      )}

      {isCameraMode && (
        <div className="relative rounded-xl overflow-hidden bg-slate-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[50vh] object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/80 to-transparent">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!isVideoReady}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              {isVideoReady ? "撮影" : "準備中..."}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
