import L from 'leaflet';

// divIcon pins — NO image assets (avoids the Vite broken-marker-icon bug).
// Colour is never the only signal: each pin carries a glyph + accessible label.

const ISSUE_PINS = {
  ROAD: { color: '#475569', glyph: '🛣' },
  GARBAGE: { color: '#65a30d', glyph: '🗑' },
  WATER: { color: '#0284c7', glyph: '💧' },
  STREETLIGHT: { color: '#d97706', glyph: '💡' },
  SEWAGE: { color: '#7c3aed', glyph: '🚱' },
  ELECTRICITY: { color: '#dc2626', glyph: '⚡' },
  PARK: { color: '#16a34a', glyph: '🌳' },
  OTHER: { color: '#0f766e', glyph: '📍' },
};

const HELPER_PINS = {
  PLUMBER: { color: '#0284c7', glyph: '🔧' },
  ELECTRICIAN: { color: '#d97706', glyph: '⚡' },
  CAB_DRIVER: { color: '#ca8a04', glyph: '🚕' },
  HOUSE_CLEANING: { color: '#16a34a', glyph: '🧹' },
  LOCKSMITH: { color: '#475569', glyph: '🔑' },
  CARPENTER: { color: '#92400e', glyph: '🪚' },
  PAINTER: { color: '#db2777', glyph: '🎨' },
  PACKERS_MOVERS: { color: '#7c3aed', glyph: '📦' },
  GROCERY_DELIVERY: { color: '#0f766e', glyph: '🛒' },
};

function makePin({ color, glyph }, { tier = 0, label = '', rating = null } = {}) {
  const ring = tier >= 2 ? 'box-shadow:0 0 0 3px #7c3aed,0 0 10px 2px rgba(124,58,237,.6);' : tier === 1 ? 'box-shadow:0 0 0 3px #f59e0b,0 0 8px 2px rgba(245,158,11,.55);' : 'box-shadow:0 1px 4px rgba(0,0,0,.4);';
  const badge = rating != null ? `<span style="position:absolute;-top:6px;right:-8px;top:-7px;right:-9px;background:#fff;color:#b45309;border:1px solid #f59e0b;border-radius:999px;font-size:9px;font-weight:700;padding:0 3px;line-height:13px;">★${Number(rating).toFixed(1)}</span>` : '';
  const html = `<div role="img" aria-label="${label}" style="position:relative;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};${ring}display:flex;align-items:center;justify-content:center;border:2px solid #fff;">
    <span style="transform:rotate(45deg);font-size:14px;line-height:1;">${glyph}</span>${badge}
  </div>`;
  return L.divIcon({ html, className: 'samadhan-pin', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
}

export const issuePin = (category, opts) => makePin(ISSUE_PINS[category] ?? ISSUE_PINS.OTHER, opts);
export const helperPin = (category, opts) => makePin(HELPER_PINS[category] ?? HELPER_PINS.GROCERY_DELIVERY, opts);

export const seekerIcon = () =>
  L.divIcon({
    html: '<div aria-label="You" style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb,0 1px 4px rgba(0,0,0,.4);"></div>',
    className: 'samadhan-pin',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export { ISSUE_PINS, HELPER_PINS };
