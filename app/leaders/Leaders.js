'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const Leaders = ({ router, setSelectedSection, user, setProfileUserId }) => {

  // SEO metadata
  const pageTitle = "Community Leaders - Red Guardian";
  const pageDescription = "Meet the community leaders who are making a difference in neighborhood safety. Connect with local safety advocates and learn from their experiences.";
  const canonicalUrl = "https://guardian.red/leaders";

  return(
    <>
    <head>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content="community leaders, safety advocates, neighborhood watch, red guardian, community safety, local leaders" />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
    </head>
    <div className="main-section">
      {/* Filter Controls */}
      <div className="filter-controls">
        <button
          // className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          // onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          // className={`filter-btn ${filter === 'problem' ? 'active' : ''}`}
          // onClick={() => setFilter('problem')}
        >
          Following
        </button>
      </div>

      <div className='report-feed'>
        <h1>Community Leaders</h1>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
        <p>Leaders</p>
      </div>

    </div>
    </>
  )
}

export default Leaders;