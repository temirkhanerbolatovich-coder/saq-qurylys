"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal semantics keep focus in the drawer and Escape returns to its trigger. */
export function DetailDrawer({
  open,
  onClose,
  title,
  description,
  closeLabel = "Закрыть",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  closeLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const trigger = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="detail-drawer"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
    >
      {open && (
        <>
          <header className="detail-drawer-heading">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p id={descriptionId}>{description}</p>}
            </div>
            <button
              className="detail-drawer-close"
              type="button"
              onClick={() => close.current()}
              aria-label={closeLabel}
              autoFocus
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <div className="detail-drawer-body">{children}</div>
          {footer && <footer className="detail-drawer-footer">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}
