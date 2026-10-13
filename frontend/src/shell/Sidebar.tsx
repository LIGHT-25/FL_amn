import {
  ChevronsUpDown,
  Compass,
  Lock,
  MessageSquareText,
  PanelLeftClose,
  Search,
  Settings,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { mockUser } from '../api/mockUser';
import './shell.css';

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

  return (
    <aside className={`ff-sidebar${open ? '' : ' collapsed'}`}>
      <div className="ff-side-head">
        <button
          className="ff-logo-mark"
          onClick={() => (open ? navigate('/app') : onToggle())}
          title={open ? 'Back to automations' : 'Expand sidebar'}
        >
          <img src="/Routed F symbol.svg" alt="FlowForge" width={26} height={26} />
        </button>
        {open && (
          <button className="ff-workspace-btn" title="Workspace switching arrives with the auth backend">
            <span className="ff-workspace-name">{mockUser.workspaceLabel}</span>
            <ChevronsUpDown size={15} className="ff-workspace-chevron" />
          </button>
        )}
        {open && (
          <button className="ff-head-btn" onClick={onToggle} title="Collapse sidebar">
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      <nav className="ff-nav">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="ff-nav-item" title={open ? undefined : item.label}>
              <Icon size={19} />
              {open && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {open && (
          <>
            <div className="ff-projects-label">
              <span>PROJECTS</span>
              <SlidersHorizontal size={13} />
            </div>
            <NavLink to="/app" end className="ff-project-item">
              <Lock size={15} />
              <span>Personal Project</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="ff-side-foot">
        {open ? (
          <div className="ff-user-row">
            <span className="ff-avatar">{mockUser.initials}</span>
            <span className="ff-user-name">{mockUser.name}</span>
            <NavLink to="/app/settings" className="ff-head-btn" title="Settings">
              <Settings size={16} />
            </NavLink>
          </div>
        ) : (
          <div className="ff-user-row">
            <span className="ff-avatar" title={mockUser.name}>
              {mockUser.initials}
            </span>
          </div>
        )}
        {!open && (
          <NavLink to="/app/settings" className="ff-head-btn" title="Settings" style={{ margin: '4px auto 0' }}>
            <Settings size={17} />
          </NavLink>
        )}
      </div>
    </aside>
  );
}
