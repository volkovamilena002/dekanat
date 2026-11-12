// Каталог заявок и справок. Одно описание используется и для формы, и для серверной валидации.

export type Field =
  | { name: string; label: string; kind: "select"; options: string[]; required?: boolean }
  | { name: string; label: string; kind: "number"; min: number; max: number; required?: boolean }
  | { name: string; label: string; kind: "date"; required?: boolean }
  | { name: string; label: string; kind: "text" | "textarea"; maxLength: number; required?: boolean; placeholder?: string };

export type RequestType = {
  key: string;
  title: string;
  short: string;
  group: "certificate" | "statement";
  /** Срок в рабочих днях */
  days: number;
  icon: "file-text" | "shield" | "wallet" | "hand-coins" | "pause" | "id-card" | "list";
  fields: Field[];
};

const DELIVERY: Field = {
  name: "delivery",
  label: "Как получить",
  kind: "select",
  options: ["Электронно, с кодом проверки", "Бумажная, в деканате"],
  required: true,
};

const COPIES: Field = { name: "copies", label: "Количество экземпляров", kind: "number", min: 1, max: 5, required: true };

export const REQUEST_TYPES: RequestType[] = [
  {
    key: "study_certificate",
    title: "Справка об обучении",
    short: "Подтверждает, что вы студент. Нужна почти везде.",
    group: "certificate",
    days: 1,
    icon: "file-text",
    fields: [
      {
        name: "purpose",
        label: "Куда нужна",
        kind: "select",
        options: ["По месту требования", "В Социальный фонд", "В отдел соцзащиты", "В налоговую", "Для оформления визы"],
        required: true,
      },
      COPIES,
      DELIVERY,
    ],
  },
  {
    key: "military_certificate",
    title: "Справка в военкомат",
    short: "Форма для отсрочки от призыва.",
    group: "certificate",
    days: 3,
    icon: "shield",
    fields: [COPIES, { ...DELIVERY, options: ["Бумажная, в деканате"] }],
  },
  {
    key: "income_certificate",
    title: "Справка о стипендии",
    short: "Размер выплат за выбранный период.",
    group: "certificate",
    days: 3,
    icon: "wallet",
    fields: [
      { name: "from", label: "Период с", kind: "date", required: true },
      { name: "to", label: "по", kind: "date", required: true },
      DELIVERY,
    ],
  },
  {
    key: "transcript",
    title: "Выписка оценок",
    short: "Все оценки за пройденные семестры.",
    group: "certificate",
    days: 5,
    icon: "list",
    fields: [{ name: "language", label: "Язык", kind: "select", options: ["Русский", "Английский"], required: true }, DELIVERY],
  },
  {
    key: "financial_aid",
    title: "Материальная помощь",
    short: "Заявление на разовую выплату.",
    group: "statement",
    days: 10,
    icon: "hand-coins",
    fields: [
      {
        name: "reason",
        label: "Основание",
        kind: "select",
        options: ["Тяжёлое материальное положение", "Рождение ребёнка", "Лечение", "Утрата имущества", "Другое"],
        required: true,
      },
      { name: "comment", label: "Пояснение", kind: "textarea", maxLength: 1000, placeholder: "Кратко опишите ситуацию" },
    ],
  },
  {
    key: "academic_leave",
    title: "Академический отпуск",
    short: "Перерыв в учёбе с сохранением места.",
    group: "statement",
    days: 10,
    icon: "pause",
    fields: [
      {
        name: "reason",
        label: "Основание",
        kind: "select",
        options: ["По медицинским показаниям", "Семейные обстоятельства", "Призыв на военную службу", "Другое"],
        required: true,
      },
      { name: "start", label: "С какой даты", kind: "date", required: true },
      { name: "comment", label: "Комментарий", kind: "textarea", maxLength: 1000 },
    ],
  },
  {
    key: "id_duplicate",
    title: "Дубликат студенческого",
    short: "Если билет или зачётка потеряны или испорчены.",
    group: "statement",
    days: 5,
    icon: "id-card",
    fields: [
      { name: "document", label: "Документ", kind: "select", options: ["Студенческий билет", "Зачётная книжка"], required: true },
      { name: "reason", label: "Причина", kind: "select", options: ["Утерян", "Испорчен", "Смена фамилии"], required: true },
    ],
  },
];

export const requestTypeByKey = (key: string) => REQUEST_TYPES.find((t) => t.key === key);

export const STATUS_LABEL = {
  submitted: "Подана",
  in_review: "В работе",
  needs_info: "Нужно уточнение",
  ready: "Готова",
  done: "Выдана",
  rejected: "Отклонена",
} as const;

export type RequestStatus = keyof typeof STATUS_LABEL;
