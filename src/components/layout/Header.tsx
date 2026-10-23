import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, ChartNoAxesColumn, ClipboardList, History, LayoutGrid, LogOut, MapPin, Search, UsersRound } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../features/auth';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutGrid },
  { name: 'Audit Log', path: '/audit-log', icon: History },
  { name: 'Events', path: '/events', icon: ClipboardList },
  { name: 'Sessions', path: '/sessions', icon: CalendarDays },
  { name: 'Locations', path: '/locations', icon: MapPin },
  { name: 'Attendance', path: '/attendance', icon: ChartNoAxesColumn },
  { name: 'Students', path: '/students', icon: UsersRound },
  { name: 'Staff', path: '/admins', icon: UsersRound },
] as const;

export function Header() {
  const pagesDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const matchingPages = navigation.filter(({ name, path }) => `${name} ${path}`.toLowerCase().includes(query.trim().toLowerCase()));

  const openPalette = () => {
    setQuery('');
    setSelectedIndex(0);
    pagesDialog.current?.showModal();
    requestAnimationFrame(() => searchInput.current?.focus());
  };

  const goToPage = (path: string) => {
    pagesDialog.current?.close();
    navigate(path);
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
          'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-brand-700 motion-safe:hover:-translate-y-0.5',
          isActive ? 'border-slate-200 bg-white text-[#24133F] shadow-sm motion-safe:animate-nav-settle' : 'border-transparent bg-white text-[#756883] hover:text-brand-700'
        )}
      >{({ isActive }) => <>
        <Icon className="h-3.5 w-3.5" />
        {isActive && <span>{name}</span>}
      </>}</NavLink>)}
    </nav>

    <div className="z-10 flex items-center gap-2">
      <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0EB] bg-white text-[#756883] md:hidden"><LogOut className="h-4 w-4" /></button>
      <button type="button" onClick={openPalette} aria-label="Open command palette" title="Search pages (Ctrl+K)" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0EB] bg-white text-[#756883] hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700">
        <Search className="h-4 w-4" />
      </button>
    </div>

    <dialog ref={pagesDialog} aria-label="Command palette" onClick={(event) => { if (event.target === pagesDialog.current) pagesDialog.current?.close(); }} className="w-[min(520px,calc(100%-32px))] overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white p-0 text-[#24133F] shadow-2xl backdrop:bg-[#24133F]/40">
      <div className="flex items-center gap-3 border-b border-[#E5E0EB] px-4 py-3">
        <Search className="h-5 w-5 text-[#756883]" />
        <input ref={searchInput} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIndex((index) => Math.min(index + 1, matchingPages.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && matchingPages.length) { event.preventDefault(); goToPage(matchingPages[selectedIndex]?.path ?? matchingPages[0].path); }
        }} aria-label="Search pages" aria-controls="command-results" aria-activedescendant={matchingPages.length ? `command-result-${selectedIndex}` : undefined} role="combobox" aria-expanded="true" aria-autocomplete="list" placeholder="Search pages..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A59AAB]" />
        <kbd className="rounded border border-[#E5E0EB] px-1.5 py-0.5 text-[10px] text-[#756883]">Esc</kbd>
      </div>
      <div id="command-results" role="listbox" aria-label="Pages" className="max-h-80 overflow-y-auto p-2">
        {matchingPages.length ? matchingPages.map(({ name, path, icon: Icon }, index) => <button id={`command-result-${index}`} role="option" aria-selected={selectedIndex === index} type="button" key={path} onMouseEnter={() => setSelectedIndex(index)} onClick={() => goToPage(path)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold', selectedIndex === index ? 'bg-[#F2F1F5] text-brand-700' : 'hover:bg-[#F7F6F9]')}>
          <Icon className="h-4 w-4" />{name}<span className="ml-auto text-[11px] font-normal text-[#A59AAB]">{path}</span>
        </button>) : <p className="px-3 py-6 text-center text-sm text-[#756883]">No matching pages</p>}
      </div>
      <div className="border-t border-[#E5E0EB] px-4 py-2 text-[11px] text-[#756883]">↑ ↓ to select · Enter to open · Ctrl+K to toggle</div>
    </dialog>
  </header>;
}
