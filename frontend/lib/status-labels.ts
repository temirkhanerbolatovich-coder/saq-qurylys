const statusLabels: Record<string, string> = {
  UNKNOWN: "Не проверено",
  NEW: "Новый материал",
  QUEUED: "В очереди",
  PROCESSING: "Обрабатывается",
  ANALYZING: "Анализируется",
  READY_FOR_REVIEW: "Готово к проверке",
  REVIEWED: "Проверено",
  FAILED: "Ошибка обработки",
  PENDING: "На проверке",
  CONFIRMED: "Подтверждено",
  CORRECTED: "Исправлено аналитиком",
  REJECTED: "Отклонено",
  RUNNING: "Выполняется",
  SUCCEEDED: "Завершено",
  BLOCKED: "Требуется действие аналитика",
  DRAFT: "Ожидает решения",
  RETURNED: "Возвращено на доработку",
  NOT_REQUESTED: "Не запрошено",
  READY: "Готово",
  VERIFIED_VALID: "Основание подтверждено",
  VERIFIED_ABSENT: "Отсутствие установлено",
  DOCUMENTED_ABSENT: "Отсутствие документально установлено",
  NOT_FOUND: "Не найдено в доступной выборке — недостаточно для R1",
  UNAVAILABLE: "Источник недоступен",
};

export function statusLabel(status: string): string {
  return Object.hasOwn(statusLabels, status) ? statusLabels[status] : status;
}
