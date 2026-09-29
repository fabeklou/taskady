"use client";

interface Props {
  open: boolean;
  taskTitle: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteDialog({
  open,
  taskTitle,
  deleting,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="overlay-in fixed inset-0 z-50 grid place-items-center bg-forest/70 p-4">
      <div className="pop-in w-full max-w-sm rounded-3xl bg-paper p-6 text-center shadow-xl">
        <p className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-coral-pop/15 text-3xl" aria-hidden>
          🗑️
        </p>
        <h2 className="mt-3 text-xl font-bold text-forest">Delete this task?</h2>
        <p className="mt-2 line-clamp-2 text-sm font-medium text-ink/70">
          “{taskTitle}” will be gone for good. This can’t be undone.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="btn-smooth tap-target rounded-2xl border-2 border-forest/15 bg-white px-4 py-3 text-sm font-bold text-forest disabled:opacity-50"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            autoFocus
            className="btn-smooth tap-target rounded-2xl bg-coral-pop px-4 py-3 text-sm font-bold text-white shadow-[0_3px_0_#163300] disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
