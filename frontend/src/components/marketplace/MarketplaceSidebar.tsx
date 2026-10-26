import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import MarketIcon from './MarketIcon';

export type MarketplaceSidebarItem = {
  label: string;
  icon: ReactNode;
  avatar?: string | null;
  iconClassName?: string;
  to?: string;
  active?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  badge?: number;
};

export type MarketplaceSidebarSection = { label?: string; items: MarketplaceSidebarItem[] };
type Note = { icon: ReactNode; title: string; description: string; action?: { label: string; to: string; icon?: ReactNode } };
type Props = {
  heading: string;
  subtitle?: string;
  sections: MarketplaceSidebarSection[];
  note?: Note;
  footer?: ReactNode;
  mobileMode?: 'drawer' | 'bar';
  open?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export default function MarketplaceSidebar({ heading, subtitle, sections, note, footer, mobileMode = 'bar', open = false, onNavigate, className = '' }: Props) {
  const itemContent = (item: MarketplaceSidebarItem) => <>
    <span className={`marketplace-sidebar-icon ${item.iconClassName || ''}`}>{item.avatar ? <img className="marketplace-sidebar-avatar" src={item.avatar} alt=""/> : item.icon}</span>
    <span className="marketplace-sidebar-item-label">{item.label}</span>
    {!!item.badge && <span className="marketplace-sidebar-badge" aria-label={`${item.badge} ${item.label.toLowerCase()}`}>{item.badge > 99 ? '99+' : item.badge}</span>}
    {item.trailing && <span className="marketplace-sidebar-trailing">{item.trailing}</span>}
  </>;

  return <aside className={`marketplace-sidebar marketplace-sidebar--${mobileMode} ${open ? 'is-open' : ''} ${className}`}>
    <div className="marketplace-sidebar-heading"><b>{heading}</b>{subtitle && <small>{subtitle}</small>}</div>
    {sections.map((section, index) => <section className="marketplace-sidebar-section" key={`${section.label || 'links'}-${index}`}>
      {section.label && <div className="marketplace-sidebar-label">{section.label}</div>}
      <nav aria-label={section.label || heading}>
        {section.items.map((item) => {
          const className = `marketplace-sidebar-link ${item.active ? 'is-active' : ''}`;
          const handleClick = () => { item.onClick?.(); onNavigate?.(); };
          return item.to
            ? <Link key={`${item.label}-${item.to}`} className={className} to={item.to} onClick={handleClick}>{itemContent(item)}</Link>
            : <button key={item.label} type="button" className={className} onClick={handleClick}>{itemContent(item)}</button>;
        })}
      </nav>
    </section>)}
    {note && <div className="marketplace-sidebar-note"><span className="marketplace-sidebar-note-icon">{note.icon}</span><b>{note.title}</b><p>{note.description}</p>{note.action && <Link to={note.action.to} onClick={onNavigate}>{note.action.label}{note.action.icon || <MarketIcon name="arrow" size={15}/>}</Link>}</div>}
    {footer && <div className="marketplace-sidebar-footer">{footer}</div>}
  </aside>;
}
