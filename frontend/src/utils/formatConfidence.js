export function formatConfidence(value) { const number = Number(value); return Number.isFinite(number) ? `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%` : '—' }
export function confidenceValue(value) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) * 100 : 0 }
