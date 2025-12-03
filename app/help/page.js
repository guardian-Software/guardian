'use client';

import '../globals.css';

import Nav from '../components/Nav';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { auth, db } from '../../lib/firebase';

import { signOut, onAuthStateChanged } from 'firebase/auth';

import { doc, getDoc } from "firebase/firestore";

const HelpPage = () => {

  const router = useRouter();

  const [user, setUser] = useState(null);

  const [watchingZoneName, setWatchingZoneName] = useState('');

  const selectedSection = 'help';

  // SEO metadata
  const pageTitle = "Help & Support - Red Guardian";
  const pageDescription = "Get help and support for using Red Guardian. Learn how to report incidents, navigate the app, and collaborate with your community for better safety.";
  const canonicalUrl = "https://guardian.red/help";

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

  const Help = () => (

    <div className="help-section">

      <div className="section-header">

        <h1>Help & Support</h1>

        <p>Get assistance with using Red Guardian</p>

      </div>

      <div className="help-content">

        <div className="help-item">

          <h3>Getting Started</h3>

          <p>Welcome to Red Guardian! Here's how to get started:</p>

          <ul>

            <li>Create an account or sign in</li>

            <li>Select your watching zone</li>

            <li>Explore reports in your area</li>

            <li>Report issues you encounter</li>

          </ul>

        </div>

        <div className="help-item">

          <h3>Reporting Issues</h3>

          <p>To report a safety or community issue:</p>

          <ul>

            <li>Tap the "+" button</li>

            <li>Choose "Problem Report"</li>

            <li>Add a clear description and photo/video</li>

            <li>Submit your report</li>

          </ul>

        </div>

        <div className="help-item">

          <h3>Navigation</h3>

          <p>Use the bottom navigation to switch between:</p>

          <ul>

            <li><strong>Explore:</strong> All reports from all zones</li>

            <li><strong>My Zone:</strong> Issues in your watching zone</li>

            <li><strong>Profile:</strong> Your account and settings</li>

          </ul>

        </div>

        <div className="help-item">

          <h3>Comments & Collaboration</h3>

          <p>Engage with the community:</p>

          <ul>

            <li>Comment on reports</li>

            <li>Reply to comments</li>

            <li>Collaborate on solutions</li>

            <li>Follow reports you're interested in</li>

          </ul>

        </div>

        <div className="help-item">

          <h3>Data Deletion</h3>

          <p>If you want your data to be deleted:</p>

          <p>Email: capitals.3c@gmail.com</p>

          <p>All personal info will be deleted. Posts will be anonimized and kept.</p>

          <p>You can also contact us if you want just some of your data to be deleted.</p>

        </div>

        <div className="help-item">

          <h3>Contact Support</h3>

          <p>If you need further assistance:</p>

          <p>Email: capitals.3c@gmail.com</p>

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
        <meta name="keywords" content="help, support, red guardian, community safety, incident reporting, user guide, troubleshooting" />
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

        <Help />

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

export default HelpPage;