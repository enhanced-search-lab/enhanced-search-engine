import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">Proxima</Link>
          <nav className="nav">
            <a href="#">Database</a>
            <a href="#">Contact</a>
            <a href="#">EN</a>
            <a href="#">TR</a>
          </nav>
        </div>
      </header>

      <main>
        <div className="container" style={{paddingTop:24, paddingBottom:24}}>
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <h3>Proxima</h3>
          <p>Empowering researchers with intelligent paper discovery and personalized recommendations</p>
          <p style={{marginTop:12}}>
            <a href="#" style={{color:"#94a3b8", marginRight:16}}>Privacy</a>
            <a href="#" style={{color:"#94a3b8", marginRight:16}}>Terms</a>
            <a href="#" style={{color:"#94a3b8"}}>Contact</a>
          </p>
          <p style={{marginTop:18}}><small>© 2025 Proxima | Powered by OpenAlex · info@proxima.org</small></p>
        </div>
      </footer>
    </div>
  );
}
