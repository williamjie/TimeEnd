function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateYmd(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateInput(text) {
  const raw = String(text == null ? '' : text).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return { ok: false };
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, month - 1, day);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return { ok: false };
  }
  return { ok: true, value: `${m[1]}-${m[2]}-${m[3]}` };
}

module.exports = {
  parseDateInput,
  formatDateYmd
};
