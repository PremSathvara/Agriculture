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
    'login': 'લૉગિન',
    'register': 'રજીસ્ટર',
    'email': 'ઈમેલ સરનામું',
    'password': 'પાસવર્ડ',
    'name': 'પૂરું નામ',
    'role': 'રોલ પસંદ કરો',
    'farmer': 'ખેડૂત',
    'retailer': 'વેપારી',
    'customer': 'ગ્રાહક',
    'location': 'સ્થળ (ગામ/શહેર)',
    'submit': 'સબમિટ કરો',
    'add_product': 'નવી પ્રોડક્ટ ઉમેરો',
    'product_id': 'પ્રોડક્ટ ID',
    'product_name': 'પ્રોડક્ટનું નામ',
    'certification': 'પ્રમાણપત્ર',
    'farm_price': 'ખેતરનો ભાવ (₹/kg)',
    'quantity': 'જથ્થો (kg)',
    'harvest_date': 'લણણીની તારીખ',
    'my_products': 'મારી પ્રોડક્ટ્સ',
    'available_products': 'ઉપલબ્ધ પ્રોડક્ટ્સ',
    'buy': 'ખરીદો',
    'scan_qr': 'QR સ્કેન કરો',
    'journey': 'પ્રોડક્ટની સફર',
    'logout': 'લૉગઆઉટ',
    'welcome': 'સ્વાગત છે',
    'update_journey': 'સફર અપડેટ કરો',
    'stage': 'તબક્કો',
    'notes': 'નોંધ',
    'price_at_stage': 'આ તબક્કે ભાવ (₹/kg)',
    'organic': 'ઓર્ગેનિક (જૈવિક)',
    'standard': 'સામાન્ય',
    'status': 'સ્થિતિ',
    'action': 'ક્રિયા'
  },
  hi: {
    'app_title': 'एग्रीचेन (AgriChain)',
    'login': 'लॉगिन',
    'register': 'रजिस्टर',
    'email': 'ईमेल पता',
    'password': 'पासवर्ड',
    'name': 'पूरा नाम',
    'role': 'भूमिका चुनें',
    'farmer': 'किसान',
    'retailer': 'व्यापारी',
    'customer': 'ग्राहक',
    'location': 'स्थान (गांव/शहर)',
    'submit': 'जमा करें',
    'add_product': 'नया उत्पाद जोड़ें',
    'product_id': 'उत्पाद ID',
    'product_name': 'उत्पाद का नाम',
    'certification': 'प्रमाणपत्र',
    'farm_price': 'खेत की कीमत (₹/kg)',
    'quantity': 'मात्रा (kg)',
    'harvest_date': 'फसल कटाई की तारीख',
    'my_products': 'मेरे उत्पाद',
    'available_products': 'उपलब्ध उत्पाद',
    'buy': 'खरीदें',
    'scan_qr': 'QR स्कैन करें',
    'journey': 'उत्पाद की यात्रा',
    'logout': 'लॉगआउट',
    'welcome': 'स्वागत है',
    'update_journey': 'यात्रा अपडेट करें',
    'stage': 'चरण',
    'notes': 'नोट्स',
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
