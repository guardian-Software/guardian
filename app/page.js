'use client';

import "./globals.css";
import Nav from './components/Nav';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Main from './main/Main';
import Leaders from './leaders/Leaders';
import Contribute from './contribute/page';
import Profile from './profile/Profile';
import Messages from './messages/Messages';
import Help from './help/page';
import Legal from './legal/page';
import ReportProblemModal from './components/ReportProblemModal';
import ReportModal from './components/ReportModal';

import { auth, db, storage } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";

export default function Home() {
  const router = useRouter();
  const currentUserUid = auth.currentUser?.uid;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('explore');

  // Debug viewport and content dimensions
  useEffect(() => {
    const logDimensions = () => {
      console.log('DEBUG: Viewport dimensions:', {
        width: window.innerWidth,
        height: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        bodyWidth: document.body.scrollWidth,
        bodyHeight: document.body.scrollHeight
      });
    };

    logDimensions();
    window.addEventListener('resize', logDimensions);
    return () => window.removeEventListener('resize', logDimensions);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get('section');
      const reportId = urlParams.get('reportId');
      
      if (reportId) {
        setSelectedReportId(reportId);
        setSelectedSection('view-report');
      } else if (section) {
        setSelectedSection(section);
      }
    }
  }, []);
  const [profileUserId, setProfileUserId] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showWatchingZoneModal, setShowWatchingZoneModal] = useState(false);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedAdministrativeZone1, setSelectedAdministrativeZone1] = useState(null);
  const [watchingZoneName, setWatchingZoneName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('DEBUG: Auth state changed, user:', user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null);
      console.log('DEBUG: Current auth.currentUser:', auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email, emailVerified: auth.currentUser.emailVerified } : null);
      if (user) {
        console.log('DEBUG: User is authenticated, setting user state');
        setUser(user);
        await checkVerificationStatus(user);
        setShowLoginModal(false);

        // Check if user has watching zone
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.watchingZoneId) {
            // Fetch zone data by ID
            const zoneDoc = await getDoc(doc(db, 'zones', userData.watchingZoneId));
            if (zoneDoc.exists()) {
              const zone = zoneDoc.data();
              setWatchingZoneName(zone.neighborhood);
            }
          } else {
            // Fetch zones data
            await fetchZones();
            setShowWatchingZoneModal(true);
          }
        }
      } else {
        console.log('DEBUG: No user authenticated, setting user to null');
        setUser(null);
        setWatchingZoneName(''); // Clear zone name when user logs out
      }
    });

    return () => unsubscribe();
  }, []);

  const checkVerificationStatus = async (user) => {
    console.log('DEBUG: checkVerificationStatus called with user:', user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null);
    await user.reload();
    const updatedUser = auth.currentUser;
    console.log('DEBUG: After reload, user:', updatedUser ? { uid: updatedUser.uid, email: updatedUser.email, emailVerified: updatedUser.emailVerified } : null);
    console.log('DEBUG: Setting user state to updatedUser');
    setUser(updatedUser);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    console.log('handleAuth called, isLogin:', isLogin, 'email:', email);

    if (!email || !password || (!isLogin && !name)) {
      setErrorMessage('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        console.log('Attempting signInWithEmailAndPassword');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('signInWithEmailAndPassword successful, userCredential:', userCredential);
        console.log('User after login:', userCredential.user ? { uid: userCredential.user.uid, email: userCredential.user.email, emailVerified: userCredential.user.emailVerified } : null);
      } else {
        console.log('Attempting createUserWithEmailAndPassword');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        console.log('createUserWithEmailAndPassword successful, userCredential:', userCredential);
        console.log('New user created:', newUser ? { uid: newUser.uid, email: newUser.email, emailVerified: newUser.emailVerified } : null);

        if (newUser) {
          await sendEmailVerification(newUser);
          console.log('Verification email sent!');

          const myCollection = doc(db, 'users', newUser.uid);
          const myDocumentData = {
            name: name,
            email: email,
            lastName: lastName,
          };

          await setDoc(myCollection, myDocumentData);
          console.log('Document added or updated successfully!');
          console.log('DEBUG: After signup, auth.currentUser:', auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email, emailVerified: auth.currentUser.emailVerified } : null);
          setErrorMessage('Please verify your email before proceeding.');
        } else {
          console.error('User authentication failed.');
          setErrorMessage('User authentication failed.');
        }
      }
    } catch (error) {
      console.error('Error authenticating:', error.code, error.message);
      console.log('Current auth user:', auth.currentUser?.uid);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedSection('explore');
      setProfileUserId(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error.message);
      setErrorMessage('Error signing out. Please try again later.');
    }
  };

  const handleResendVerification = async () => {
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        setErrorMessage('Verification email has been sent again.');
      } catch (error) {
        console.error('Error resending verification email:', error.message);
        setErrorMessage('Failed to resend the verification email.');
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address to reset your password.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMessage('Password reset email sent! Check your inbox.');
      setForgotPassword(false); // Close forgot password view
    } catch (error) {
      console.error('Error sending password reset email:', error.message);
      setErrorMessage('Failed to send reset email. Please try again.');
    }
  };

  const fetchZones = async () => {
    try {
      const zonesSnapshot = await getDocs(collection(db, 'zones'));
      const zonesData = zonesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setZones(zonesData);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleAdministrativeZone1Selection = (adminZone1) => {
    setSelectedAdministrativeZone1(adminZone1);
  };

  const handleZoneSelection = async (zone) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { watchingZoneId: zone.id, lastZoneChangeDate: serverTimestamp() }, { merge: true });
      setSelectedZone(zone);
      setWatchingZoneName(zone.neighborhood);
      setShowWatchingZoneModal(false);
      setSelectedAdministrativeZone1(null); // Reset for next time
    } catch (error) {
      console.error('Error saving watching zone:', error);
      setErrorMessage('Failed to save watching zone. Please try again.');
    }
  };

  const handleBackToAdminZones = () => {
    setSelectedAdministrativeZone1(null);
  };

  const closeWatchingZoneModal = () => {
    setShowWatchingZoneModal(false);
    setSelectedAdministrativeZone1(null);
  };

  useEffect(() => {
    if (selectedSection === 'login') {
      setShowLoginModal(true);
      setSelectedSection('main');
    }
  }, [selectedSection]);

  // Check watching zone when "My Zone" is selected
  useEffect(() => {
    const checkWatchingZoneForMyZone = async () => {
      if (selectedSection === 'my-zone' && user) {
        console.log('DEBUG: Checking watching zone for my-zone section');
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('DEBUG: User data:', userData);
            if (!userData.watchingZoneId) {
              console.log('DEBUG: No watching zone ID, showing modal');
              // Fetch zones data if not already fetched
              if (zones.length === 0) {
                await fetchZones();
              }
              setShowWatchingZoneModal(true);
            } else {
              console.log('DEBUG: User has watching zone ID:', userData.watchingZoneId);
              // User has a watching zone, set the name for display
              const zoneDoc = await getDoc(doc(db, 'zones', userData.watchingZoneId));
              if (zoneDoc.exists()) {
                const zone = zoneDoc.data();
                console.log('DEBUG: Zone data:', zone);
                console.log('DEBUG: Setting watching zone name to:', zone.neighborhood);
                setWatchingZoneName(zone.neighborhood);
              } else {
                console.log('DEBUG: Zone document does not exist');
              }
            }
          } else {
            console.log('DEBUG: User document does not exist');
          }
        } catch (error) {
          console.error('Error checking watching zone for my-zone:', error);
        }
      }
    };

    checkWatchingZoneForMyZone();
  }, [selectedSection, user, zones.length]);


  const navigateToProfile = (userId) => {
    if (setProfileUserId) {
      setProfileUserId(userId);
    }
    setSelectedSection('profile');
  };

  const renderSelectedSection = () => {
    const renderSection = () => {
      switch (selectedSection) {
        case 'explore':
          return <Main router={router} setSelectedSection={setSelectedSection} user={user} profileUserId={profileUserId} setProfileUserId={setProfileUserId} mode="explore" />;
        case 'my-zone':
          return <Main router={router} setSelectedSection={setSelectedSection} user={user} profileUserId={profileUserId} setProfileUserId={setProfileUserId} mode="my-zone" />;
        case 'profile':
          return <Profile userId={profileUserId} setSelectedSection={setSelectedSection} setSelectedReportId={setSelectedReportId} user={user} />;
        case 'help':
          return <Help />;
        case 'legal':
          return <Legal />;
        case 'report-problem':
          return <ReportProblemModal setSelectedSection={setSelectedSection} user={user} />;
        case 'view-report':
          return <ReportModal reportId={selectedReportId} setSelectedSection={setSelectedSection} user={user} />;
        default:
          return <Main router={router} setSelectedSection={setSelectedSection} user={user} profileUserId={profileUserId} setProfileUserId={setProfileUserId} mode="explore" />;
      }
    };

    return (
      <>
        {user && !user.emailVerified && (
          <div style={{
            padding: '16px',
            background: '#fef3c7',
            color: '#92400e',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            <p>
              <svg style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383l-4.758 2.855L15 11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728 8.82l-5.694 3.44A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.739zM1 11.114l4.758-2.876L1 5.383v5.73z"/>
              </svg>
              Please verify your email to report incidents
            </p>
            <button
              onClick={handleResendVerification}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Resend verification email
            </button>
          </div>
        )}
        {renderSection()}
      </>
    );
  };


  return (
    <div className="page">
      <Nav setSelectedSection={setSelectedSection} handleLogout={handleLogout} user={user} selectedSection={selectedSection} watchingZoneName={watchingZoneName} />

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>

            <div className='main-form'>
              <form onSubmit={handleAuth}>
                <div className='main-form-head'>
                  <h2>{isLogin ? 'Login or\u00A0' : 'Register or\u00A0'}</h2>
                  <button type="button" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Register' : 'Login'}
                  </button>
                </div>
                {!isLogin && (
                  <>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="First Name"
                      required
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      required
                    />
                  </>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                {!isLogin && (
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    required
                  />
                )}
                <div>
                  <button type="submit" disabled={loading}>
                    {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
                  </button>
                </div>
                {isLogin && !forgotPassword && (
                  <button type="button" onClick={() => setForgotPassword(true)}>
                    Forgot Password?
                  </button>
                )}
                {forgotPassword && (
                  <div>
                    <h3>Reset Your Password</h3>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                    <button type="button" onClick={handleForgotPassword}>
                      Send Reset Link
                    </button>
                    <button type="button" onClick={() => setForgotPassword(false)}>
                      Back to Login
                    </button>
                  </div>
                )}
              </form>
              {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            </div>

          </div>
        </div>
      )}

      {/* Watching Zone Selection Modal */}
      {showWatchingZoneModal && (
        <div className="modal-overlay" onClick={closeWatchingZoneModal}>
          <div className="modal-content zone-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeWatchingZoneModal}>×</button>
            <h3 className="modal-title">Select Your Watching Zone</h3>
            <p>Choose the area you want to monitor for community safety issues.</p>

            {!user?.emailVerified && (
              <div style={{
                padding: '16px',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <p>
                  <svg style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383l-4.758 2.855L15 11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728 8.82l-5.694 3.44A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.739zM1 11.114l4.758-2.876L1 5.383v5.73z"/>
                  </svg>
                  Please verify your email to select a watching zone
                </p>
                <button
                  onClick={handleResendVerification}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Resend verification email
                </button>
              </div>
            )}

            <div className="zone-selection">
              {zones.length > 0 ? (
                selectedAdministrativeZone1 ? (
                  <>
                    <button className="back-button" onClick={handleBackToAdminZones}>← Back to Zones</button>
                    <h4>{selectedAdministrativeZone1}</h4>
                    {zones
                      .filter(zone => zone.administrativeZone1 === selectedAdministrativeZone1)
                      .map(zone => (
                        <button
                          key={zone.id}
                          className={`zone-option ${!user?.emailVerified ? 'disabled' : ''}`}
                          onClick={() => user?.emailVerified && handleZoneSelection(zone)}
                          disabled={!user?.emailVerified}
                        >
                          <div className="zone-name">{zone.neighborhood}</div>
                          <div className="zone-details">{zone.subZone1}</div>
                        </button>
                      ))
                    }
                  </>
                ) : (
                  [...new Set(zones.map(zone => zone.administrativeZone1))].map(adminZone1 => (
                    <button
                      key={adminZone1}
                      className={`zone-option admin-zone-option ${!user?.emailVerified ? 'disabled' : ''}`}
                      onClick={() => user?.emailVerified && handleAdministrativeZone1Selection(adminZone1)}
                      disabled={!user?.emailVerified}
                    >
                      <div className="zone-name">{adminZone1}</div>
                    </button>
                  ))
                )
              ) : (
                <p>Loading zones...</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="main">
        {renderSelectedSection()}
      </main>

      {/* Bottom Navigation */}
      {(() => {
        console.log('DEBUG: Rendering bottom nav, user:', user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null);
        console.log('DEBUG: Bottom nav condition (user):', !!user);
        return user ? (
          <div className="bottom-navigation">
            <button
              onClick={() => setSelectedSection('explore')}
              className={`nav-btn ${selectedSection === 'explore' ? 'active' : ''}`}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <span className="nav-label">Explore</span>
            </button>
            <button
              onClick={() => setSelectedSection('my-zone')}
              className={`nav-btn ${selectedSection === 'my-zone' ? 'active' : ''}`}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              <span className="nav-label">My Zone</span>
            </button>
            <button
              onClick={() => navigateToProfile(currentUserUid)}
              className={`nav-btn ${selectedSection === 'profile' ? 'active' : ''}`}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
              <span className="nav-label">Profile</span>
            </button>
          </div>
        ) : (
          <div className="bottom-navigation">
            <button
              onClick={() => setSelectedSection('login')}
              className="nav-btn login-btn"
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              <span className="nav-label">Login</span>
            </button>
          </div>
        );
      })()}
      

      {/* {!user && (
        <footer className="footer">
          <p>Red Guardian - 2025</p>
        </footer>
      )} */}

    </div>
  );
}