// Formal escalation email. Facts only, bilingual (English block then Hindi
// block). NEVER includes: individual officer names, reporter identity or
// contacts, money amounts, demands/threats/accusatory language.

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function issueFacts(issue, clientUrl) {
  const [lng, lat] = issue.location?.coordinates ?? [];
  const address = [issue.location?.address, issue.location?.city, issue.location?.state, issue.location?.pincode]
    .filter(Boolean)
    .join(', ');
  return {
    title: issue.title,
    category: issue.category,
    address,
    mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    coordinates: `${lat}, ${lng}`,
    reportedAt: new Date(issue.createdAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    supporterCount: issue.supporterCount,
    issueUrl: `${clientUrl}/issues/${issue._id}`,
    photos: (issue.photos ?? []).slice(0, 3),
  };
}

export function renderEscalationEmail({ issue, authority, clientUrl }) {
  const f = issueFacts(issue, clientUrl);
  const department = authority?.department ?? 'Civic Grievance Redressal';
  const subject = `Community issue escalation: ${f.title}`;

  const disclaimerEn =
    'Samadhan is a community issue-tracking prototype and NOT an official government portal. This message is shared for information and civic follow-up only.';
  const disclaimerHi =
    'समाधान एक सामुदायिक समस्या-ट्रैकिंग प्रोटोटाइप है, कोई आधिकारिक सरकारी पोर्टल नहीं। यह संदेश केवल जानकारी और नागरिक अनुवर्ती कार्रवाई हेतु साझा किया गया है।';

  const bodyText = [
    `To,`,
    `The Officer-in-charge, ${department}`,
    ``,
    `Respected Sir/Madam,`,
    ``,
    `Residents have reported the following public civic issue on Samadhan:`,
    ``,
    `Issue: ${f.title}`,
    `Category: ${f.category}`,
    `Location: ${f.address}`,
    `Coordinates: ${f.coordinates}`,
    `Map: ${f.mapLink}`,
    `Reported on: ${f.reportedAt}`,
    `Residents supporting this issue: ${f.supporterCount}`,
    `Public issue page: ${f.issueUrl}`,
    ...(f.photos.length ? [`Photos:`, ...f.photos] : []),
    ``,
    `We request your kind attention to this matter at your convenience.`,
    ``,
    disclaimerEn,
    ``,
    `--- हिंदी ---`,
    ``,
    `सेवा में,`,
    `प्रभारी अधिकारी, ${department}`,
    ``,
    `महोदय/महोदया,`,
    ``,
    `निवासियों ने समाधान पर निम्नलिखित सार्वजनिक नागरिक समस्या दर्ज की है:`,
    ``,
    `समस्या: ${f.title}`,
    `श्रेणी: ${f.category}`,
    `स्थान: ${f.address}`,
    `निर्देशांक: ${f.coordinates}`,
    `मानचित्र: ${f.mapLink}`,
    `रिपोर्ट दिनांक: ${f.reportedAt}`,
    `समर्थन करने वाले निवासी: ${f.supporterCount}`,
    `सार्वजनिक पृष्ठ: ${f.issueUrl}`,
    ...(f.photos.length ? [`फ़ोटो:`, ...f.photos] : []),
    ``,
    `कृपया सुविधानुसार इस विषय पर ध्यान दें।`,
    ``,
    disclaimerHi,
  ].join('\n');

  const photoHtml = f.photos.length
    ? `<p><strong>Photos:</strong></p><ul>${f.photos.map((p) => `<li><a href="${escapeHtml(p)}">${escapeHtml(p)}</a></li>`).join('')}</ul>`
    : '';
  const photoHtmlHi = f.photos.length
    ? `<p><strong>फ़ोटो:</strong></p><ul>${f.photos.map((p) => `<li><a href="${escapeHtml(p)}">${escapeHtml(p)}</a></li>`).join('')}</ul>`
    : '';

  const bodyHtml = `
<div style="font-family:Arial,'Noto Sans Devanagari',sans-serif;font-size:14px;color:#0f172a;max-width:640px">
  <p>To,<br/>The Officer-in-charge, ${escapeHtml(department)}</p>
  <p>Respected Sir/Madam,</p>
  <p>Residents have reported the following public civic issue on Samadhan:</p>
  <table cellpadding="6" style="border-collapse:collapse;border:1px solid #e2e8f0">
    <tr><td><strong>Issue</strong></td><td>${escapeHtml(f.title)}</td></tr>
    <tr><td><strong>Category</strong></td><td>${escapeHtml(f.category)}</td></tr>
    <tr><td><strong>Location</strong></td><td>${escapeHtml(f.address)}</td></tr>
    <tr><td><strong>Coordinates</strong></td><td>${escapeHtml(f.coordinates)}</td></tr>
    <tr><td><strong>Map</strong></td><td><a href="${escapeHtml(f.mapLink)}">OpenStreetMap</a></td></tr>
    <tr><td><strong>Reported on</strong></td><td>${escapeHtml(f.reportedAt)}</td></tr>
    <tr><td><strong>Residents supporting</strong></td><td>${f.supporterCount}</td></tr>
    <tr><td><strong>Public issue page</strong></td><td><a href="${escapeHtml(f.issueUrl)}">${escapeHtml(f.issueUrl)}</a></td></tr>
  </table>
  ${photoHtml}
  <p>We request your kind attention to this matter at your convenience.</p>
  <p style="color:#64748b;font-size:12px">${escapeHtml(disclaimerEn)}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0"/>
  <p>सेवा में,<br/>प्रभारी अधिकारी, ${escapeHtml(department)}</p>
  <p>महोदय/महोदया,</p>
  <p>निवासियों ने समाधान पर निम्नलिखित सार्वजनिक नागरिक समस्या दर्ज की है:</p>
  <table cellpadding="6" style="border-collapse:collapse;border:1px solid #e2e8f0">
    <tr><td><strong>समस्या</strong></td><td>${escapeHtml(f.title)}</td></tr>
    <tr><td><strong>श्रेणी</strong></td><td>${escapeHtml(f.category)}</td></tr>
    <tr><td><strong>स्थान</strong></td><td>${escapeHtml(f.address)}</td></tr>
    <tr><td><strong>निर्देशांक</strong></td><td>${escapeHtml(f.coordinates)}</td></tr>
    <tr><td><strong>मानचित्र</strong></td><td><a href="${escapeHtml(f.mapLink)}">OpenStreetMap</a></td></tr>
    <tr><td><strong>रिपोर्ट दिनांक</strong></td><td>${escapeHtml(f.reportedAt)}</td></tr>
    <tr><td><strong>समर्थन करने वाले निवासी</strong></td><td>${f.supporterCount}</td></tr>
    <tr><td><strong>सार्वजनिक पृष्ठ</strong></td><td><a href="${escapeHtml(f.issueUrl)}">${escapeHtml(f.issueUrl)}</a></td></tr>
  </table>
  ${photoHtmlHi}
  <p>कृपया सुविधानुसार इस विषय पर ध्यान दें।</p>
  <p style="color:#64748b;font-size:12px">${escapeHtml(disclaimerHi)}</p>
</div>`.trim();

  return { subject, bodyText, bodyHtml };
}
