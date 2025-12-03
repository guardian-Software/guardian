'use client';

import '../globals.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const Nav = ({ setSelectedSection, handleLogout, user, selectedSection, watchingZoneName, onLogoClick }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const t = useTranslations('nav');

  const handleSectionChange = (section) => {
    setSelectedSection(section);
    setShowDropdown(false);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <nav className="navigation">
      <div className="navigation-logo">
        <button onClick={onLogoClick || (() => handleSectionChange('explore'))}>
          <h1>Red Guardian</h1>
        </button>
      </div>
      {selectedSection === 'my-zone' && watchingZoneName && (
        <div className="navigation-zone">
          <span className="zone-indicator">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 0C3.79 0 2 1.79 2 4c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4zm0 5.5c-.83 0-1.5-.67-1.5-1.5S5.17 2.5 6 2.5s1.5.67 1.5 1.5S6.83 5.5 6 5.5z"/>
            </svg>
            <p>ddddd</p>
            {watchingZoneName}
          </span>
        </div>
      )}
      <div key="dropdown" className="navigation-dropdown">
        <button className="dropdown-toggle" onClick={toggleDropdown}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="4" r="1.5"/>
            <circle cx="10" cy="10" r="1.5"/>
            <circle cx="10" cy="16" r="1.5"/>
          </svg>
        </button>
        {showDropdown && (
           <div className="dropdown-menu">
             <button onClick={() => router.push('/help')}>{t('help')}</button>
             <button onClick={() => router.push('/legal')}>{t('legal')}</button>
             {user && (
               <button onClick={() => handleSectionChange('report-problem')}>{t('reportProblem')}</button>
             )}
             {user && (
               <>
                 <div className="dropdown-divider"></div>
                 <button onClick={handleLogout}>{t('exit')}</button>
               </>
             )}
           </div>
         )}
      </div>
    </nav>
  );
};

export default Nav;