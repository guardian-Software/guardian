'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportPage({ params }) {
  const router = useRouter();
  const [reportId, setReportId] = useState(null);

  useEffect(() => {
    Promise.resolve(params).then((resolvedParams) => {
      setReportId(resolvedParams.id);
      router.replace(`/?reportId=${resolvedParams.id}`);
    });
  }, [params, router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--text-primary)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid var(--cyber-purple)', 
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p>Loading report...</p>
      </div>
    </div>
  );
}
