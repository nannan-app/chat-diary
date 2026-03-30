import { useState } from "react";
import { motion } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface Props {
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialContent?: string;
}

export default function MarkdownEditor({ onSave, onCancel, initialTitle, initialContent }: Props) {
  const [title, setTitle] = useState(initialTitle || "");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "开始写作...",
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  const wordCount = editor?.getText().length || 0;

  const handleSave = () => {
    if (!title.trim()) return;
    const content = editor?.getHTML() || "";
    onSave(title.trim(), content);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-[720px] h-[560px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="text-text-hint hover:text-text-secondary text-sm"
            >
              取消
            </button>
          </div>
          <span className="text-xs text-text-hint">{wordCount} 字</span>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-1 rounded-lg bg-accent text-white text-sm
                       disabled:opacity-50 hover:bg-accent-hover transition-colors"
          >
            完成
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          className="px-4 py-3 text-xl font-medium text-text-primary
                     placeholder:text-text-hint focus:outline-none border-b border-border/50"
        />

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            label="B"
            title="粗体"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            label="I"
            title="斜体"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive("heading", { level: 2 })}
            label="H"
            title="标题"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
            label="•"
            title="列表"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
            label="1."
            title="有序列表"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive("blockquote")}
            label='"'
            title="引用"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            active={editor?.isActive("codeBlock")}
            label="<>"
            title="代码块"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium
                  transition-colors
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-warm-100"}`}
    >
      {label}
    </button>
  );
}
