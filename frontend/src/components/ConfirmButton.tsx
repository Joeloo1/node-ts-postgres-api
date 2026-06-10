import { useState } from "react";

interface Props {
  onConfirm: () => void;
  children: React.ReactNode;
  message?: string;
  confirmLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function ConfirmButton({
  onConfirm,
  children,
  message = "Sure?",
  confirmLabel = "Yes",
  className = "",
  disabled = false,
}: Props) {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-ink3">{message}</span>
        <button
          type="button"
          onClick={() => { onConfirm(); setActive(false); }}
          className="font-semibold text-red-400 transition-colors hover:text-red-500"
        >
          {confirmLabel}
        </button>
        <span className="text-ink4">&middot;</span>
        <button
          type="button"
          onClick={() => setActive(false)}
          className="text-ink4 transition-colors hover:text-ink2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setActive(true)}
      className={className}
    >
      {children}
    </button>
  );
}
