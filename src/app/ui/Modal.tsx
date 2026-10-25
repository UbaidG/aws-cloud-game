import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  /** Hide the close button (the footer must offer a way out). */
  hideClose?: boolean;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog with focus trapping and focus restore. Escape is handled by the global key handler,
 * which closes the top overlay through the store, so there is a single source of truth.
 */
export function Modal({ open, onClose, title, eyebrow, children, footer, width = 'max-w-lg', hideClose }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-void/70 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`panel w-full ${width} max-h-[92dvh] flex flex-col rounded-b-none sm:rounded-2xl overflow-hidden`}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-line">
              <div className="flex-1 min-w-0">
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                <h2 id={titleId} className="display text-lg font-bold text-text leading-tight">
                  {title}
                </h2>
              </div>
              {!hideClose && (
                <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
                  <X className="size-4" />
                </button>
              )}
            </header>
            <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">{children}</div>
            {footer && <footer className="px-5 py-3 border-t border-line flex flex-wrap items-center justify-end gap-2">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
