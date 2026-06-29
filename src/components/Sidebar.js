'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/quiz', label: 'Quản lý Quiz', icon: '📝' },
    { href: '/schedule', label: 'Setup Lịch gửi', icon: '⏰' },
    { href: '/logs', label: 'Nhật ký & Lịch sử', icon: '📜' }
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <span style={{ fontSize: '2rem' }}>📈</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="logo-text">Quiz Zalo Bot</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Market Insights</span>
        </div>
      </div>
      
      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-links">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '16px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>🤖 Zalo Bot Trực Tuyến</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bot ID: 5738530858...</p>
      </div>
    </aside>
  );
}
