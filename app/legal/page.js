'use client';

import '../globals.css';

import Nav from '../components/Nav';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { auth, db } from '../../lib/firebase';

import { signOut, onAuthStateChanged } from 'firebase/auth';

import { doc, getDoc } from "firebase/firestore";

const LegalPage = () => {

  const router = useRouter();

  const [user, setUser] = useState(null);

  const [watchingZoneName, setWatchingZoneName] = useState('');

  const selectedSection = 'legal';

  // SEO metadata
  const pageTitle = "Legal Information - Terms of Service & Privacy Policy - Red Guardian";
  const pageDescription = "Read Red Guardian's terms of service, privacy policy, and community guidelines. Learn about our commitment to user privacy and community safety standards.";
  const canonicalUrl = "https://guardian.red/legal";

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (user) {

        setUser(user);

        // Check if user has watching zone

        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {

          const userData = userDoc.data();

          if (userData.watchingZone) {

            // Set watching zone name for display

            const zone = userData.watchingZone;

            setWatchingZoneName(`${zone.neighborhood}, ${zone.subZone1}`);

          }

        }

      } else {

        setUser(null);

      }

    });

    return () => unsubscribe();

  }, []);

  const handleLogout = async () => {

    try {

      await signOut(auth);

      router.push('/');

    } catch (error) {

      console.error('Error signing out:', error.message);

    }

  };

  const Legal = () => (

    <div className="legal-section">

      <div className="section-header">

        <h1>Legal Information</h1>

        <p>Terms of service and privacy policy</p>

      </div>

      <div className="legal-content">

        <div className="legal-item">

          <h3>Terms of Service</h3>

          <p><strong>Last updated:</strong> October 8, 2025</p>

          <h4>1. Acceptance of Terms</h4>

          <p>By accessing and using Red Guardian, you accept and agree to be bound by the terms and provision of this agreement.</p>

          <h4>2. Use License</h4>

          <p>Permission is granted to temporarily use Red Guardian for personal, non-commercial transitory viewing only.</p>

          <h4>3. User Responsibilities</h4>

          <p>Users are responsible for maintaining the confidentiality of their account and password. You agree to accept responsibility for all activities that occur under your account.</p>

          <h4>4. Content Guidelines</h4>

          <p>All reports and comments must be accurate, respectful, and related to community safety. False reports or abusive content may result in account suspension.</p>

        </div>

        <div className="legal-item">

          <h3>Privacy Policy</h3>

          <p><strong>Last updated:</strong> October 8, 2025</p>

          <h4>1. Information We Collect</h4>

          <p>We collect information you provide directly to us, such as when you create an account, report an issue, or contact us for support.</p>

          <h4>2. How We Use Information</h4>

          <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>

          <h4>3. Information Sharing</h4>

          <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>

          <h4>4. Data Security</h4>

          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

        </div>

        <div className="legal-item">

          <h3>Community Guidelines</h3>

          <h4>Reporting Standards</h4>

          <ul>

            <li>Reports must be genuine and verifiable</li>

            <li>Include clear descriptions and evidence</li>

            <li>Respect privacy of individuals involved</li>

            <li>Use appropriate language and tone</li>

          </ul>

          <h4>Collaboration</h4>

          <ul>

            <li>Work constructively toward solutions</li>

            <li>Respect diverse perspectives</li>

            <li>Maintain professional communication</li>

            <li>Focus on community safety and improvement</li>

          </ul>

        </div>

        <div className="legal-item">

          <h3>Standards Against Child Sexual Abuse and Exploitation (CSAE)</h3>

          <p>Red Guardian is committed to protecting children from sexual abuse and exploitation. We strictly prohibit any content, reports, or activities that involve or promote CSAE.</p>

          <ul>

            <li>All reports must be handled with sensitivity and in accordance with legal requirements</li>

            <li>We cooperate with law enforcement in cases involving CSAE</li>

            <li>Users found violating these standards will have their accounts immediately terminated</li>

          </ul>

        </div>

        <div className="legal-item">

          <h3>Contact Information</h3>

          <p>For legal inquiries or concerns:</p>

          <p>Email: legal@redguardian.app</p>

          <p>Address: 123 Guardian Street, Safety City, SC 12345</p>

        </div>

      </div>

    </div>

  );

  return (

    <div className="page">
      {/* SEO Head */}
      <head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="legal, terms of service, privacy policy, community guidelines, red guardian, user agreement, data protection" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
      </head>

      <Nav setSelectedSection={() => {}} handleLogout={handleLogout} user={user} selectedSection={selectedSection} watchingZoneName={watchingZoneName} onLogoClick={() => router.push('/')} />

      <main className="main">

        <Legal />

      </main>

      {user?.emailVerified ? (

        <div className="bottom-navigation">

          <button

            onClick={() => router.push('/?section=explore')}

            className={`nav-btn ${selectedSection === 'explore' ? 'active' : ''}`}

          >

            <span className="nav-label">Explore</span>

          </button>

          <button

            onClick={() => router.push('/?section=my-zone')}

            className={`nav-btn ${selectedSection === 'my-zone' ? 'active' : ''}`}

          >

            <span className="nav-label">My Zone</span>

          </button>

          <button

            onClick={() => router.push('/?section=profile')}

            className={`nav-btn ${selectedSection === 'profile' ? 'active' : ''}`}

          >

            <span className="nav-label">Profile</span>

          </button>

        </div>

      ) : (

        <div className="bottom-navigation">

          <button

            onClick={() => router.push('/?section=login')}

            className="nav-btn login-btn"

          >

            <span className="nav-label">Login</span>

          </button>

        </div>

      )}

    </div>

  );

};

export default LegalPage;