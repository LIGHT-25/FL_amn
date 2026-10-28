import {
  ChevronsUpDown,
  Compass,
  Lock,
  LogOut,
  MessageSquareText,
  PanelLeftClose,
  Search,
  Settings,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getMockUser } from '../api/mockUser';
import { logout } from '../auth/session';
import { cn } from '@/lib/utils';

interface SideItem {
  to: string;
  label: string;
  icon: typeof Compass;
}

const items: SideItem[] = [
  { to: '/app/chat', label: 'Chat', icon: MessageSquareText },
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/search', label: 'Search', icon: Search },
  { to: '/app/debugging', label: 'Debugging', icon: Terminal },
];

export default function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const user = getMockUser();

  const signOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-line bg-panel',
        open ? 'w-[248px]' : 'w-[60px]',
      )}
    >
      <div className={cn('flex items-center gap-2', open ? 'p-3' : 'flex-col px-2 py-3')}>
        <button
          className="grid shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent p-1 hover:bg-panel-2"
          onClick={() => (open ? navigate('/app') : onToggle())}
          title={open ? 'Back to automations' : 'Expand sidebar'}
        >
          <img src="/Routed F symbol.svg" alt="FlowForge" width={26} height={26} className="block h-[26px] w-[26px]" />
        </button>
        {open && (
          <button
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-1 py-1.5 text-ink hover:bg-panel-2"
            title="Workspace switching arrives with the auth backend"
          >
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[14.5px] font-semibold tracking-[-0.01em]">
              {user.workspaceLabel}
            </span>
            <ChevronsUpDown size={15} className="shrink-0 text-muted" />
          </button>
        )}
        {open && (
          <button
            className="grid h-[30px] w-[30px] shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-muted no-underline hover:bg-panel-2 hover:text-ink"
            onClick={onToggle}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-0.5 overflow-y-auto py-1',
          open ? 'px-3' : 'items-center px-2',
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={open ? undefined : item.label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 whitespace-nowrap rounded-lg text-sm no-underline [&_svg]:shrink-0',
                  open ? 'px-2.5 py-2' : 'p-[9px]',
                  isActive ? 'bg-panel-2 text-ink' : 'text-muted hover:bg-panel-2 hover:text-ink',
                )
              }
            >
              <Icon size={19} />
              {open && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {open && (
          <>
            <div className="mx-0.5 mb-1.5 mt-3.5 flex items-center justify-between text-[11px] font-semibold tracking-[0.08em] text-faint [&_svg]:text-faint">
              <span>PROJECTS</span>
              <SlidersHorizontal size={13} />
            </div>
            <NavLink
              to="/app"
              end
              className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg border-none bg-panel-2 px-2.5 py-2 text-sm text-ink no-underline cursor-pointer [&_svg]:shrink-0"
            >
              <Lock size={15} />
              <span>Personal Project</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className={cn('border-t border-line', open ? 'p-3' : 'px-2 py-3')}>
        {open ? (
          <div className="flex items-center gap-2.5 p-1.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0d9488] text-[13px] font-semibold text-white">
              {user.initials}
            </span>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
              {user.name}
            </span>
            <NavLink
              to="/app/settings"
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border-none bg-transparent text-muted no-underline hover:bg-panel-2 hover:text-ink"
              title="Settings"
            >
              <Settings size={16} />
            </NavLink>
            <button
              type="button"
              onClick={signOut}
              className="grid h-[30px] w-[30px] shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-panel-2 hover:text-ink"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0d9488] text-[13px] font-semibold text-white"
              title={user.name}
            >
              {user.initials}
            </span>
            <NavLink
              to="/app/settings"
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border-none bg-transparent text-muted no-underline hover:bg-panel-2 hover:text-ink"
              title="Settings"
            >
              <Settings size={17} />
            </NavLink>
            <button
              type="button"
              onClick={signOut}
              className="grid h-[30px] w-[30px] shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-panel-2 hover:text-ink"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
