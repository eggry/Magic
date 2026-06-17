"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useGame } from "./GameProvider";
import { Camera } from "lucide-react";

export default function PhotoCapture() {
  const { sortedHouse, setResult, completePhoto } = useGame();
  const [photoTaken, setPhotoTaken] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoProceedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProceededRef = useRef(false);

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
        // no camera - show placeholder
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleTakePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setPhotoTaken(true);

    // Save photo and immediately go to result
    if (sortedHouse) {
      setResult(sortedHouse, dataUrl, null);
    }

    // Fire-and-forget background portrait generation
    // Do NOT await - let user proceed immediately
    const base64Data = dataUrl.split(",")[1];
    fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        house: sortedHouse?.nameEn ?? "gryffindor",
        photoBase64: base64Data,
      }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; imageUrl?: string }) => {
        if (data.success && data.imageUrl && sortedHouse) {
          setResult(sortedHouse, dataUrl, data.imageUrl);
        }
      })
      .catch(() => {
        // silent fail - portrait will show placeholder
      });

    // Auto-proceed after 500ms to let user glimpse the photo
    autoProceedTimeoutRef.current = setTimeout(() => {
      if (!hasProceededRef.current) {
        hasProceededRef.current = true;
        completePhoto();
      }
    }, 500);
  }, [sortedHouse, setResult, completePhoto]);

  const handleConfirm = useCallback(() => {
    if (hasProceededRef.current) return;
    hasProceededRef.current = true;
    if (autoProceedTimeoutRef.current) {
      clearTimeout(autoProceedTimeoutRef.current);
    }
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
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 mb-6 text-center"
      >
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#c9a84c",
            textShadow: "0 0 15px rgba(201,168,76,0.5), 0 2px 4px rgba(0,0,0,0.8)",
            fontFamily: "'Cinzel', serif",
          }}
        >
          巫师肖像采集
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
          分院帽需要记录你的面容，以便施展换装魔法
        </p>
      </motion.div>

      {/* camera preview or taken photo */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10"
      >
        <div
          className="relative overflow-hidden rounded-xl border-2"
          style={{
            width: "480px",
            maxWidth: "80vw",
            height: "360px",
            borderColor: photoTaken ? houseColor : "rgba(201,168,76,0.4)",
            boxShadow: photoTaken
              ? `0 0 30px ${houseColor}40`
              : "0 0 20px rgba(201,168,76,0.15)",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ display: photoTaken ? "none" : "block", transform: "scaleX(-1)" }}
          />
          {photoTaken && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}
          {!photoTaken && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="h-48 w-48 rounded-full border-2 border-dashed"
                style={{ borderColor: "rgba(201,168,76,0.3)" }}
              />
            </div>
          )}
        </div>

        {/* shutter button */}
        {!photoTaken && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex justify-center"
          >
            <button
              onClick={handleTakePhoto}
              className="group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
              style={{
                background: "rgba(201,168,76,0.15)",
                border: "2px solid rgba(201,168,76,0.5)",
                boxShadow: "0 0 15px rgba(201,168,76,0.2)",
              }}
            >
              <div
                className="h-12 w-12 rounded-full transition-all duration-300 group-hover:h-10 group-hover:w-10"
                style={{
                  background: "rgba(201,168,76,0.8)",
                  boxShadow: "0 0 10px rgba(201,168,76,0.5)",
                }}
              />
            </button>
          </motion.div>
        )}

        {/* instruction */}
        {!photoTaken && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-3 text-center text-sm"
            style={{ color: "#9ca3af" }}
          >
            点击快门拍摄你的巫师肖像
          </motion.p>
        )}

        {/* subtle transition hint after photo taken */}
        {photoTaken && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-center text-xs"
            style={{ color: "#9ca3af" }}
          >
            即将进入分院大厅...
          </motion.p>
        )}
      </motion.div>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
