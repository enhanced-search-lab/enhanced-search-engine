import React from "react";
import Footer from "./Footer";
import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">Proxima</Link>
          <nav className="nav">
            <a href="#">Database</a>
            <a href="mailto:appproximaa@gmail.com">Contact</a>
          </nav>
        </div>
      </header>

      <main>
        <div className="container" style={{paddingTop:24, paddingBottom:24}}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
