import { Outlet, Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-brand">Gradly</Link>
        {user && (
          <nav className="layout-nav">
            <NavLink to="/" className={({ isActive }) => `layout-nav-link${isActive ? ' active' : ''}`} end>Home</NavLink>
            <NavLink to="/planning" className={({ isActive }) => `layout-nav-link${isActive ? ' active' : ''}`}>Planning</NavLink>
            <NavLink to="/profile" className={({ isActive }) => `layout-nav-link${isActive ? ' active' : ''}`}>Profile</NavLink>
            <span className="layout-email">{user.email}</span>
            <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
              Sign out
            </button>
          </nav>
        )}
      </header>
      <main className="layout-main">
        <div className="layout-main-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
