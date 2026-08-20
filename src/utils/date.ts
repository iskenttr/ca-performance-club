const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

const dayFormatter = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });
const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (value: string) => dateFormatter.format(new Date(value));
export const formatShortDate = (value: string) => shortDateFormatter.format(new Date(value));
export const formatDay = (value: string) => {
  const text = dayFormatter.format(new Date(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
export const formatTime = (value: string) => timeFormatter.format(new Date(value));

export const formatAppointment = (value: string) =>
  `${formatDay(value)}, ${formatShortDate(value)} · ${formatTime(value)}`;

export const toDateInput = (value = new Date()) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateWithOffset = (days: number, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const isSameDay = (a: string, b: string) => toDateInput(new Date(a)) === toDateInput(new Date(b));

export const relativeDay = (value: string) => {
  const today = toDateInput();
  const tomorrow = toDateInput(new Date(Date.now() + 86_400_000));
  const target = toDateInput(new Date(value));
  if (target === today) return 'Bugün';
  if (target === tomorrow) return 'Yarın';
  return formatDay(value);
};

