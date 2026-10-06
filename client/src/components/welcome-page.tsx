"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";

export default function WelcomePage({
  onEnter,
  workspaceControl,
}: {
  onEnter: () => void;
  workspaceControl?: import("react").ReactNode;
}) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <div className="brand">
          FACILITY <span>CONDITION ASSESSMENT</span>
          <small>Field capture • Cost planning • Reporting</small>
        </div>
        <div className="welcome-header-actions">
          {workspaceControl}

          {user ? (
            <div className="welcome-menu" ref={menuRef}>
              <button
                type="button"
                className="welcome-login-toggle welcome-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                {user.name} <span aria-hidden="true">▾</span>
              </button>

              {menuOpen && (
                <div className="welcome-menu-list" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="welcome-menu-item"
                    onClick={() => {
                      closeMenu();
                      onEnter();
                    }}
                  >
                    Projects
                  </button>
                  <Link
                    role="menuitem"
                    className="welcome-menu-item"
                    href={user.role === "admin" ? "/admin" : "/admin/login"}
                    onClick={closeMenu}
                  >
                    {user.role === "admin" ? "Admin platform" : "Admin login"}
                  </Link>
                  <Link
                    role="menuitem"
                    className="welcome-menu-item"
                    href="/account"
                    onClick={closeMenu}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="welcome-menu-item"
                    onClick={() => {
                      closeMenu();
                      void logout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="welcome-login-toggle" href="/admin/login">
                Admin login
              </Link>
              <Link className="welcome-login-toggle" href="/login">
                Log in
              </Link>
              <Link className="welcome-login-toggle" href="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="welcome-content">
        <section className="welcome-intro">
          <div className="eyebrow">Welcome</div>
          <h1>
            See the building.
            <br />
            <em>Understand its condition.</em>
          </h1>
          <p>
            Move from the site visit to clear findings, QS pricing and an
            actionable facility report.
          </p>
          <div className="welcome-process">
            <span>01&nbsp; Capture</span>
            <span>02&nbsp; Price</span>
            <span>03&nbsp; Report</span>
          </div>
        </section>
        <section
          className="welcome-visuals welcome-single-photo"
          aria-label="Assessors inspecting a building"
        >
          <div className="welcome-assessor">
            <img
              src="/images/fca-assessment-team.png"
              alt="Three assessors inspecting a building with a tablet, camera and clipboard"
            />
          </div>
        </section>
      </div>

      <footer className="welcome-footer">
        <span>Functional area → element → component</span>
        <span>Facility Condition Assessment</span>
      </footer>
    </main>
  );
}
