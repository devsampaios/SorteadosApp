import { Link, NavLink, Outlet } from 'react-router-dom';
import { House, type LucideIcon } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { UserMenu } from './UserMenu';

interface ItemNav {
  to: string;
  label: string;
  icone: LucideIcon;
}

const PanelView = () => {
  const itens: ItemNav[] = [
    { to: '/', label: 'Início', icone: House },
  ];

  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <Link
          to='/'
          className='sidebar__logo'
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
        >
          <AppLogo size={24} />
          Sorteados
        </Link>
        <nav className='sidebar__nav'>
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' nav-item--ativo' : ''}`}
            >
              <item.icone size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className='sidebar__rodape'>
          <UserMenu abrirPara='cima' />
        </div>
      </aside>

      <header className='header'>
        <Link
          to='/'
          className='header__titulo'
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
        >
          <AppLogo size={24} />
          Sorteados
        </Link>
        <div className='header__acoes'>
          <UserMenu abrirPara='baixo' />
        </div>
      </header>

      <main className='main-content'>
        <Outlet />
      </main>

      <nav className='bottom-nav'>
        <div className='bottom-nav__items'>
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--ativo' : ''}`}
            >
              <item.icone size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PanelView;
