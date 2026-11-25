/**
 * PURE deterministic functions: 8 categories × EN/HI × tier (1 Spotlight / 2 Escalation) × platform.
 * Never money amounts, never reporter PII, never individual officer names.
 */

const CATEGORY_LABELS = {
  ROAD: { en: 'road issue', hi: 'सड़क समस्या' },
  GARBAGE: { en: 'garbage issue', hi: 'कचरा समस्या' },
  WATER: { en: 'water supply issue', hi: 'पानी की समस्या' },
  STREETLIGHT: { en: 'streetlight issue', hi: 'स्ट्रीटलाइट समस्या' },
  SEWAGE: { en: 'sewage issue', hi: 'नाली समस्या' },
  ELECTRICITY: { en: 'electricity issue', hi: 'बिजली समस्या' },
  PARK: { en: 'park maintenance issue', hi: 'पार्क रखरखाव समस्या' },
  OTHER: { en: 'civic issue', hi: 'नागरिक समस्या' },
};

function getCategoryLabel(category, lang) {
  return CATEGORY_LABELS[category]?.[lang] || CATEGORY_LABELS.OTHER[lang];
}

function buildHashtags(category, city) {
  const tags = ['#Samadhan'];
  
  if (city) {
    const cityTag = city.replace(/\s+/g, '');
    tags.push(`#${cityTag}`);
  }
  
  if (category && category !== 'OTHER') {
    tags.push(`#${category.toLowerCase()}`);
  }
  
  return tags.slice(0, 5); // Max 5 hashtags
}

function truncateForX(text, url) {
  // X limit is 280 chars INCLUDING the URL
  const urlLength = url.length + 1; // +1 for space
  const maxText = 280 - urlLength;
  
  if (text.length <= maxText) return text;
  
  // Truncate text, never the URL
  return text.slice(0, maxText - 3).trim() + '...';
}

export function generateX({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = issue.location?.city || issue.location?.address || 'your area';
  const handle = authority?.handles?.x || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const supporterText = issue.supporterCount > 1
    ? (lang === 'hi' ? ` ${issue.supporterCount} लोग साथ।` : ` ${issue.supporterCount} people supporting.`)
    : '';

  let text;
  if (tier === 1) {
    // Spotlight: factual alert
    text = lang === 'hi'
      ? `🚨 ${location} में ${categoryLabel}: ${issue.title}.${supporterText} ${handle} कृपया ध्यान दें।`
      : `🚨 ${categoryLabel} in ${location}: ${issue.title}.${supporterText} ${handle}, please take note.`;
  } else {
    // Escalation: formal
    text = lang === 'hi'
      ? `📢 ${location} में ${categoryLabel} के लिए औपचारिक एस्केलेशन: ${issue.title}. समुदाय ने ध्यान दिया है। ${handle} कृपया कार्रवाई करें।`
      : `📢 Formal escalation for ${categoryLabel} in ${location}: ${issue.title}. The community has taken note. ${handle}, please take action.`;
  }
  
  const hashtags = buildHashtags(issue.category, issue.location?.city);
  const withHashtags = `${text} ${hashtags.join(' ')}`;
  
  return truncateForX(withHashtags, shareUrl) + ` ${shareUrl}`;
}

export function generateInstagram({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = issue.location?.city || issue.location?.address || 'your area';
  const handle = authority?.handles?.instagram || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const hashtags = buildHashtags(issue.category, issue.location?.city);
  
  let caption;
  if (tier === 1) {
    caption = lang === 'hi'
      ? `🚨 ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 300)}...\n\nसमुदाय ने इस मुद्दे को उठाया है। ${handle} कृपया ध्यान दें।\n\nसमाधान एक आधिकारिक सरकारी पोर्टल नहीं है। हम समुदाय की समस्याओं को पारदर्शी रूप से दर्ज करते हैं।\n\n${hashtags.join(' ')}\n\n${shareUrl}`
      : `🚨 ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 300)}...\n\nThe community has raised this issue. ${handle}, please take note.\n\nSamadhan is not an official government portal. We transparently record community issues.\n\n${hashtags.join(' ')}\n\n${shareUrl}`;
  } else {
    caption = lang === 'hi'
      ? `📢 औपचारिक एस्केलेशन: ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 300)}...\n\nयह मुद्दा समुदाय द्वारा आगे बढ़ाया गया है। ${handle} कृपया तत्काल कार्रवाई करें।\n\nसमाधान एक आधिकारिक सरकारी पोर्टल नहीं है।\n\n${hashtags.join(' ')}\n\n${shareUrl}`
      : `📢 Formal Escalation: ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 300)}...\n\nThis issue has been escalated by the community. ${handle}, please take immediate action.\n\nSamadhan is not an official government portal.\n\n${hashtags.join(' ')}\n\n${shareUrl}`;
  }
  
  // Instagram caption limit: 2200 chars
  return caption.slice(0, 2200);
}

export function generateFacebook({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = issue.location?.city || issue.location?.address || 'your area';
  const handle = authority?.handles?.facebook || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  
  let post;
  if (tier === 1) {
    post = lang === 'hi'
      ? `🚨 ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description}\n\nसमुदाय के ${issue.supporterCount} लोगों ने इस मुद्दे को उठाया है। ${handle} कृपया ध्यान दें।\n\nसमाधान एक आधिकारिक सरकारी पोर्टल नहीं है। हम नागरिक समस्याओं को पारदर्शी रूप से दर्ज और आगे बढ़ाते हैं।\n\nविवरण: ${shareUrl}`
      : `🚨 ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description}\n\n${issue.supporterCount} community members have raised this issue. ${handle}, please take note.\n\nSamadhan is not an official government portal. We transparently record and amplify civic issues.\n\nDetails: ${shareUrl}`;
  } else {
    post = lang === 'hi'
      ? `📢 औपचारिक एस्केलेशन: ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description}\n\nयह मुद्दा समुदाय द्वारा आगे बढ़ाया गया है। ${handle} कृपया तत्काल कार्रवाई करें।\n\nनोट: समाधान एक आधिकारिक सरकारी पोर्टल नहीं है।\n\n${shareUrl}`
      : `📢 Formal Escalation: ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description}\n\nThis issue has been escalated by the community. ${handle}, please take immediate action.\n\nNote: Samadhan is not an official government portal.\n\n${shareUrl}`;
  }
  
  return post.slice(0, 2200);
}

export function generateReddit({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = issue.location?.city || issue.location?.address || 'your area';
  const handle = authority?.handles?.reddit || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  
  const title = tier === 1
    ? (lang === 'hi' 
      ? `${categoryLabel} - ${location}: ${issue.title.slice(0, 200)}`
      : `${categoryLabel} in ${location}: ${issue.title.slice(0, 200)}`)
    : (lang === 'hi'
      ? `[औपचारिक एस्केलेशन] ${categoryLabel} - ${location}: ${issue.title.slice(0, 180)}`
      : `[Formal Escalation] ${categoryLabel} in ${location}: ${issue.title.slice(0, 180)}`);
  
  const body = lang === 'hi'
    ? `${issue.description}\n\n---\n\n**समुदाय समर्थन:** ${issue.supporterCount} लोग\n\n**${handle}** कृपया ${tier === 1 ? 'ध्यान दें' : 'तत्काल कार्रवाई करें'}।\n\n*नोट: समाधान एक आधिकारिक सरकारी पोर्टल नहीं है। हम नागरिक समस्याओं को पारदर्शी रूप से दर्ज करते हैं।*\n\n[विवरण और समर्थन](${shareUrl})`
    : `${issue.description}\n\n---\n\n**Community Support:** ${issue.supporterCount} people\n\n**${handle}**, please ${tier === 1 ? 'take note' : 'take immediate action'}.\n\n*Note: Samadhan is not an official government portal. We transparently record civic issues.*\n\n[View Details and Support](${shareUrl})`;
  
  return {
    title: title.slice(0, 300),
    body: body.slice(0, 10000),
  };
}

export function generateWhatsApp({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = issue.location?.city || issue.location?.address || 'your area';
  const handle = authority?.handles?.whatsapp || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  
  let message;
  if (tier === 1) {
    message = lang === 'hi'
      ? `🚨 *${categoryLabel}* - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 400)}...\n\n${issue.supporterCount} लोगों ने इस मुद्दे को उठाया है।\n\n${handle} कृपया ध्यान दें।\n\n_समाधान एक आधिकारिक सरकारी पोर्टल नहीं है।_\n\n${shareUrl}`
      : `🚨 *${categoryLabel}* - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 400)}...\n\n${issue.supporterCount} people have raised this issue.\n\n${handle}, please take note.\n\n_Samadhan is not an official government portal._\n\n${shareUrl}`;
  } else {
    message = lang === 'hi'
      ? `📢 *औपचारिक एस्केलेशन*: ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 400)}...\n\nसमुदाय द्वारा आगे बढ़ाया गया।\n\n${handle} कृपया तत्काल कार्रवाई करें।\n\n_नोट: समाधान आधिकारिक पोर्टल नहीं है।_\n\n${shareUrl}`
      : `📢 *Formal Escalation*: ${categoryLabel} - ${location}\n\n${issue.title}\n\n${issue.description.slice(0, 400)}...\n\nEscalated by the community.\n\n${handle}, please take immediate action.\n\n_Note: Samadhan is not an official government portal._\n\n${shareUrl}`;
  }
  
  return message.slice(0, 2000);
}

export function generateTelegram({ issue, authority, shareUrl, tier, lang }) {
  const categoryLabel = getCategoryLabel(issue.category, lang);
  const location = issue.location?.city || issue.location?.address || 'your area';
  const handle = authority?.handles?.telegram || (lang === 'hi' ? 'संबंधित विभाग' : 'the concerned department');
  const hashtags = buildHashtags(issue.category, issue.location?.city);
  
  let message;
  if (tier === 1) {
    message = lang === 'hi'
      ? `🚨 <b>${categoryLabel}</b> - ${location}\n\n<b>${issue.title}</b>\n\n${issue.description.slice(0, 500)}...\n\n👥 ${issue.supporterCount} लोगों ने साथ दिया\n\n${handle} कृपया ध्यान दें।\n\n<i>समाधान एक आधिकारिक सरकारी पोर्टल नहीं है।</i>\n\n${hashtags.join(' ')}\n\n${shareUrl}`
      : `🚨 <b>${categoryLabel}</b> - ${location}\n\n<b>${issue.title}</b>\n\n${issue.description.slice(0, 500)}...\n\n👥 ${issue.supporterCount} people supporting\n\n${handle}, please take note.\n\n<i>Samadhan is not an official government portal.</i>\n\n${hashtags.join(' ')}\n\n${shareUrl}`;
  } else {
    message = lang === 'hi'
      ? `📢 <b>औपचारिक एस्केलेशन</b>: ${categoryLabel} - ${location}\n\n<b>${issue.title}</b>\n\n${issue.description.slice(0, 500)}...\n\n👥 समुदाय द्वारा आगे बढ़ाया गया\n\n${handle} कृपया तत्काल कार्रवाई करें।\n\n<i>नोट: समाधान आधिकारिक पोर्टल नहीं है।</i>\n\n${hashtags.join(' ')}\n\n${shareUrl}`
      : `📢 <b>Formal Escalation</b>: ${categoryLabel} - ${location}\n\n<b>${issue.title}</b>\n\n${issue.description.slice(0, 500)}...\n\n👥 Escalated by the community\n\n${handle}, please take immediate action.\n\n<i>Note: Samadhan is not an official government portal.</i>\n\n${hashtags.join(' ')}\n\n${shareUrl}`;
  }
  
  // Telegram message limit: 4096 chars (with HTML), caption limit: 1024
  return message.slice(0, 1000); // Conservative limit for captions
}
