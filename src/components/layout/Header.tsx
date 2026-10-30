import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  CreditCard,
  History,
  LayoutGrid,
  MapPin,
  Radio,
  Search,
  Shield,
  UsersRound,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutGrid },
  { name: 'Audit Log', path: '/audit-log', icon: History },
  { name: 'Events & Attendance', path: '/attendance', icon: CalendarDays },
  { name: 'Students', path: '/students', icon: UsersRound },
  { name: 'RFID Cards', path: '/cards', icon: CreditCard },
  { name: 'Reports', path: '/reports', icon: ChartNoAxesColumn },
] as const;

const commands = [
  ...navigation.map(({ name, path, icon }) => ({ name, path, icon, keywords: `${name} ${path} page`, action: '' })),
  { name: 'Events', path: '/events', icon: ClipboardList, keywords: 'events schedule create event page', action: '' },
  { name: 'Locations', path: '/locations', icon: MapPin, keywords: 'locations checkpoints page', action: '' },
  { name: 'Attendance by Day', path: '/overview#attendance-chart', icon: ChartNoAxesColumn, keywords: 'daily scans time in time out chart analytics', action: '' },
  { name: 'Checkpoint Activity', path: '/overview#locations-chart', icon: MapPin, keywords: 'locations activity today scans checkpoint chart', action: '' },
  { name: 'Attendance Sessions', path: '/sessions', icon: CalendarDays, keywords: 'schedule event session time in time out create', action: '' },
  { name: 'Attendance Records', path: '/audit-log', icon: ClipboardList, keywords: 'scans student time in time out history', action: '' },

  { name: 'Inspect RFID Card', path: '/cards', icon: Radio, keywords: 'inspect tap lookup card rfid search who owner check unassigned', action: 'inspect-card' },
  { name: 'Manage Admins', path: '', icon: Shield, keywords: 'admins accounts officers permissions roles manage add admin drawer', action: 'manage-admins' },
  { name: 'Notifications', path: '', icon: Bell, keywords: 'alerts updates bell', action: 'notifications' },
];

const labelWidths: Record<string, number> = {
  'Overview': 66,
  'Audit Log': 68,
  'Events & Attendance': 140,
  'Students': 64,
  'RFID Cards': 78,
  'Reports': 60,
};

function NavTab({ name, path, icon: Icon }: { name: string; path: string; icon: React.ComponentType<{ className?: string }> }) {
  const maxWidth = labelWidths[name] ?? 64;

  return (
    <NavLink
      to={path}
      title={name}
      aria-label={name}
      className={({ isActive }) => cn(
        'group relative flex h-8 shrink-0 items-center justify-center rounded-xl px-3 text-[12px] font-bold select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-brand-700 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        isActive
          ? 'bg-white text-[#7026B7] shadow-sm border border-slate-200/80'
          : 'bg-transparent hover:bg-white/60 text-[#756883] hover:text-[#7026B7] border border-transparent active:scale-95'
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-out', isActive ? 'scale-105 text-[#7026B7]' : 'scale-100 text-[#756883] group-hover:scale-110 group-hover:text-[#7026B7]')} />
          <span
            style={{
              maxWidth: isActive ? `${maxWidth}px` : '0px',
            }}
            className={cn(
              'inline-block overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none',
              isActive ? 'opacity-100 ml-1.5' : 'opacity-0 ml-0'
            )}
          >
            {name}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function Header() {
  const pagesDialog = useRef<HTMLDialogElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const matchingPages = commands.filter(({ name, keywords }) => `${name} ${keywords}`.toLowerCase().includes(query.trim().toLowerCase()));
  const shortcutLabel = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

  const openPalette = () => {
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    pagesDialog.current?.classList.remove('palette-closing');
    setQuery('');
    setSelectedIndex(0);
    pagesDialog.current?.showModal();
    requestAnimationFrame(() => searchInput.current?.focus());
  };

  const closePalette = (afterClose?: () => void) => {
    const dialog = pagesDialog.current;
    if (!dialog?.open || closeTimer.current !== null) return;
    dialog.classList.add('palette-closing');
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    closeTimer.current = window.setTimeout(() => {
      dialog.close();
      dialog.classList.remove('palette-closing');
      closeTimer.current = null;
      paletteTrigger.current?.focus();
      afterClose?.();
    }, duration);
  };

  const runCommand = (command: (typeof commands)[number]) => {
    closePalette(() => {
    if (command.action === 'inspect-card') {
      navigate('/cards');
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('presnt:open-card-inspector'));
      });
    } else if (command.action === 'manage-admins') {
      window.dispatchEvent(new CustomEvent('presnt:open-admins-drawer'));
    } else if (command.action) {
      window.dispatchEvent(new CustomEvent('presnt:open-utility', { detail: command.action }));
    } else if (command.path.includes('#')) {
      const [path, hash] = command.path.split('#');
      navigate(path);
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } else if (command.path) {
      navigate(command.path);
    }
    });
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (pagesDialog.current?.open) closePalette();
        else openPalette();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => {
      window.removeEventListener('keydown', onShortcut);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <header className="relative flex min-h-[84px] flex-wrap items-center justify-between gap-2 pl-7 pr-11 py-3 md:flex-nowrap">
      <NavLink to="/overview" className="z-10 text-[30px] font-extrabold leading-none tracking-tight text-[#24133F] md:text-[34px]">
        Presnt
      </NavLink>

      <nav aria-label="Main navigation" className="order-3 flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-[#F2F1F5] p-1.5 md:absolute md:left-[calc(50%+32px)] md:order-2 md:-translate-x-1/2">
        {navigation.map((item) => (
          <NavTab key={item.path} name={item.name} path={item.path} icon={item.icon} />
        ))}
      </nav>

      <div className="z-10 flex items-center gap-2">
        <button
          ref={paletteTrigger}
          type="button"
          onClick={openPalette}
          aria-label="Open command palette"
          title={`Search everything (${shortcutLabel})`}
          className="flex h-8 items-center justify-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-2.5 text-[#756883] hover:text-[#7026B7] hover:border-[#7026B7]/40 active:scale-95 active:translate-y-[1px] transition-all focus-visible:outline-2 focus-visible:outline-brand-700 cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <kbd className="hidden text-[10px] font-semibold lg:inline">{shortcutLabel}</kbd>
        </button>
      </div>

      <dialog ref={pagesDialog} aria-label="Command palette" onCancel={(event) => { event.preventDefault(); closePalette(); }} onClick={(event) => { if (event.target === pagesDialog.current) closePalette(); }} className="command-palette fixed left-1/2 top-1/2 m-0 w-[min(560px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white p-0 text-[#24133F] backdrop:bg-[#170D29]/40 backdrop:backdrop-blur-md">
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
    </header>
  );
}
