import { useEffect, useState } from "react";
import { installMicro } from "./lib/micro.js";
import Ask from "./components/Ask.jsx";
import TabBar from "./components/TabBar.jsx";
import Sponsors from "./pages/Sponsors.jsx";
import { Routes, Route, useNavigate } from "react-router-dom";
import { AppProvider, world } from "./lib/app.jsx";
import { EVENTS } from "./data/events.js";
import Loader from "./components/Loader.jsx";
import Cursor from "./components/Cursor.jsx";
import Nav from "./components/Nav.jsx";
import Menu from "./components/Menu.jsx";
import Hud from "./components/Hud.jsx";
import Curtain from "./components/Curtain.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Events from "./pages/Events.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import Schedule from "./pages/Schedule.jsx";
import Register from "./pages/Register.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";

function FrameClicks() {
  const navigate = useNavigate();
  useEffect(() => world?.on("click", (i) => navigate(`/events/${EVENTS[i].slug}`)), [navigate]);
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { installMicro(); }, []);
  return (
    <AppProvider>
      <FrameClicks />
      <Loader onDone={() => setReady(true)} />
      <Cursor />
      <Nav ready={ready} menuOpen={menu} onMenu={() => setMenu((m) => !m)} />
      <Menu open={menu} onClose={() => setMenu(false)} />
      <Hud ready={ready} />
      <Curtain />
      <Ask />
      <TabBar />
      <main id="page" data-ready={ready}>
        <Routes>
          <Route path="/" element={<Home ready={ready} />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </main>
    </AppProvider>
  );
}
