import { describe, expect, it } from 'vitest';
import { formatRupees, formatDate, formatDateTime, formatRelative } from '@/lib/format';

describe('format', () => {
  it('paise → ₹ with en-IN grouping, integer math', () => {
    expect(formatRupees(0, 'en')).toContain('0');
    expect(formatRupees(99, 'en')).toContain('0.99');
    expect(formatRupees(100, 'en')).toContain('1');
    expect(formatRupees(123456, 'en')).toContain('1,234.56');
    expect(formatRupees(500, 'en')).toContain('₹');
  });
  it('hindi locale keeps Latin digits', () => {
    const s = formatRupees(123456, 'hi');
    expect(s).toContain('1,234.56');
    expect(s).not.toMatch(/[०-९]/);
  });
  it('date helpers use Latin digits in hi', () => {
    const d = formatDate('2026-11-25T10:00:00Z', 'hi');
    expect(d).not.toMatch(/[०-९]/);
    expect(formatDateTime('2026-11-25T10:00:00Z', 'en')).toMatch(/2026/);
  });
  it('relative time renders', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(typeof formatRelative(recent, 'en')).toBe('string');
  });
});
