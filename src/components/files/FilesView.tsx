import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { File, FileText, FileAudio, FileVideo, FolderOpen, Download, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";
import type { FileItem } from "../../lib/types";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
    return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function FilesView() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const setActiveNav = useUIStore((s) => s.setActiveNav);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await ipc.listAllFiles();
      setFiles(result);
    } catch (e) {
      console.log("Failed to load files:", e);
    }
    setLoading(false);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const savePath = await save({ defaultPath: file.original_name });
      if (!savePath) return;

      const data = await ipc.getFileData(file.id);
      await writeFile(savePath, new Uint8Array(data));
    } catch (e) {
      console.log("File download error:", e);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <p>{t("app.loading")}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <div className="text-center">
          <FolderOpen className="w-10 h-10 mx-auto mb-3" />
          <p>{t("empty.files")}</p>
        </div>
      </div>
    );
  }

  // Group files by diary date
  const grouped = new Map<string, FileItem[]>();
  for (const file of files) {
    const date = file.date || dayjs(file.created_at).format("YYYY-MM-DD");
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(file);
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {Array.from(grouped.entries()).map(([date, dateFiles]) => (
        <div key={date} className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <CalendarDays className="w-4 h-4 text-text-hint" />
            <span className="text-sm font-medium text-text-secondary">{date}</span>
            <span className="text-xs text-text-hint">({dateFiles.length})</span>
            <button
              onClick={() => { setSelectedDate(date); setActiveNav("diary"); }}
              className="ml-auto text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {t("files.jumpToDiary")}
            </button>
          </div>
          <div className="space-y-2">
            {dateFiles.map((file) => {
              const FileIcon = getFileIcon(file.mime_type);
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="bg-white rounded-xl shadow-sm border border-border/50 px-4 py-3
                             flex items-center gap-3 cursor-default hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{file.original_name}</p>
                    <p className="text-xs text-text-hint mt-0.5">
                      {formatSize(file.file_size)}
                      <span className="mx-1.5">·</span>
                      {dayjs(file.created_at).format("HH:mm")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(file)}
                    className="w-8 h-8 rounded-lg hover:bg-warm-100 flex items-center justify-center
                               transition-colors flex-shrink-0"
                    title={t("files.download")}
                  >
                    <Download className="w-4 h-4 text-text-hint" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
