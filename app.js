const translations = {
  en: {
    'app_title': 'AgriChain',
    'login': 'Login',
    'register': 'Register',
    'email': 'Email Address',
    'password': 'Password',
    'name': 'Full Name',
    'role': 'Select Role',
    'farmer': 'Farmer',
    'retailer': 'Retailer',
    'customer': 'Customer',
    'location': 'Location (Village/City)',
    'submit': 'Submit',
    'add_product': 'Add New Product',
    'product_id': 'Product ID',
    'product_name': 'Product Name',
    'certification': 'Certification',
    'farm_price': 'Farm Price (₹/kg)',
    'quantity': 'Quantity (kg)',
    'harvest_date': 'Harvest Date',
    'my_products': 'My Products',
    'available_products': 'Available Products',
    'buy': 'Buy',
    'scan_qr': 'Scan QR Code',
    'journey': 'Product Journey',
    'logout': 'Logout',
    'welcome': 'Welcome',
    'update_journey': 'Update Journey',
    'stage': 'Stage',
    'notes': 'Notes',
    'price_at_stage': 'Price at this stage (₹/kg)',
    'organic': 'Organic',
    'standard': 'Standard',
    'status': 'Status',
    'action': 'Action'
  },
  gu: {
    'app_title': 'એગ્રીચેન (AgriChain)',
    'login': 'પ્રવેશ (Login)',
    'register': 'નોંધણી (Register)',
    'email': 'ઈમેલ સરનામું',
    'password': 'પાસવર્ડ',
    'name': 'સંપૂર્ણ નામ',
    'role': 'તમારી ભૂમિકા પસંદ કરો',
    'farmer': 'ખેડૂત',
    'retailer': 'છૂટક વેપારી (Retailer)',
    'customer': 'ગ્રાહક',
    'location': 'સ્થળ (ગામ/શહેર)',
    'submit': 'માહિતી જમા કરો',
    'add_product': 'નવું ઉત્પાદન ઉમેરો',
    'product_id': 'ઉત્પાદન ID',
    'product_name': 'પાક / ઉત્પાદનનું નામ',
    'certification': 'પ્રમાણપત્ર',
    'farm_price': 'ખેડૂતનો ભાવ (₹/kg)',
    'quantity': 'જથ્થો (kg)',
    'harvest_date': 'પાક લણણીની તારીખ',
    'my_products': 'મારા ઉત્પાદનો',
    'available_products': 'ઉપલબ્ધ ઉત્પાદનો',
    'buy': 'ખરીદો',
    'scan_qr': 'QR કોડ સ્કેન કરો',
    'journey': 'ઉત્પાદનની સફર (Supply Chain)',
    'logout': 'બહાર નીકળો (Logout)',
    'welcome': 'સ્વાગત છે',
    'update_journey': 'સફરની માહિતી અપડેટ કરો',
    'stage': 'તબક્કો',
    'notes': 'નોંધ',
    'price_at_stage': 'આ તબક્કાનો ભાવ (₹/kg)',
    'organic': 'ઓર્ગેનિક (જૈવિક)',
    'standard': 'સામાન્ય (Standard)',
    'status': 'સ્થિતિ',
    'action': 'પગલાં (Action)'
  },
  hi: {
    'app_title': 'एग्रीचेन (AgriChain)',
    'login': 'लॉगिन (प्रवेश)',
    'register': 'पंजीकरण (Register)',
    'email': 'ईमेल पता',
    'password': 'पासवर्ड',
    'name': 'पूरा नाम',
    'role': 'अपनी भूमिका चुनें',
    'farmer': 'किसान',
    'retailer': 'खुदरा व्यापारी (Retailer)',
    'customer': 'ग्राहक',
    'location': 'पता (गाँव/शहर)',
    'submit': 'जमा करें',
    'add_product': 'नया उत्पाद (फसल) जोड़ें',
    'product_id': 'उत्पाद आईडी',
    'product_name': 'फसल / उत्पाद का नाम',
    'certification': 'प्रमाणपत्र',
    'farm_price': 'किसान की कीमत (₹/kg)',
    'quantity': 'मात्रा (kg)',
    'harvest_date': 'फसल कटाई की तारीख',
    'my_products': 'मेरे उत्पाद',
    'available_products': 'उपलब्ध उत्पाद',
    'buy': 'खरीदें',
    'scan_qr': 'QR स्कैन करें',
    'journey': 'उत्पाद की आपूर्ति श्रृंखला',
    'logout': 'लॉगआउट (बाहर जाएं)',
    'welcome': 'स्वागत है',
    'update_journey': 'आपूर्ति चरण अपडेट करें',
    'stage': 'चरण',
    'notes': 'टिप्पणी (Notes)',
    'price_at_stage': 'इस चरण पर कीमत (₹/kg)',
    'organic': 'जैविक',
    'standard': 'सामान्य',
    'status': 'स्थिति',
    'action': 'कार्रवाई'
  }
};

let currentLang = localStorage.getItem('agri_lang') || 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('agri_lang', lang);
  updatePageTranslations();
  
  // Try to update user pref in DB
  fetch('/api/users/language', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: lang })
  }).catch(e => console.error(e));
}

function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang] && translations[currentLang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translations[currentLang][key];
      } else {
        el.textContent = translations[currentLang][key];
      }
    }
  });
}

function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.backgroundColor = isError ? 'var(--error-color)' : 'var(--text-main)';
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initial translation on load
document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  updatePageTranslations();
});
