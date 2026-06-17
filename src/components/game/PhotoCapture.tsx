"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useGame } from "./GameProvider";
import { Camera, Sparkles, Wand2, CheckCircle } from "lucide-react";

export default function PhotoCapture() {
  const { sortedHouse, setResult, completePhoto } = useGame();
  const [photoTaken, setPhotoTaken] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // no camera
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotoDataUrl(dataUrl);
    setPhotoTaken(true);

    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Save photo immediately
    if (sortedHouse) {
      setResult(sortedHouse, dataUrl, null);
    }

    // Start background portrait generation
    setGenerating(true);
    try {
      const base64Data = dataUrl.split(",")[1];
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          house: sortedHouse?.nameEn ?? "gryffindor",
          photoBase64: base64Data,
        }),
      });
      const data = (await res.json()) as { success?: boolean; imageUrl?: string };
      if (data.success && data.imageUrl && sortedHouse) {
        setResult(sortedHouse, dataUrl, data.imageUrl);
      }
    } catch {
      // silent fail
    } finally {
      setGenerating(false);
      setGenerated(true);
    }
  }, [sortedHouse, setResult]);

  const handleConfirm = useCallback(() => {
    completePhoto();
  }, [completePhoto]);

  const houseColor = sortedHouse?.colors.primary ?? "#c9a84c";

  return (
    <motion.div
      key="photo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center p-8"
      style={{
        background: "linear-gradient(180deg, #0a0e1a 0%, #111827 50%, #1a1025 100%)",
      }}
    >
      {/* particles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-amber-300/30"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animation: `particleFloat ${4 + (i % 6)}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: `linear-gradient(135deg, ${houseColor}, ${sortedHouse?.colors.secondary ?? "#e8dcc8"})` }}>
          <Camera className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "Cinzel, serif", color: "#c9a84c" }}>
          巫师肖像采集
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
          分院帽需要一张你的肖像，用于生成专属巫师形象
        </p>
      </motion.div>

      {/* camera / preview area */}
      <div className="relative mb-6 w-full max-w-md">
        <div
          className="relative overflow-hidden rounded-2xl border-2 shadow-2xl"
          style={{
            borderColor: `${houseColor}40`,
            background: "rgba(10,10,20,0.7)",
            aspectRatio: "4/3",
          }}
        >
          {!photoTaken && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}
          {photoTaken && photoDataUrl && (
            <img
              src={photoDataUrl}
              alt="巫师肖像预览"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          {/* Corner decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2" style={{ borderColor: houseColor }} />
            <div className="absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2" style={{ borderColor: houseColor }} />
            <div className="absolute left-2 bottom-2 h-6 w-6 border-l-2 border-b-2" style={{ borderColor: houseColor }} />
            <div className="absolute right-2 bottom-2 h-6 w-6 border-r-2 border-b-2" style={{ borderColor: houseColor }} />
          </div>
        </div>

        {/* hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Status indicators */}
        {photoTaken && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-12 left-0 right-0 flex justify-center gap-3"
          >
            {generating && (
              <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
                style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}>
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                分院帽正在为你施法...
              </div>
            )}
            {generated && !generating && (
              <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
                style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                <CheckCircle className="h-3.5 w-3.5" />
                巫师形象已生成
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* button */}
      <div className="mt-14 flex gap-4">
        {!photoTaken ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTakePhoto}
            className="flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-bold text-white shadow-lg transition-shadow hover:shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${houseColor}, ${sortedHouse?.colors.secondary ?? "#e8dcc8"})`,
              fontFamily: "Noto Serif SC, serif",
            }}
          >
            <Camera className="h-5 w-5" />
            拍照
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-bold text-white shadow-lg transition-shadow hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #c9a84c, #d4a017)",
              fontFamily: "Noto Serif SC, serif",
            }}
          >
            <Wand2 className="h-5 w-5" />
            {generating ? "巫师形象生成中..." : "下一步：查看巫师形象"}
          </motion.button>
        )}
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: "#9ca3af" }}>
        {photoTaken ? "你的肖像已采集，分院帽正在后台为你生成专属巫师形象" : "请正对镜头，保持自然表情"}
      </p>
    </motion.div>
  );
}
