import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  /** Qiymat ortgan sayin tahrirlovchiga fokus beriladi (0 — fokus bermaydi). */
  focusSignal?: number;
}

function ToolbarBtn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-100',
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  minRows = 3,
  focusSignal = 0,
}: Props) {
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextAlign.configure({ types: ['paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (editor && focusSignal > 0 && !disabled) editor.commands.focus('end');
  }, [editor, focusSignal, disabled]);

  return (
    <div
      className={cn(
        'rounded-lg border bg-white dark:bg-gray-700',
        disabled
          ? 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
          : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-gray-600 dark:focus-within:border-blue-400',
      )}
    >
      {!disabled && (
        <div className="flex items-center gap-0.5 border-b border-gray-100 px-2 py-1 dark:border-gray-600">
          <ToolbarBtn
            active={editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            label="Qalin"
          >
            <Bold size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            label="Kursiv"
          >
            <Italic size={13} />
          </ToolbarBtn>
          <div className="mx-1.5 h-4 w-px bg-gray-200 dark:bg-gray-600" />
          <ToolbarBtn
            active={editor?.isActive({ textAlign: 'left' })}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            label="Chapga"
          >
            <AlignLeft size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive({ textAlign: 'center' })}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            label="Markazga"
          >
            <AlignCenter size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive({ textAlign: 'right' })}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            label="O'ngga"
          >
            <AlignRight size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive({ textAlign: 'justify' })}
            onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
            label="Ikki tomonga"
          >
            <AlignJustify size={13} />
          </ToolbarBtn>
        </div>
      )}
      <EditorContent
        editor={editor}
        style={{ minHeight: `${minRows * 1.625}rem` }}
        className="rte-editor px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
      />
    </div>
  );
}
