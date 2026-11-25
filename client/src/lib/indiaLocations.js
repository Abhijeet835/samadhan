// Complete official list of 28 Indian States and 8 Union Territories (36 total)
// Mirrors server/src/constants/indiaLocations.js for bilingual UI selectors & filters.

export const INDIA_STATES_AND_UTS = Object.freeze([
  { code: 'AP', type: 'STATE', nameEn: 'Andhra Pradesh', nameHi: 'आंध्र प्रदेश', cities: [{ nameEn: 'Visakhapatnam', nameHi: 'विशाखापत्तनम', lat: 17.6868, lng: 83.2185, pincode: '530001' }, { nameEn: 'Vijayawada', nameHi: 'विजयवाड़ा', lat: 16.5062, lng: 80.648, pincode: '520001' }] },
  { code: 'AR', type: 'STATE', nameEn: 'Arunachal Pradesh', nameHi: 'अरुणाचल प्रदेश', cities: [{ nameEn: 'Itanagar', nameHi: 'ईटानगर', lat: 27.0844, lng: 93.6053, pincode: '791111' }] },
  { code: 'AS', type: 'STATE', nameEn: 'Assam', nameHi: 'असम', cities: [{ nameEn: 'Guwahati', nameHi: 'गुवाहाटी', lat: 26.1445, lng: 91.7362, pincode: '781001' }] },
  { code: 'BR', type: 'STATE', nameEn: 'Bihar', nameHi: 'बिहार', cities: [{ nameEn: 'Patna', nameHi: 'पटना', lat: 25.5941, lng: 85.1376, pincode: '800001' }, { nameEn: 'Gaya', nameHi: 'गया', lat: 24.7914, lng: 85.0002, pincode: '823001' }] },
  { code: 'CG', type: 'STATE', nameEn: 'Chhattisgarh', nameHi: 'छत्तीसगढ़', cities: [{ nameEn: 'Raipur', nameHi: 'रायपुर', lat: 21.2514, lng: 81.6296, pincode: '492001' }] },
  { code: 'GA', type: 'STATE', nameEn: 'Goa', nameHi: 'गोवा', cities: [{ nameEn: 'Panaji', nameHi: 'पणजी', lat: 15.4909, lng: 73.8278, pincode: '403001' }] },
  { code: 'GJ', type: 'STATE', nameEn: 'Gujarat', nameHi: 'गुजरात', cities: [{ nameEn: 'Ahmedabad', nameHi: 'अहमदाबाद', lat: 23.0225, lng: 72.5714, pincode: '380001' }, { nameEn: 'Surat', nameHi: 'सूरत', lat: 21.1702, lng: 72.8311, pincode: '395001' }] },
  { code: 'HR', type: 'STATE', nameEn: 'Haryana', nameHi: 'हरियाणा', cities: [{ nameEn: 'Gurugram', nameHi: 'गुरुग्राम', lat: 28.4595, lng: 77.0266, pincode: '122001' }, { nameEn: 'Faridabad', nameHi: 'फरीदाबाद', lat: 28.4089, lng: 77.3178, pincode: '121001' }] },
  { code: 'HP', type: 'STATE', nameEn: 'Himachal Pradesh', nameHi: 'हिमाचल प्रदेश', cities: [{ nameEn: 'Shimla', nameHi: 'शिमला', lat: 31.1048, lng: 77.1734, pincode: '171001' }] },
  { code: 'JH', type: 'STATE', nameEn: 'Jharkhand', nameHi: 'झारखंड', cities: [{ nameEn: 'Ranchi', nameHi: 'रांची', lat: 23.3441, lng: 85.3096, pincode: '834001' }, { nameEn: 'Jamshedpur', nameHi: 'जमशेदपुर', lat: 22.8046, lng: 86.2029, pincode: '831001' }] },
  { code: 'KA', type: 'STATE', nameEn: 'Karnataka', nameHi: 'कर्नाटक', cities: [{ nameEn: 'Bengaluru', nameHi: 'बेंगलुरु', lat: 12.9716, lng: 77.5946, pincode: '560001' }, { nameEn: 'Mysuru', nameHi: 'मैसूरु', lat: 12.2958, lng: 76.6394, pincode: '570001' }] },
  { code: 'KL', type: 'STATE', nameEn: 'Kerala', nameHi: 'केरल', cities: [{ nameEn: 'Kochi', nameHi: 'कोच्चि', lat: 9.9312, lng: 76.2673, pincode: '682001' }, { nameEn: 'Thiruvananthapuram', nameHi: 'तिरुवनंतपुरम', lat: 8.5241, lng: 76.9366, pincode: '695001' }] },
  { code: 'MP', type: 'STATE', nameEn: 'Madhya Pradesh', nameHi: 'मध्य प्रदेश', cities: [{ nameEn: 'Bhopal', nameHi: 'भोपाल', lat: 23.2599, lng: 77.4126, pincode: '462001' }, { nameEn: 'Indore', nameHi: 'इंदौर', lat: 22.7196, lng: 75.8577, pincode: '452001' }] },
  { code: 'MH', type: 'STATE', nameEn: 'Maharashtra', nameHi: 'महाराष्ट्र', cities: [{ nameEn: 'Mumbai', nameHi: 'मुंबई', lat: 19.076, lng: 72.8777, pincode: '400001' }, { nameEn: 'Pune', nameHi: 'पुणे', lat: 18.5204, lng: 73.8567, pincode: '411001' }] },
  { code: 'MN', type: 'STATE', nameEn: 'Manipur', nameHi: 'मणिपुर', cities: [{ nameEn: 'Imphal', nameHi: 'इंफाल', lat: 24.817, lng: 93.9368, pincode: '795001' }] },
  { code: 'ML', type: 'STATE', nameEn: 'Meghalaya', nameHi: 'मेघालय', cities: [{ nameEn: 'Shillong', nameHi: 'शिलांग', lat: 25.5788, lng: 91.8933, pincode: '793001' }] },
  { code: 'MZ', type: 'STATE', nameEn: 'Mizoram', nameHi: 'मिजोरम', cities: [{ nameEn: 'Aizawl', nameHi: 'आइजोल', lat: 23.7271, lng: 92.7176, pincode: '796001' }] },
  { code: 'NL', type: 'STATE', nameEn: 'Nagaland', nameHi: 'नागालैंड', cities: [{ nameEn: 'Kohima', nameHi: 'कोहिमा', lat: 25.6751, lng: 94.1086, pincode: '797001' }] },
  { code: 'OD', type: 'STATE', nameEn: 'Odisha', nameHi: 'ओडिशा', cities: [{ nameEn: 'Bhubaneswar', nameHi: 'भुवनेश्वर', lat: 20.2961, lng: 85.8245, pincode: '751001' }] },
  { code: 'PB', type: 'STATE', nameEn: 'Punjab', nameHi: 'पंजाब', cities: [{ nameEn: 'Ludhiana', nameHi: 'लुधियाना', lat: 30.901, lng: 75.8573, pincode: '141001' }, { nameEn: 'Amritsar', nameHi: 'अमृतसर', lat: 31.634, lng: 74.8723, pincode: '143001' }] },
  { code: 'RJ', type: 'STATE', nameEn: 'Rajasthan', nameHi: 'राजस्थान', cities: [{ nameEn: 'Jaipur', nameHi: 'जयपुर', lat: 26.9124, lng: 75.7873, pincode: '302001' }, { nameEn: 'Udaipur', nameHi: 'उदयपुर', lat: 24.5854, lng: 73.7125, pincode: '313001' }] },
  { code: 'SK', type: 'STATE', nameEn: 'Sikkim', nameHi: 'सिक्किम', cities: [{ nameEn: 'Gangtok', nameHi: 'गंगटोक', lat: 27.3389, lng: 88.6065, pincode: '737101' }] },
  { code: 'TN', type: 'STATE', nameEn: 'Tamil Nadu', nameHi: 'तमिलनाडु', cities: [{ nameEn: 'Chennai', nameHi: 'चेन्नई', lat: 13.0827, lng: 80.2707, pincode: '600001' }, { nameEn: 'Coimbatore', nameHi: 'कोयंबटूर', lat: 11.0168, lng: 76.9558, pincode: '641001' }] },
  { code: 'TG', type: 'STATE', nameEn: 'Telangana', nameHi: 'तेलंगाना', cities: [{ nameEn: 'Hyderabad', nameHi: 'हैदराबाद', lat: 17.385, lng: 78.4867, pincode: '500001' }] },
  { code: 'TR', type: 'STATE', nameEn: 'Tripura', nameHi: 'त्रिपुरा', cities: [{ nameEn: 'Agartala', nameHi: 'अगरतला', lat: 23.8315, lng: 91.2868, pincode: '799001' }] },
  { code: 'UP', type: 'STATE', nameEn: 'Uttar Pradesh', nameHi: 'उत्तर प्रदेश', cities: [{ nameEn: 'Lucknow', nameHi: 'लखनऊ', lat: 26.8467, lng: 80.9462, pincode: '226001' }, { nameEn: 'Varanasi', nameHi: 'वाराणसी', lat: 25.3176, lng: 82.9739, pincode: '221001' }, { nameEn: 'Noida', nameHi: 'नोएडा', lat: 28.5355, lng: 77.391, pincode: '201301' }] },
  { code: 'UK', type: 'STATE', nameEn: 'Uttarakhand', nameHi: 'उत्तराखंड', cities: [{ nameEn: 'Dehradun', nameHi: 'देहरादून', lat: 30.3165, lng: 78.0322, pincode: '248001' }] },
  { code: 'WB', type: 'STATE', nameEn: 'West Bengal', nameHi: 'पश्चिम बंगाल', cities: [{ nameEn: 'Kolkata', nameHi: 'कोलकाता', lat: 22.5726, lng: 88.3639, pincode: '700001' }] },
  { code: 'AN', type: 'UT', nameEn: 'Andaman and Nicobar Islands', nameHi: 'अंडमान और निकोबार द्वीप समूह', cities: [{ nameEn: 'Sri Vijaya Puram', nameHi: 'श्री विजय पुरम', lat: 11.6234, lng: 92.7265, pincode: '744101' }] },
  { code: 'CH', type: 'UT', nameEn: 'Chandigarh', nameHi: 'चंडीगढ़', cities: [{ nameEn: 'Chandigarh', nameHi: 'चंडीगढ़', lat: 30.7333, lng: 76.7794, pincode: '160001' }] },
  { code: 'DN', type: 'UT', nameEn: 'Dadra and Nagar Haveli and Daman and Diu', nameHi: 'दादरा और नगर हवेली और दमन और दीव', cities: [{ nameEn: 'Daman', nameHi: 'दमन', lat: 20.3974, lng: 72.8328, pincode: '396210' }] },
  { code: 'DL', type: 'UT', nameEn: 'Delhi', nameHi: 'दिल्ली', cities: [{ nameEn: 'New Delhi', nameHi: 'नई दिल्ली', lat: 28.6139, lng: 77.209, pincode: '110001' }, { nameEn: 'Dwarka', nameHi: 'द्वारका', lat: 28.5921, lng: 77.046, pincode: '110075' }] },
  { code: 'JK', type: 'UT', nameEn: 'Jammu and Kashmir', nameHi: 'जम्मू और कश्मीर', cities: [{ nameEn: 'Srinagar', nameHi: 'श्रीनगर', lat: 34.0837, lng: 74.7973, pincode: '190001' }, { nameEn: 'Jammu', nameHi: 'जम्मू', lat: 32.7266, lng: 74.857, pincode: '180001' }] },
  { code: 'LA', type: 'UT', nameEn: 'Ladakh', nameHi: 'लद्दाख', cities: [{ nameEn: 'Leh', nameHi: 'लेह', lat: 34.1526, lng: 77.5771, pincode: '194101' }] },
  { code: 'LD', type: 'UT', nameEn: 'Lakshadweep', nameHi: 'लक्षद्वीप', cities: [{ nameEn: 'Kavaratti', nameHi: 'कवरत्ती', lat: 10.5669, lng: 72.642, pincode: '682555' }] },
  { code: 'PY', type: 'UT', nameEn: 'Puducherry', nameHi: 'पुडुचेरी', cities: [{ nameEn: 'Puducherry', nameHi: 'पुडुचेरी', lat: 11.9416, lng: 79.8083, pincode: '605001' }] },
]);

export function getStateLabel(stateNameEn, lang = 'en') {
  if (!stateNameEn) return '';
  const match = INDIA_STATES_AND_UTS.find(
    (s) => s.nameEn.toLowerCase() === String(stateNameEn).trim().toLowerCase() || s.code.toLowerCase() === String(stateNameEn).trim().toLowerCase(),
  );
  if (!match) return stateNameEn;
  return lang === 'hi' ? match.nameHi : match.nameEn;
}

export function getCitiesForState(stateNameEn) {
  if (!stateNameEn) return [];
  const match = INDIA_STATES_AND_UTS.find(
    (s) => s.nameEn.toLowerCase() === String(stateNameEn).trim().toLowerCase() || s.code.toLowerCase() === String(stateNameEn).trim().toLowerCase(),
  );
  return match ? match.cities : [];
}
