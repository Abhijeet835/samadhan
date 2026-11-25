/**
 * PURE deterministic bilingual functions across civic categories × EN/HI × platform.
 * Never money amounts, never reporter PII, never individual officer names.
 */

const CATEGORY_LABELS = {
  BROKEN_ROADS: { en: 'broken road issue', hi: 'टूटी सड़क समस्या' },
  SEWAGE_DRAINAGE: { en: 'sewage & drainage issue', hi: 'सीवेज और जल निकासी समस्या' },
  GARBAGE_MANAGEMENT: { en: 'garbage management issue', hi: 'कचरा प्रबंधन समस्या' },
  WATER_ELECTRICITY: { en: 'water & electricity issue', hi: 'पानी और बिजली समस्या' },
  STRAY_ANIMALS: { en: 'stray animal welfare issue', hi: 'आवारा पशु समस्या' },
  EDUCATION_INFRA: { en: 'education & infrastructure issue', hi: 'शिक्षा और बुनियादी ढांचा मुद्दा' },
  PUBLIC_FACILITIES: { en: 'public facility demand (IIT/AIIMS/civic)', hi: 'सार्वजनिक सुविधा मांग (IIT/AIIMS/नागरिक)' },
  ROAD: { en: 'broken road issue', hi: 'टूटी सड़क समस्या' },
  GARBAGE: { en: 'garbage management issue', hi: 'कचरा प्रबंधन समस्या' },
  WATER: { en: 'water & electricity issue', hi: 'पानी और बिजली समस्या' },
  STREETLIGHT: { en: 'public facility issue', hi: 'सार्वजनिक सुविधा समस्या' },
  SEWAGE: { en: 'sewage & drainage issue', hi: 'सीवेज और जल निकासी समस्या' },
  ELECTRICITY: { en: 'water & electricity issue', hi: 'पानी और बिजली समस्या' },
  PARK: { en: 'public facility issue', hi: 'सार्वजनिक सुविधा समस्या' },
  OTHER: { en: 'civic issue', hi: 'नागरिक समस्या' },
};

function getCategoryLabel(category, lang) {
  return CATEGORY_LABELS[category]?.[lang] || CATEGORY_LABELS.OTHER[lang];
}

function getLocationLabel(issue, lang) {
  const parts = [issue.location?.city, issue.location?.state].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (issue.location?.address) return issue.location.address;
  return lang === 'hi' ? 'आपका क्षेत्र' : 'your area';
}

function buildHashtags(category, city, state) {
  const tags = ['#Samadhan'];
  if (city) tags.push(`#${city.replace(/\s+/g, '')}`);
  if (state) tags.push(`#${state.replace(/\s+/g, '')}`);
  if (category && category !== 'OTHER') tags.push(`#${category.toLowerCase().replace(/_/g, '')}`);
  return [...new Set(tags)].slice(0, 5);
}

function truncateForX(text, url) {
  const maxText = 280 - (url.length + 1);
  if (text.length <= maxText) return text;
  return `${text.slice(0, maxText - 3).trim()}...`;
}

export function generateX({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = getLocationLabel(issue, lang);
  const handle = authority?.handles?.x || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const supporterText = issue.supporterCount > 1
    ? (lang === 'hi' ? ` ${issue.supporterCount} नागरिक साथ।` : ` ${issue.supporterCount} citizens supporting.`)
    : '';

  const text = lang === 'hi'
    ? (tier >= 2
      ? `📢 ${location} में ${categoryLabel}: ${issue.title}.${supporterText} समुदाय स्तर पर सार्वजनिक अभियान शुरू। ${handle} कृपया कार्रवाई करें।`
      : `🚨 ${location} में ${categoryLabel}: ${issue.title}.${supporterText} ${handle} कृपया ध्यान दें।`)
    : (tier >= 2
      ? `📢 Community action in ${location} (${categoryLabel}): ${issue.title}.${supporterText} ${handle}, please act.`
      : `🚨 ${categoryLabel} in ${location}: ${issue.title}.${supporterText} ${handle}, please take note.`);

  const hashtags = buildHashtags(issue.category, issue.location?.city, issue.location?.state);
  return `${truncateForX(`${text} ${hashtags.join(' ')}`, shareUrl)} ${shareUrl}`;
}

export function generateInstagram({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = getLocationLabel(issue, lang);
  const handle = authority?.handles?.instagram || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const hashtags = buildHashtags(issue.category, issue.location?.city, issue.location?.state);
  const urgency = lang === 'hi'
    ? (tier >= 2 ? '📢 सार्वजनिक अभियान स्तर पूर्ण' : '🚨 समुदाय समर्थन सीमा पूर्ण')
    : (tier >= 2 ? '📢 Public Explosion Campaign' : '🚨 Community Threshold Reached');

  const caption = lang === 'hi'
    ? `${urgency} — ${categoryLabel}\n📍 ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 350)}\n\n👥 ${issue.supporterCount} नागरिकों ने इस मुद्दे का समर्थन किया है। ${handle} कृपया संज्ञान लें।\n\nनोट: समाधान एक नागरिक मंच है, आधिकारिक सरकारी पोर्टल नहीं।\n\n${hashtags.join(' ')}\n\n${shareUrl}`
    : `${urgency} — ${categoryLabel}\n📍 ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 350)}\n\n👥 ${issue.supporterCount} citizens have backed this issue. ${handle}, please take note.\n\nNote: Samadhan is an independent civic platform, not an official government portal.\n\n${hashtags.join(' ')}\n\n${shareUrl}`;

  return caption.slice(0, 2200);
}

export function generateFacebook({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = getLocationLabel(issue, lang);
  const handle = authority?.handles?.facebook || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const post = lang === 'hi'
    ? `${tier >= 2 ? '📢 सार्वजनिक अभियान' : '🚨 समुदाय जागरूकता'}: ${categoryLabel} (${location})\n\n${issue.title}\n\n${issue.description}\n\n${issue.supporterCount} नागरिकों ने समर्थन किया। ${handle} कृपया ध्यान दें।\n\nनोट: समाधान आधिकारिक सरकारी पोर्टल नहीं है।\n\nविवरण: ${shareUrl}`
    : `${tier >= 2 ? '📢 Public Awareness Action' : '🚨 Community Threshold Reached'}: ${categoryLabel} (${location})\n\n${issue.title}\n\n${issue.description}\n\n${issue.supporterCount} citizens are supporting this issue. ${handle}, please take note.\n\nNote: Samadhan is not an official government portal.\n\nDetails: ${shareUrl}`;
  return post.slice(0, 2200);
}

export function generateReddit({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = getLocationLabel(issue, lang);
  const handle = authority?.handles?.reddit || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const title = lang === 'hi'
    ? `[${tier >= 2 ? 'अभियान' : 'नागरिक मुद्दा'}] ${categoryLabel} - ${location}: ${issue.title.slice(0, 180)}`
    : `[${tier >= 2 ? 'Public Action' : 'Civic Issue'}] ${categoryLabel} in ${location}: ${issue.title.slice(0, 180)}`;
  const body = lang === 'hi'
    ? `${issue.description}\n\n---\n\n**समुदाय समर्थन:** ${issue.supporterCount} नागरिक\n\n**${handle}** कृपया ध्यान दें।\n\n*नोट: समाधान एक आधिकारिक सरकारी पोर्टल नहीं है।*\n\n[विवरण और समर्थन](${shareUrl})`
    : `${issue.description}\n\n---\n\n**Community Support:** ${issue.supporterCount} citizens\n\n**${handle}**, please take note.\n\n*Note: Samadhan is not an official government portal.*\n\n[View Details and Support](${shareUrl})`;
  return { title: title.slice(0, 300), body: body.slice(0, 10000) };
}

export function generateWhatsApp({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = getLocationLabel(issue, lang);
  const handle = authority?.handles?.whatsapp || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const msg = lang === 'hi'
    ? `${tier >= 2 ? '📢 *सार्वजनिक अभियान*' : '🚨 *नागरिक मुद्दा*'}: ${categoryLabel} — ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 400)}\n\n👥 ${issue.supporterCount} नागरिक साथ। ${handle} कृपया ध्यान दें।\n\n_समाधान आधिकारिक सरकारी पोर्टल नहीं है।_\n\n${shareUrl}`
    : `${tier >= 2 ? '📢 *Public Action*' : '🚨 *Civic Issue*'}: ${categoryLabel} — ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 400)}\n\n👥 ${issue.supporterCount} citizens supporting. ${handle}, please take note.\n\n_Samadhan is not an official government portal._\n\n${shareUrl}`;
  return msg.slice(0, 2000);
}

export function generateTelegram({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = getLocationLabel(issue, lang);
  const handle = authority?.handles?.telegram || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const hashtags = buildHashtags(issue.category, issue.location?.city, issue.location?.state);
  const msg = lang === 'hi'
    ? `🚨 <b>${categoryLabel}</b> - ${location}\n\n<b>${issue.title}</b>\n\n${issue.description.slice(0, 500)}\n\n👥 ${issue.supporterCount} नागरिकों ने साथ दिया\n\n${handle} कृपया ध्यान दें।\n\n<i>समाधान आधिकारिक सरकारी पोर्टल नहीं है।</i>\n\n${hashtags.join(' ')}\n\n${shareUrl}`
    : `🚨 <b>${categoryLabel}</b> - ${location}\n\n<b>${issue.title}</b>\n\n${issue.description.slice(0, 500)}\n\n👥 ${issue.supporterCount} citizens supporting\n\n${handle}, please take note.\n\n<i>Samadhan is not an official government portal.</i>\n\n${hashtags.join(' ')}\n\n${shareUrl}`;
  return msg.slice(0, 1000);
}
