import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ChartNoAxesColumn, CircleHelp, ClipboardList, History, LayoutGrid, LogOut, MapPin, Search, UserCog, UsersRound } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../features/auth';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutGrid },
  { name: 'Audit Log', path: '/audit-log', icon: History },
  { name: 'Attendance', path: '/attendance', icon: CalendarDays },
  { name: 'Students', path: '/students', icon: UsersRound },
  { name: 'Reports', path: '/reports', icon: ChartNoAxesColumn },
  { name: 'Admins', path: '/admins', icon: UserCog },
] as const;

const commands = [
  ...navigation.map(({ name, path, icon }) => ({ name, path, icon, keywords: `${name} ${path} page`, action: '' })),
  { name: 'Events', path: '/events', icon: ClipboardList, keywords: 'events schedule create event page', action: '' },
  { name: 'Locations', path: '/locations', icon: MapPin, keywords: 'locations checkpoints page', action: '' },
  { name: 'Attendance by Day', path: '/overview#attendance-chart', icon: ChartNoAxesColumn, keywords: 'daily scans time in time out chart analytics', action: '' },
  { name: 'Checkpoint Activity', path: '/overview#locations-chart', icon: MapPin, keywords: 'locations activity today scans checkpoint chart', action: '' },
  { name: 'Attendance Sessions', path: '/attendance?tab=sessions', icon: CalendarDays, keywords: 'schedule event session time in time out create', action: '' },
  { name: 'Attendance Records', path: '/attendance?tab=records', icon: ClipboardList, keywords: 'scans student time in time out history', action: '' },
  { name: 'Help', path: '', icon: CircleHelp, keywords: 'support guide keyboard shortcuts', action: 'help' },
  { name: 'Notifications', path: '', icon: Bell, keywords: 'alerts updates bell', action: 'notifications' },
];

export function Header() {
  const pagesDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const matchingPages = commands.filter(({ name, keywords }) => `${name} ${keywords}`.toLowerCase().includes(query.trim().toLowerCase()));
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

  const openPalette = () => {
    setQuery('');
    setSelectedIndex(0);
    pagesDialog.current?.showModal();
    requestAnimationFrame(() => searchInput.current?.focus());
  };

  const runCommand = (command: (typeof commands)[number]) => {
    pagesDialog.current?.close();
    if (command.action) window.dispatchEvent(new CustomEvent('presnt:open-utility', { detail: command.action }));
    else if (command.path.includes('#')) {
      const [path, hash] = command.path.split('#');
      navigate(path);
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } else navigate(command.path);
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (pagesDialog.current?.open) pagesDialog.current.close();
        else openPalette();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  return <header className="relative flex min-h-[84px] flex-wrap items-center justify-between gap-2 pl-7 pr-11 py-3 md:flex-nowrap">
    <NavLink to="/overview" className="z-10 text-[30px] font-extrabold leading-none tracking-tight text-[#24133F] md:text-[34px]">Presnt</NavLink>

    <nav aria-label="Main navigation" className="order-3 flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-[#F2F1F5] p-1.5 md:absolute md:left-[calc(50%+32px)] md:order-2 md:-translate-x-1/2">
      {navigation.map(({ name, path, icon: Icon }) => <NavLink
        key={path}
        to={path}
        title={name}
        aria-label={name}
        className={({ isActive }) => cn(
          'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-brand-700 motion-safe:hover:-translate-y-0.5',
          isActive ? 'border-slate-200 bg-white text-[#24133F] shadow-sm motion-safe:animate-nav-settle' : 'border-transparent bg-white text-[#756883] hover:text-brand-700'
        )}
      >{({ isActive }) => <>
        <Icon className="h-3.5 w-3.5" />
        {isActive && <span>{name}</span>}
      </>}</NavLink>)}
    </nav>

    <div className="z-10 flex items-center gap-2">
      <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0EB] bg-white text-[#756883] md:hidden"><LogOut className="h-4 w-4" /></button>
      <button type="button" onClick={openPalette} aria-label="Open command palette" title={`Search everything (${shortcutLabel})`} className="flex h-8 items-center justify-center gap-2 rounded-lg border border-[#E5E0EB] bg-white px-2 text-[#756883] hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700">
        <Search className="h-4 w-4" /><kbd className="hidden text-[10px] font-semibold lg:inline">{shortcutLabel}</kbd>
      </button>
    </div>

    <dialog ref={pagesDialog} aria-label="Command palette" onClick={(event) => { if (event.target === pagesDialog.current) pagesDialog.current?.close(); }} className="w-[min(560px,calc(100%-32px))] overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white p-0 text-[#24133F] shadow-2xl backdrop:bg-[#170D29]/40 backdrop:backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-[#E5E0EB] px-4 py-4">
        <Search className="h-5 w-5 text-[#756883]" />
        <input ref={searchInput} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIndex((index) => Math.min(index + 1, matchingPages.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && matchingPages.length) { event.preventDefault(); runCommand(matchingPages[selectedIndex] ?? matchingPages[0]); }
        }} aria-label="Search commands" aria-controls="command-results" aria-activedescendant={matchingPages.length ? `command-result-${selectedIndex}` : undefined} role="combobox" aria-expanded="true" aria-autocomplete="list" placeholder="Search pages, charts, help, notifications..." className="min-w-0 flex-1 bg-transparent text-sm text-[#24133F] outline-none placeholder:text-[#9B89B0]" />
        <kbd className="rounded border border-[#E5E0EB] px-1.5 py-0.5 text-[10px] text-[#756883]">Esc</kbd>
      </div>
      <div id="command-results" role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2">
        {matchingPages.length ? matchingPages.map((command, index) => <button id={`command-result-${index}`} role="option" aria-selected={selectedIndex === index} type="button" key={`${command.name}-${command.path}`} onMouseEnter={() => setSelectedIndex(index)} onClick={() => runCommand(command)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors', selectedIndex === index ? 'bg-[#F0E8FC] text-brand-700' : 'text-[#24133F] hover:bg-[#F7F6F9]')}>
          <command.icon className="h-4 w-4" />{command.name}<span className="ml-auto text-[11px] font-normal text-[#756883]">{command.path || 'Quick action'}</span>
        </button>) : <p className="px-3 py-6 text-center text-sm text-[#756883]">No matching commands</p>}
      </div>
      <div className="border-t border-[#E5E0EB] px-4 py-2 text-[11px] text-[#756883]">↑ ↓ to select · Enter to open · {shortcutLabel} to toggle</div>
    </dialog>
  </header>;
}
