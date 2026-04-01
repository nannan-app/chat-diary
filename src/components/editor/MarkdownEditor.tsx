import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus,
  Link as LinkIcon, ImageIcon,
  Undo2, Redo2,
} from "lucide-react";

const lowlight = createLowlight(common);

interface Props {
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialContent?: string;
}

export default function MarkdownEditor({ onSave, onCancel, initialTitle, initialContent }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Placeholder.configure({
        placeholder: t("editor.startWriting"),
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline cursor-pointer" },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" },
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "editor-content prose prose-sm max-w-none focus:outline-none min-h-[300px] px-6 py-4 select-text",
      },
    },
  });

  const wordCount = editor?.getText().replace(/\s/g, "").length || 0;

  const handleSave = () => {
    if (!title.trim()) return;
    const content = editor?.getHTML() || "";
    onSave(title.trim(), content);
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt(t("editor.link.prompt"), previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, t]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(t("editor.image.prompt"));
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor, t]);

  if (!editor) return null;

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
        className="w-[780px] h-[620px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <button
            onClick={onCancel}
            className="text-text-hint hover:text-text-secondary text-sm transition-colors"
          >
            {t("editor.cancel")}
          </button>
          <span className="text-xs text-text-hint">
            {wordCount} {t("editor.words")}
          </span>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-1 rounded-lg bg-accent text-white text-sm
                       disabled:opacity-50 hover:bg-accent-hover transition-colors"
          >
            {t("editor.done")}
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("editor.titlePlaceholder")}
          className="px-6 py-3 text-xl font-semibold text-text-primary
                     placeholder:text-text-hint focus:outline-none border-b border-border/30"
        />

        {/* Editor content */}
        <div className="flex-1 overflow-y-auto">
          <BubbleMenu editor={editor}
            className="bg-white rounded-lg shadow-lg border border-border flex gap-0.5 p-1"
          >
            <ToolBtn icon={Bold} title="" size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")} />
            <ToolBtn icon={Italic} title="" size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")} />
            <ToolBtn icon={UnderlineIcon} title="" size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")} />
            <ToolBtn icon={Strikethrough} title="" size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")} />
            <ToolBtn icon={LinkIcon} title="" size="sm"
              onClick={setLink}
              active={editor.isActive("link")} />
          </BubbleMenu>

          <EditorContent editor={editor} />
        </div>

        {/* Toolbar at bottom */}
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-border bg-warm-50/50 flex-wrap">
          <ToolBtn icon={Undo2} title={t("editor.undo")}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()} />
          <ToolBtn icon={Redo2} title={t("editor.redo")}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()} />

          <Divider />

          <ToolBtn icon={Bold} title={`${t("editor.bold")} (⌘B)`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")} />
          <ToolBtn icon={Italic} title={`${t("editor.italic")} (⌘I)`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")} />
          <ToolBtn icon={UnderlineIcon} title={`${t("editor.underline")} (⌘U)`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")} />
          <ToolBtn icon={Strikethrough} title={t("editor.strikethrough")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")} />

          <Divider />

          <ToolBtn icon={Heading1} title={t("editor.heading1")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })} />
          <ToolBtn icon={Heading2} title={t("editor.heading2")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })} />
          <ToolBtn icon={Heading3} title={t("editor.heading3")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })} />

          <Divider />

          <ToolBtn icon={List} title={t("editor.bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")} />
          <ToolBtn icon={ListOrdered} title={t("editor.orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")} />
          <ToolBtn icon={Quote} title={t("editor.blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")} />
          <ToolBtn icon={Code2} title={t("editor.codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")} />
          <ToolBtn icon={Minus} title={t("editor.horizontalRule")}
            onClick={() => editor.chain().focus().setHorizontalRule().run()} />

          <Divider />

          <ToolBtn icon={LinkIcon} title={t("editor.link")}
            onClick={setLink}
            active={editor.isActive("link")} />
          <ToolBtn icon={ImageIcon} title={t("editor.image")}
            onClick={addImage} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToolBtn({
  icon: Icon,
  title,
  onClick,
  active,
  disabled,
  size = "md",
}: {
  icon: React.FC<any>;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${sizeClass} rounded-md flex items-center justify-center transition-colors
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-warm-100"}
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      <Icon className={iconSize} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border/50 mx-1" />;
}
