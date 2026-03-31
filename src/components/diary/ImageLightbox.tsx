import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUIStore } from "../../stores/uiStore";
import * as ipc from "../../lib/ipc";

export default function ImageLightbox() {
  const viewingImageId = useUIStore((s) => s.viewingImageId);
  const setViewingImageId = useUIStore((s) => s.setViewingImageId);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!viewingImageId) {
      setFullUrl(null);
      return;
    }
    let revoked = false;
    ipc.getFullImage(viewingImageId).then((data) => {
      if (revoked) return;
      const blob = new Blob([new Uint8Array(data)], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setFullUrl(url);
    });
    return () => {
      revoked = true;
    };
  }, [viewingImageId]);

  if (!viewingImageId) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={() => setViewingImageId(null)}
    >
      {fullUrl ? (
        <motion.img
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          src={fullUrl}
          alt=""
          className="max-w-[90%] max-h-[90%] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-white text-sm">Loading...</div>
      )}

      <button
        onClick={() => setViewingImageId(null)}
        className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-lg text-white flex items-center justify-center
                   hover:bg-white/30 backdrop-blur-sm transition-colors"
      >
        ✕
      </button>
    </motion.div>
  );
}
