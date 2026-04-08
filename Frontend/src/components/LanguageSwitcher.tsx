import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-2 py-1 transition-colors text-text-secondary hover:text-[#a3e635] text-sm font-medium"
      title={i18n.language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
    >
      <Languages size={18} />
      <span>{i18n.language === 'en' ? 'EN' : 'VI'}</span>
    </button>
  );
};

export default LanguageSwitcher;
