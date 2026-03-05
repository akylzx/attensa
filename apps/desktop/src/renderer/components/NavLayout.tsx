import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7.5" />
        <circle cx="10" cy="10" r="4" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="3" height="5" rx="0.5" />
        <rect x="8.5" y="8" width="3" height="9" rx="0.5" />
        <rect x="14" y="3" width="3" height="14" rx="0.5" />
      </svg>
    ),
  },
];

const SETTINGS_ITEM = {
  to: '/settings',
  label: 'Settings',
  icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="14" x2="17" y2="14" />
      <circle cx="7" cy="6" r="2" fill="var(--t-base)" />
      <circle cx="13" cy="14" r="2" fill="var(--t-base)" />
    </svg>
  ),
};

function NavItem({ to, label, icon, isActive }: {
  to: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <NavLink
      to={to}
      className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors group"
    >
      {/* Active pill indicator */}
      {isActive && (
        <div className="absolute left-[-11px] w-[3px] h-5 rounded-full bg-accent" />
      )}

      {/* Icon */}
      <div className={`transition-colors ${
        isActive
          ? 'text-accent'
          : 'text-fg-ghost hover:text-fg-muted'
      }`}>
        {icon}
      </div>

      {/* Tooltip */}
      <div className="absolute left-[calc(100%+8px)] glass-tooltip rounded-md px-2 py-1 text-xs text-fg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {label}
      </div>
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors group text-fg-ghost hover:text-fg-muted"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <div className="transition-transform duration-300" style={{ transform: theme === 'light' ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="4" />
            <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.34 3.34l1.42 1.42M13.24 13.24l1.42 1.42M14.66 3.34l-1.42 1.42M4.76 13.24l-1.42 1.42" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 9.7A7 7 0 1 1 8.3 2.5a5.5 5.5 0 0 0 7.2 7.2z" />
          </svg>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute left-[calc(100%+8px)] glass-tooltip rounded-md px-2 py-1 text-xs text-fg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </div>
    </button>
  );
}

export function NavLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-14 flex-shrink-0 flex flex-col items-center pt-[52px] pb-4 border-r border-[var(--t-border-subtle)]">
        {/* All nav items grouped at top */}
        <div className="flex flex-col items-center gap-2 mt-2">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.to)}
            />
          ))}

          {/* Separator */}
          <div className="w-6 h-px bg-fg-ghost my-1" />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Settings */}
          <NavItem
            to={SETTINGS_ITEM.to}
            label={SETTINGS_ITEM.label}
            icon={SETTINGS_ITEM.icon}
            isActive={isActive(SETTINGS_ITEM.to)}
          />
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
