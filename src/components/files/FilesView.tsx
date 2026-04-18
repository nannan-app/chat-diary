import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { File, FileText, FileAudio, FileVideo, FolderOpen, Download } from "lucide-react";
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

function getFileTypeLabel(mimeType: string, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mimeType.startsWith("audio/")) return ext || "wav";
  if (mimeType.startsWith("video/")) return ext || "mp4";
  if (mimeType.includes("pdf")) return "pdf";
  return ext || "file";
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
      <div className="h-full flex items-center justify-center bg-paper-0 text-ink-500">
        <p className="italic" style={{ fontFamily: "var(--font-serif)" }}>{t("app.loading")}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-paper-0 paper-grain relative">
        <div className="text-center relative z-10 text-ink-500">
          <FolderOpen className="w-10 h-10 mx-auto mb-3" strokeWidth={1.4} />
          <p className="italic" style={{ fontFamily: "var(--font-serif)" }}>{t("empty.files")}</p>
        </div>
      </div>
    );
  }

  const totalSize = files.reduce((a, f) => a + f.file_size, 0);

  const grouped = new Map<string, FileItem[]>();
  for (const file of files) {
    const date = file.date || dayjs(file.created_at).format("YYYY-MM-DD");
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(file);
  }

  return (
    <div className="relative h-full flex flex-col bg-paper-0 overflow-hidden paper-grain">
      {/* Header */}
      <div className="relative z-10 px-8 pt-5 pb-3.5 border-b border-paper-200">
        <h1
          className="m-0 text-ink-900"
          style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, letterSpacing: "0.01em" }}
        >
          {t("nav.files")}
        </h1>
        <p
          className="m-0 mt-1 text-ink-500 italic"
          style={{ fontFamily: "var(--font-serif)", fontSize: 12 }}
        >
          {t("files.subtitle", {
            defaultValue: "{{count}} 个文件 · 共 {{size}}",
            count: files.length,
            size: formatSize(totalSize),
          })}
        </p>
      </div>

      {/* Files list */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-4 pb-10">
        {Array.from(grouped.entries()).map(([date, dateFiles]) => (
          <div key={date} className="mb-6">
            <div className="flex items-baseline gap-2.5 mb-2.5">
              <span
                className="text-ink-700 italic"
                style={{ fontFamily: "var(--font-serif)", fontSize: 14 }}
              >
                {date}
              </span>
              <div className="flex-1 h-px bg-paper-200" />
              <span className="text-[10.5px] text-ink-400" style={{ fontFamily: "var(--font-mono)" }}>
                {dateFiles.length}
              </span>
              <button
                onClick={() => { setSelectedDate(date); setActiveNav("diary"); }}
                className="text-[10.5px] text-ink-500 italic hover:text-ink-700 transition-colors"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("files.jumpToDiary")} →
              </button>
            </div>
            <div className="border border-paper-200 rounded-[4px] overflow-hidden bg-paper-0">
              {dateFiles.map((file, i) => {
                const FileIcon = getFileIcon(file.mime_type);
                const typeLabel = getFileTypeLabel(file.mime_type, file.original_name);
                return (
                  <motion.div
                    key={file.id}
                    whileHover={{ backgroundColor: "rgba(247, 241, 230, 0.4)" }}
                    className="grid items-center gap-4 px-4 py-3 text-[12.5px] text-ink-800"
                    style={{
                      gridTemplateColumns: "32px 1fr 90px 90px 32px",
                      borderTop: i > 0 ? "1px solid var(--color-paper-200)" : "none",
                    }}
                  >
                    <div
                      className="w-[28px] h-[28px] border border-paper-300 rounded-[3px] flex items-center justify-center text-ink-600"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {typeLabel.slice(0, 4)}
                    </div>
                    <span
                      className="truncate"
                      style={{ fontFamily: "var(--font-serif)", fontSize: 13.5 }}
                      title={file.original_name}
                    >
                      {file.original_name}
                    </span>
                    <span className="text-[11px] text-ink-500" style={{ fontFamily: "var(--font-mono)" }}>
                      {formatSize(file.file_size)}
                    </span>
                    <span className="text-[11px] text-ink-500" style={{ fontFamily: "var(--font-mono)" }}>
                      {dayjs(file.created_at).format("HH:mm")}
                    </span>
                    <button
                      onClick={() => handleDownload(file)}
                      className="w-8 h-8 rounded-md hover:bg-paper-100 flex items-center justify-center text-ink-500 hover:text-ink-700 transition-colors"
                      data-tooltip={t("files.download")}
                    >
                      <Download className="w-[14px] h-[14px]" strokeWidth={1.6} />
                      <FileIcon className="hidden" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
