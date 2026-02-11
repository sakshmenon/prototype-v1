import { useState } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-brand">Gradly</Link>
        {user && (
          <>
            <button
              type="button"
              className="layout-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="layout-mobile-toggle-bar"></span>
              <span className="layout-mobile-toggle-bar"></span>
              <span className="layout-mobile-toggle-bar"></span>
            </button>
            <nav className={`layout-nav ${mobileMenuOpen ? 'layout-nav-open' : ''}`}>
              <NavLink
                to="/"
                className={({ isActive }) => `layout-nav-link${isActive ? ' active' : ''}`}
                onClick={closeMobileMenu}
                end
              >
                Home
              </NavLink>
              <NavLink
                to="/planning"
                className={({ isActive }) => `layout-nav-link${isActive ? ' active' : ''}`}
                onClick={closeMobileMenu}
              >
                Planning
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `layout-nav-link${isActive ? ' active' : ''}`}
                onClick={closeMobileMenu}
              >
                Profile
              </NavLink>
              <span className="layout-email">{user.email}</span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  signOut()
                  closeMobileMenu()
                }}
              >
                Sign out
              </button>
            </nav>
          </>
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
