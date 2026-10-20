import type { useDossierFormDraft } from "@/lib/use-dossier-form-draft";

export function DossierDraftNotice({
  draft,
}: {
  draft: Pick<
    ReturnType<typeof useDossierFormDraft>,
    "dirty" | "hasFiles" | "restored" | "storageError" | "missingFiles"
  >;
}) {
  return (
    <>
      {draft.dirty && !draft.restored && (
        <p className="muted">
          Черновик ввода сохраняется в этой вкладке до 12 часов. Документ и
          решение сохраняются только по вашей команде.
        </p>
      )}
      {draft.hasFiles && !draft.missingFiles.length && (
        <p className="muted">
          Файлы сохраняются только в памяти вкладки. После перезагрузки или
          закрытия вкладки выберите их повторно.
        </p>
      )}
      {draft.restored && (
        <p className="notice" role="status">
          Восстановлен несохранённый ввод этой формы.
        </p>
      )}
      {draft.missingFiles.length > 0 && (
        <p className="notice" role="status">
          Выберите файл повторно: {draft.missingFiles.join("; ")}.
        </p>
      )}
      {draft.storageError && (
        <p className="notice error" role="alert">
          {draft.storageError}
        </p>
      )}
    </>
  );
}
