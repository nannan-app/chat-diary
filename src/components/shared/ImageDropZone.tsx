import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useDiaryStore } from "../../stores/diaryStore";

interface Props {
  children: React.ReactNode;
}

export default function ImageDropZone({ children }: Props) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const uploadImage = useDiaryStore((s) => s.uploadImage);
  let dragCounter = 0;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter = 0;

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      await uploadImage(new Uint8Array(buffer), true);
    }
  };

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-accent/5 backdrop-blur-[1px]
                       flex items-center justify-center"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 2px rgba(123,182,134,0.3)",
                  "0 0 0 6px rgba(123,182,134,0.1)",
                  "0 0 0 2px rgba(123,182,134,0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="border-2 border-dashed border-accent rounded-2xl px-12 py-8
                         bg-white/80 text-center"
            >
              <p className="text-2xl mb-2">📷</p>
              <p className="text-accent text-sm font-medium">{t("dropZone.hint")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
