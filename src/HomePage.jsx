import { useState, useEffect, useRef } from "react";

/* ── Cloudinary assets ──────────────────────────────────────────── */
const BG     = "https://res.cloudinary.com/dyo9wiou5/image/upload/q_auto/f_auto/v1773252721/image_5_9_trl3lq.png";
const VID    = "https://res.cloudinary.com/dyo9wiou5/video/upload/q_auto/f_auto/v1772705239/Sign_Language_Translator_Video_Generated_mdekax.mp4";
const FLAG      = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1773253879/flagimage_hvz05s.png";
const PERSON    = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1773253691/ChatGPT_Image_Mar_7_2026_04_35_00_PM_vsbhnp.png";
const PERSON2   = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1773253772/ChatGPT_Image_Mar_7_2026_04_39_29_PM_wnudgl.png";
const PHONE_VID = "https://res.cloudinary.com/dyo9wiou5/video/upload/v1772705538/video2_c09mnp.mp4";
const C_LOGO    = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1773253428/Component_3_2_sjci20.png";

/* ── Local assets (from /public) ───────────────────────────────── */
const LOGO        = "/logo.png";
const AVATAR1     = "/avatar1.png";
const AVATAR2     = "/avatar2.png";
const AVATAR3     = "/avatar3.png";

const ICON_HOME   = "/icon-home.png";

/* ── Chevron for nav dropdowns ──────────────────────────────────── */
function Chevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION 2  — "Imagine a world…"  (light bg, person image)
══════════════════════════════════════════════════════════════════ */
function Section2() {
  const ref       = useRef(null);
  const stackRef  = useRef(null);
  const personRef = useRef(null);
  const [vis,   setVis]   = useState(false);
  const [hover, setHover] = useState(false);
  const [pos,   setPos]   = useState({ x: 0, y: 0 });

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const snapPos = (e) => {
    const rect = personRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMouseEnter = (e) => { snapPos(e); setHover(true); };
  const handleMouseMove  = (e) => { snapPos(e); };
  const handleMouseLeave = ()  => { setHover(false); };

  return (
    <>
      <style>{`
        /* ══════════ SECTION 2 ══════════ */
        #s2 {
          position: relative;
          background: #f2f0f9;
          padding-top: 72px;
          overflow: hidden;
          /* entrance */
          opacity: 0;
          transform: translateY(36px);
          transition: opacity .85s cubic-bezier(.22,1,.36,1),
                      transform .85s cubic-bezier(.22,1,.36,1);
        }
        #s2.s2-vis { opacity: 1; transform: none; }

        #s2-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 52px;
        }

        /* ── Trust banner ── */
        #s2-banner-row {
          display: flex;
          justify-content: center;
          margin-bottom: 48px;
        }
        #s2-banner {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: #111;
          border-radius: 100px;
          padding: 8px 10px 8px 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
        }
        #s2-banner-text {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #fff;
          letter-spacing: .01em;
          white-space: nowrap;
        }
        #s2-flag {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.15);
        }

        /* ── Heading + person stack ── */
        #s2-stack {
          position: relative;
          text-align: center;
        }
        #s2-h2 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(34px, 4.4vw, 60px);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -1.8px;
          text-align: center;
          position: relative;
          z-index: 1;
          /* pull heading behind the person by overlapping via negative bottom margin */
          margin-bottom: -230px;
          padding-bottom: 12px;
        }
        .s2-muted { color: #b3adca; }
        .s2-dark  { color: #0e0b1c; }

        /* Person image — floats on top of heading text */
        #s2-person {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          pointer-events: none;
          /* needed so #s2-reveal positions against this element */
          isolation: isolate;
        }
        #s2-person-img {
          height: 530px;
          width: auto;
          max-width: 90%;
          object-fit: contain;
          display: block;
          /* subtle bottom fade so image blends into the sub-row */
          -webkit-mask-image: linear-gradient(180deg, black 70%, transparent 100%);
          mask-image: linear-gradient(180deg, black 70%, transparent 100%);
        }

        /* ── Sub row + CTA ── */
        #s2-subrow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 24px 0 68px;
          position: relative;
          z-index: 3;
          max-width: 820px;
          margin: 0 auto;
        }
        #s2-subtext {
          font-family: 'Inter', sans-serif;
          font-size: 15.5px;
          font-weight: 400;
          color: #7a748f;
          line-height: 1.65;
        }
        #s2-subtext strong {
          color: #0e0b1c;
          font-weight: 700;
        }
        #s2-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 100px;
          background: linear-gradient(135deg, #8B2FF8 0%, #A85CFF 100%);
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(139,47,248,0.38);
          transition: transform .2s, box-shadow .2s;
          letter-spacing: .01em;
        }
        #s2-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(139,47,248,0.52);
        }
        #s2-cta:active { transform: none; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          #s2-inner       { padding: 0 28px; }
          #s2-h2          { margin-bottom: -160px; }
          #s2-person-img  { height: 380px; }
          #s2-subrow      { flex-direction: column; align-items: flex-start; padding: 16px 0 52px; }
        }
        @media (max-width: 540px) {
          #s2             { padding-top: 48px; }
          #s2-banner-text { font-size: 11.5px; }
          #s2-h2          { margin-bottom: -110px; letter-spacing: -1px; }
          #s2-person-img  { height: 280px; }
        }

        /* ── Hover reveal overlay — lives inside #s2-person ── */
        #s2-reveal {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          z-index: 1;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.45s cubic-bezier(.22,1,.36,1);
        }
        #s2-reveal.s2-reveal-on { opacity: 1; }
        #s2-reveal img {
          height: 530px;
          width: auto;
          max-width: 90%;
          object-fit: contain;
          display: block;
          -webkit-mask-image: linear-gradient(180deg, black 70%, transparent 100%);
          mask-image: linear-gradient(180deg, black 70%, transparent 100%);
          transform: translate(-18px, 10px);
        }
        @media (max-width: 900px) { #s2-reveal img { height: 380px; } }
        @media (max-width: 540px) { #s2-reveal img { height: 280px; } }
        /* Disable on touch devices where hover isn't meaningful */
        @media (hover: none) { #s2-reveal { display: none !important; } }
      `}</style>

      <section id="s2" ref={ref} className={vis ? "s2-vis" : ""}>
        <div id="s2-inner">

          {/* ── Trust banner ── */}
          <div id="s2-banner-row">
            <div id="s2-banner">
              <span id="s2-banner-text">
                #1 Platform for deaf users in the world with great accuracy
              </span>
              <img id="s2-flag" src={FLAG} alt="Latvia" />
            </div>
          </div>

          {/* ── Heading + person (layered) ── */}
          <div
            id="s2-stack"
            ref={stackRef}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <h2 id="s2-h2">
              <span className="s2-muted">Imagine a world where technology</span>
              <br />
              <span className="s2-dark">helps the deaf hear</span>
            </h2>

            <div id="s2-person" ref={personRef}>
              <img
                id="s2-person-img"
                src={PERSON}
                alt="Person using HearMe"
              />

              {/* ── Second-person cursor-reveal overlay ── */}
              <div
                id="s2-reveal"
                className={hover ? "s2-reveal-on" : ""}
                style={{
                  WebkitMaskImage: `radial-gradient(circle 160px at ${pos.x}px ${pos.y}px, black 35%, transparent 72%)`,
                  maskImage:        `radial-gradient(circle 160px at ${pos.x}px ${pos.y}px, black 35%, transparent 72%)`,
                }}
              >
                <img src={PERSON2} alt="" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* ── Sub text + CTA ── */}
          <div id="s2-subrow">
            <p id="s2-subtext">
              AI-powered <strong>assistive technology</strong> platform to make that possible
            </p>
            <button id="s2-cta">
              Provide accurate Translation
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2.5 7h9M8.5 4l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION 3  — "Benefits of Partnering with HearMe"
   Phone mockup + diagonal EASY TO USE + Flexible Features
══════════════════════════════════════════════════════════════════ */
function Section3() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* ════════════════ SECTION 3 ════════════════ */
        #s3 {
          position: relative;
          background: #f7f6fb;
          padding-top: 68px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(32px);
          transition: opacity .85s cubic-bezier(.22,1,.36,1),
                      transform .85s cubic-bezier(.22,1,.36,1);
        }
        #s3.s3-vis { opacity: 1; transform: none; }

        #s3-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 52px;
        }

        /* ── Top: badge + heading ── */
        #s3-top {
          text-align: center;
          margin-bottom: 52px;
        }

        /* Badge */
        #s3-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111;
          border-radius: 100px;
          padding: 5px 14px 5px 6px;
          margin-bottom: 26px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.18);
        }
        #s3-badge-logo {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: contain;
          background: rgba(255,255,255,0.08);
          padding: 3px;
          flex-shrink: 0;
        }
        #s3-badge-txt {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.88);
          letter-spacing: .03em;
          white-space: nowrap;
        }

        /* Main heading — Staatliches */
        #s3-h2 {
          font-family: 'Staatliches', sans-serif;
          font-size: clamp(54px, 7.5vw, 102px);
          font-weight: 400;
          line-height: 0.92;
          letter-spacing: 1.5px;
          color: #0d0b14;
          text-transform: uppercase;
          margin: 0;
        }
        #s3-h2 .s3-hearme { color: #c4c0d4; }

        /* ── Content row: left + right ── */
        #s3-content {
          display: flex;
          align-items: flex-start;
          gap: 48px;
        }

        /* Left column */
        #s3-left {
          flex: 0 0 46%;
          max-width: 500px;
          padding-bottom: 64px;
          display: flex;
          flex-direction: column;
        }

        /* Flexible Features — Inknut Antiqua */
        #s3-subhead {
          font-family: 'Inknut Antiqua', serif;
          font-size: clamp(24px, 2.8vw, 36px);
          font-weight: 600;
          color: #0d0b14;
          line-height: 1.25;
          margin-bottom: 22px;
        }

        /* CTA button */
        #s3-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #111;
          color: #fff;
          border: none;
          border-radius: 100px;
          padding: 11px 22px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          width: fit-content;
          transition: background .2s, transform .2s;
          letter-spacing: .01em;
          margin-bottom: 52px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        }
        #s3-cta:hover  { background: #2a2a2a; transform: translateY(-1px); }
        #s3-cta:active { transform: none; }

        /* Diagonal EASY TO USE stack */
        #s3-easy {
          display: flex;
          flex-direction: column;
          gap: 0px;
        }
        .s3-easy-ln {
          display: block;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(38px, 4.8vw, 62px);
          font-weight: 800;
          color: #0d0b14;
          letter-spacing: -0.5px;
          line-height: 1.08;
          transform: rotate(-7deg);
          transform-origin: left center;
          white-space: nowrap;
        }

        /* Right column — phone */
        #s3-right {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 8px;
        }

        #s3-phone-wrap {
          position: relative;
        }

        /* iPhone-style frame */
        #s3-phone {
          position: relative;
          width: 252px;
          aspect-ratio: 9 / 19.5;
          background: linear-gradient(155deg, #252525 0%, #0e0e0e 100%);
          border-radius: 48px;
          border: 2px solid rgba(200,200,200,0.18);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.06),
            inset 0 -3px 8px rgba(255,255,255,0.03),
            0 60px 100px rgba(0,0,0,0.42),
            0 24px 48px rgba(0,0,0,0.22),
            4px 8px 32px rgba(0,0,0,0.18);
          padding: 14px 10px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        /* Subtle side shine */
        #s3-phone::before {
          content: '';
          position: absolute;
          top: 10%;
          left: -1px;
          width: 3px;
          height: 30%;
          border-radius: 100px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent);
          pointer-events: none;
        }

        /* Dynamic Island */
        #s3-island {
          width: 82px;
          height: 26px;
          background: #0a0a0a;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        /* Screen area */
        #s3-screen {
          flex: 1;
          width: 100%;
          border-radius: 34px;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        #s3-screen::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 34px;
          background: linear-gradient(160deg, rgba(255,255,255,0.03) 0%, transparent 30%);
          pointer-events: none;
          z-index: 2;
        }

        #s3-vid {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Home indicator */
        #s3-bar {
          width: 76px;
          height: 4px;
          border-radius: 100px;
          background: rgba(255,255,255,0.25);
          flex-shrink: 0;
        }

        /* Ground shadow */
        #s3-shadow {
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          width: 65%;
          height: 36px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.32) 0%, transparent 70%);
          filter: blur(12px);
          pointer-events: none;
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          #s3-inner   { padding: 0 28px; }
          #s3-content { flex-direction: column; align-items: center; gap: 52px; }
          #s3-left    { flex: none; max-width: 100%; width: 100%; padding-bottom: 0; }
          #s3-right   { width: 100%; padding-top: 0; }
          .s3-easy-ln { font-size: clamp(32px, 8vw, 52px); }
        }
        @media (max-width: 540px) {
          #s3         { padding-top: 48px; }
          #s3-h2      { font-size: clamp(46px, 13vw, 80px); }
          #s3-phone   { width: 210px; }
          .s3-easy-ln { font-size: 34px; }
        }
      `}</style>

      <section id="s3" ref={ref} className={vis ? "s3-vis" : ""}>
        <div id="s3-inner">

          {/* ── Top: badge + heading ── */}
          <div id="s3-top">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "26px" }}>
              <div id="s3-badge">
                <img id="s3-badge-logo" src={LOGO} alt="" />
                <span id="s3-badge-txt">Feautures</span>
              </div>
            </div>
            <h2 id="s3-h2">
              BENEFITS OF PARTNERING<br />
              WITH <span className="s3-hearme">HEARME</span>
            </h2>
          </div>

          {/* ── Content row ── */}
          <div id="s3-content">

            {/* Left */}
            <div id="s3-left">
              <p id="s3-subhead">Flexible Features</p>

              <button id="s3-cta">
                Get Started with us
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M2.5 7h9M8.5 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Diagonal repeated text */}
              <div id="s3-easy">
                <span className="s3-easy-ln">EASY TO USE</span>
                <span className="s3-easy-ln">EASY TO USE</span>
                <span className="s3-easy-ln">EASY TO USE</span>
              </div>
            </div>

            {/* Right — phone mockup */}
            <div id="s3-right">
              <div id="s3-phone-wrap">
                <div id="s3-phone">
                  <div id="s3-island" />
                  <div id="s3-screen">
                    <video
                      id="s3-vid"
                      src={PHONE_VID}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                  <div id="s3-bar" />
                </div>
                <div id="s3-shadow" />
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION 4  — "Our Process"
   Left text block + right stacked process cards
══════════════════════════════════════════════════════════════════ */
function Section4() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* ════════════════ SECTION 4 ════════════════ */
        #s4 {
          position: relative;
          background: radial-gradient(ellipse at 25% 50%, #eae7f4 0%, #f4f2fa 55%, #edeaf6 100%);
          padding: 88px 0 96px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(32px);
          transition: opacity .85s cubic-bezier(.22,1,.36,1),
                      transform .85s cubic-bezier(.22,1,.36,1);
        }
        #s4.s4-vis { opacity: 1; transform: none; }

        #s4-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 52px;
          display: flex;
          align-items: center;
          gap: 72px;
        }

        /* ── LEFT content block ── */
        #s4-left {
          flex: 0 0 38%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Badge */
        #s4-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111;
          border-radius: 100px;
          padding: 5px 14px 5px 6px;
          width: fit-content;
          margin-bottom: 28px;
          box-shadow: 0 2px 14px rgba(0,0,0,0.15);
        }
        #s4-badge-logo {
          width: 24px; height: 24px;
          border-radius: 50%;
          object-fit: contain;
          background: rgba(255,255,255,0.08);
          padding: 2px;
          flex-shrink: 0;
        }
        #s4-badge-txt {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,.88);
          letter-spacing: .03em;
        }

        /* Heading */
        #s4-h2 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(36px, 4vw, 52px);
          font-weight: 700;
          color: #0d0b14;
          line-height: 1.1;
          letter-spacing: -1px;
          margin: 0 0 20px;
        }

        /* Description */
        #s4-desc {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #7a748f;
          line-height: 1.78;
          margin: 0 0 36px;
          max-width: 360px;
        }
        #s4-desc strong {
          color: #3d3856;
          font-weight: 600;
        }

        /* CTA */
        #s4-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #111;
          color: #fff;
          border: none;
          border-radius: 100px;
          padding: 12px 22px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          width: fit-content;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
          transition: background .2s, transform .2s;
          letter-spacing: .01em;
        }
        #s4-cta:hover  { background: #2a2a2a; transform: translateY(-1px); }
        #s4-cta:active { transform: none; }

        /* ── RIGHT cards column ── */
        #s4-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Shared card base */
        .s4-card {
          background: #fff;
          border-radius: 22px;
          box-shadow:
            0 2px 8px rgba(0,0,0,0.05),
            0 8px 32px rgba(0,0,0,0.06);
          transition: transform .25s, box-shadow .25s;
          overflow: hidden;
        }
        .s4-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.07), 0 16px 48px rgba(0,0,0,0.09);
        }

        /* ── Card 1 — Icon / visual card ── */
        #s4-card1 {
          padding: 28px 24px 24px;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* C logo area with floating chips */
        #s4-c-area {
          position: relative;
          width: 100%;
          height: 148px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #s4-c-img {
          width: 68px;
          height: 68px;
          object-fit: contain;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 4px 16px rgba(139,47,248,0.25));
        }

        /* Floating icon chips around the C logo */
        .s4-chip {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border-radius: 100px;
          padding: 6px 12px 6px 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06);
          z-index: 3;
          white-space: nowrap;
        }
        .s4-chip img {
          width: 18px; height: 18px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .s4-chip-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #2a2540;
          letter-spacing: .01em;
        }

        /* Individual chip positions */
        #s4-chip-ear   { top: 4%;  left: 2%; }
        #s4-chip-mic   { top: 2%;  right: 4%; }
        #s4-chip-wave  { bottom: 4%; left: 4%; }
        #s4-chip-music { bottom: 2%; right: 3%; }

        /* Subtle dotted connector lines from center to chips */
        #s4-c-area::before {
          content: '';
          position: absolute;
          inset: 20px;
          border: 1.5px dashed rgba(168, 85, 247, 0.12);
          border-radius: 50%;
          z-index: 1;
          pointer-events: none;
        }

        /* ── Cards 2 & 3 — Text + arrow button ── */
        .s4-text-card {
          padding: 24px 24px 20px;
        }
        .s4-card-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(20px, 2.2vw, 26px);
          font-weight: 700;
          color: #0d0b14;
          letter-spacing: -0.5px;
          margin: 0 0 10px;
          line-height: 1.15;
        }
        .s4-card-desc {
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 400;
          color: #8b86a0;
          line-height: 1.7;
          margin: 0 0 18px;
          max-width: 420px;
        }

        /* Purple arrow button */
        .s4-arrow-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8B2FF8 0%, #A85CFF 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(139,47,248,0.38);
          transition: transform .2s, box-shadow .2s;
          flex-shrink: 0;
          float: right;
          margin-top: -8px;
        }
        .s4-arrow-btn img {
          width: 16px; height: 16px;
          object-fit: contain;
          filter: invert(1);
        }
        .s4-arrow-btn:hover {
          transform: translateY(-2px) scale(1.08);
          box-shadow: 0 6px 24px rgba(139,47,248,0.52);
        }
        .s4-arrow-btn:active { transform: none; }

        /* clearfix for float */
        .s4-card-footer::after {
          content: ''; display: table; clear: both;
        }
        .s4-card-footer { overflow: hidden; }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          #s4-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 48px;
            padding: 0 28px;
          }
          #s4-left { flex: none; max-width: 100%; }
          #s4-right { width: 100%; }
        }
        @media (max-width: 540px) {
          #s4 { padding: 64px 0 72px; }
          #s4-inner { padding: 0 20px; }
          .s4-card-title { font-size: 20px; }
        }
      `}</style>

      <section id="s4" ref={ref} className={vis ? "s4-vis" : ""}>
        <div id="s4-inner">

          {/* ── LEFT: text content ── */}
          <div id="s4-left">
            {/* Badge */}
            <div id="s4-badge">
              <img id="s4-badge-logo" src={LOGO} alt="" />
              <span id="s4-badge-txt">Process</span>
            </div>

            {/* Heading */}
            <h2 id="s4-h2">Our Process</h2>

            {/* Description */}
            <p id="s4-desc">
              <strong>Real-Time Voice to Text</strong> – Instantly converts spoken
              words into accurate on-screen text.
              <br /><br />
              <strong>Live Sign Language Translation</strong> – Translates speech
              into sign language visuals in real time.
            </p>

            {/* CTA */}
            <button id="s4-cta">
              View more info
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 7h9M8.5 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* ── RIGHT: stacked cards ── */}
          <div id="s4-right">

            {/* Card 1 — Visual / icon card */}
            <div className="s4-card" id="s4-card1">
              <div id="s4-c-area">
                {/* Floating chips */}
                <div className="s4-chip" id="s4-chip-ear">
                  <img src="/icon-ear.png" alt="" />
                  <span className="s4-chip-label">Real-Time Voice</span>
                </div>
                <div className="s4-chip" id="s4-chip-mic">
                  <img src="/icon-mic.png" alt="" />
                  <span className="s4-chip-label">Voice Input</span>
                </div>
                <div className="s4-chip" id="s4-chip-wave">
                  <img src="/icon-wave.png" alt="" />
                </div>
                <div className="s4-chip" id="s4-chip-music">
                  <img src="/icon-music.png" alt="" />
                </div>

                {/* Central C logo */}
                <img id="s4-c-img" src={C_LOGO} alt="HearMe core" />
              </div>
            </div>

            {/* Card 2 — Capture & Listen */}
            <div className="s4-card s4-text-card">
              <div className="s4-card-footer">
                <button className="s4-arrow-btn" aria-label="Learn more">
                  <img src="/icon-arrow-right.png" alt="" />
                </button>
                <h3 className="s4-card-title">Capture &amp; Listen</h3>
                <p className="s4-card-desc">
                  Using advanced neural networks, we instantly convert signs to natural
                  speech or spoken words into accurate on-screen text.
                </p>
              </div>
            </div>

            {/* Card 3 — Seamless Delivery */}
            <div className="s4-card s4-text-card">
              <div className="s4-card-footer">
                <button className="s4-arrow-btn" aria-label="Learn more">
                  <img src="/icon-arrow-right.png" alt="" />
                </button>
                <h3 className="s4-card-title">Seamless Delivery</h3>
                <p className="s4-card-desc">
                  The translated output is delivered in real-time to both parties,
                  creating a fluid, natural conversation without delays.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION 5  — Branding / final visual
   Centered person + bottom pill trust statement
══════════════════════════════════════════════════════════════════ */
const PERSON_VR = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1776374306/image69_vqt67q.png";

function Section5() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* ════════════════ SECTION 5 ════════════════ */
        #s5 {
          position: relative;
          background: #f5f5f7;
          padding: 72px 24px 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          opacity: 0;
          transition: opacity .9s cubic-bezier(.22,1,.36,1);
        }
        #s5.s5-vis { opacity: 1; }

        /* Person image wrapper — needed for logo overlay */
        #s5-img-wrap {
          position: relative;
          display: inline-block;
          width: 100%;
          max-width: 680px;
          transform: scale(.96);
          transition: transform 1s cubic-bezier(.22,1,.36,1);
        }
        #s5.s5-vis #s5-img-wrap { transform: scale(1); }

        /* Person image */
        #s5-img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
        }

        /* HearMe logo overlay on shirt */
        #s5-logo-overlay {
          position: absolute;
          top: 83%;
          left: 50%;
          transform: translateX(-50%);
          width: 30%;
          height: auto;
          object-fit: contain;
          pointer-events: none;
        }

        /* Bottom pill */
        #s5-pill {
          margin-top: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(90deg, #1a1a1a 0%, #2e2e2e 100%);
          border-radius: 100px;
          padding: 14px 40px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        #s5-pill span {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: rgba(255,255,255,.92);
          letter-spacing: .01em;
          white-space: nowrap;
        }

        /* Responsive */
        @media (max-width: 768px) {
          #s5 { padding: 52px 20px 48px; }
          #s5-img { max-width: 90vw; }
          #s5-pill span { font-size: 13.5px; }
          #s5-pill { padding: 12px 28px; }
        }
        @media (max-width: 420px) {
          #s5-pill span { font-size: 12px; white-space: normal; text-align: center; }
          #s5-pill { padding: 11px 22px; }
        }
      `}</style>

      <section id="s5" ref={ref} className={vis ? "s5-vis" : ""}>
        <div id="s5-img-wrap">
          <img
            id="s5-img"
            src={PERSON_VR}
            alt="Person wearing HearMe headset"
            loading="lazy"
          />
          {/* HearMe logo on shirt */}
          <img
            id="s5-logo-overlay"
            src={LOGO}
            alt="HearMe"
          />
        </div>
        <div id="s5-pill">
          <span>Secure Platform for deaf and normal users</span>
        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION 6  — "Our Plans Details" (Pricing)
══════════════════════════════════════════════════════════════════ */
const PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    amount: "20",
    sub: "Perfect for beginners getting started",
    features: [
      "Real-time voice to text conversion",
      "5 hours of live translation",
      "Basic AI voice selection",
      "Text-to-sign visualizer",
      "Email support",
    ],
  },
  {
    id: "moderate",
    name: "Moderate Plan",
    amount: "40",
    sub: "Best for regular users and students",
    features: [
      "Real-time voice to text conversion",
      "15 hours of live translation",
      "Advanced AI voice selection",
      "Text-to-sign + sign-to-text",
      "Priority email support",
      "Multi-language support",
    ],
  },
  {
    id: "high",
    name: "High Plan",
    amount: "60",
    sub: "For professionals and organizations",
    features: [
      "Unlimited real-time translation",
      "High accuracy AI models",
      "Premium voice customization",
      "Full sign language suite",
      "Dedicated account support",
      "API access for integration",
    ],
  },
];

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5l2.2 2.5L8 2.5" stroke="#A85CFF" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Section6() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* ════════════════ SECTION 6 — PRICING ════════════════ */
        #s6 {
          position: relative;
          background:
            radial-gradient(ellipse at 50% 54%, rgba(168,92,255,0.10) 0%, rgba(168,92,255,0.02) 50%, transparent 70%),
            #f5f4f9;
          padding: 88px 0 100px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(32px);
          transition: opacity .85s cubic-bezier(.22,1,.36,1),
                      transform .85s cubic-bezier(.22,1,.36,1);
        }
        #s6.s6-vis { opacity: 1; transform: none; }

        #s6-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 48px;
        }

        /* ── Heading block ── */
        #s6-head {
          text-align: center;
          margin-bottom: 52px;
        }
        #s6-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(36px, 4.5vw, 58px);
          font-weight: 700;
          color: #0d0b14;
          letter-spacing: -1.5px;
          line-height: 1.08;
          margin: 0 0 16px;
        }
        #s6-subpill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(168,92,255,0.14);
          border: 1px solid rgba(168,92,255,0.3);
          border-radius: 100px;
          padding: 7px 24px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: #8B2FF8;
          letter-spacing: .02em;
        }

        /* ── Cards grid ── */
        #s6-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
          align-items: start;
        }

        /* ── Card base ── */
        .s6-card {
          background: linear-gradient(158deg, #1e1040 0%, #0c0818 100%);
          border-radius: 22px;
          border: 1px solid rgba(168,92,255,0.2);
          padding: 36px 36px 56px;
          display: flex;
          flex-direction: column;
          min-height: 560px;
          overflow: hidden;
          box-shadow:
            0 0 0 .5px rgba(255,255,255,0.04),
            0 24px 64px rgba(0,0,0,0.45),
            0 0 40px rgba(168,92,255,0.07);
          /* individual card reveal */
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity .75s cubic-bezier(.22,1,.36,1),
            transform .35s cubic-bezier(.22,1,.36,1),
            box-shadow .35s,
            border-color .35s;
          cursor: pointer;
        }
        #s6.s6-vis .s6-card:nth-child(1) { opacity:1; transform:none; transition-delay:.05s; }
        #s6.s6-vis .s6-card:nth-child(2) { opacity:1; transform:none; transition-delay:.17s; }
        #s6.s6-vis .s6-card:nth-child(3) { opacity:1; transform:none; transition-delay:.29s; }
        #s6.s6-vis .s6-card:hover {
          transform: translateY(-7px);
          border-color: rgba(168,92,255,0.55);
          box-shadow:
            0 32px 80px rgba(0,0,0,0.55),
            0 0 0 1px rgba(168,92,255,0.25),
            0 0 70px rgba(168,92,255,0.22);
        }
        #s6.s6-vis .s6-card:active {
          transform: translateY(-2px) scale(0.98);
          box-shadow:
            0 12px 40px rgba(0,0,0,0.5),
            0 0 40px rgba(168,92,255,0.28);
          border-color: rgba(168,92,255,0.8);
        }

        /* Left purple edge accent */
        .s6-card::before {
          content: '';
          position: absolute;
          top: 14%;
          left: 0;
          width: 3px;
          height: 40%;
          border-radius: 100px;
          background: linear-gradient(180deg, transparent, rgba(168,92,255,0.7), transparent);
          pointer-events: none;
        }
        .s6-card { position: relative; }

        /* Plan label pill */
        .s6-plan-pill {
          display: inline-flex;
          align-items: center;
          background: rgba(168,92,255,0.18);
          border: 1px solid rgba(168,92,255,0.28);
          border-radius: 100px;
          padding: 3px 12px;
          width: fit-content;
          margin-top: 4px;
          margin-bottom: 12px;
        }
        .s6-plan-pill span {
          font-family: 'Inter', sans-serif;
          font-size: 10.5px;
          font-weight: 600;
          color: #C084FC;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        /* Plan name */
        .s6-plan-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(24px, 2.4vw, 30px);
          font-weight: 700;
          color: #fff;
          letter-spacing: -.5px;
          line-height: 1.1;
          margin: 0 0 20px;
        }

        /* Price */
        .s6-price {
          display: flex;
          align-items: baseline;
          gap: 3px;
          margin-bottom: 12px;
        }
        .s6-price-sym {
          font-family: 'Inter', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: rgba(255,255,255,.65);
          line-height: 1;
        }
        .s6-price-num {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(42px, 4.5vw, 54px);
          font-weight: 700;
          color: #fff;
          letter-spacing: -2px;
          line-height: 1;
        }
        .s6-price-mo {
          font-family: 'Inter', sans-serif;
          font-size: 12.5px;
          font-weight: 400;
          color: rgba(255,255,255,.38);
          margin-left: 2px;
        }

        /* Sub */
        .s6-sub {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: rgba(255,255,255,.4);
          line-height: 1.55;
          margin: 0 0 24px;
        }

        /* Button */
        .s6-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 100px;
          padding: 10px 18px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.88);
          cursor: pointer;
          width: 100%;
          margin-bottom: 28px;
          transition: background .2s, border-color .2s;
          letter-spacing: .01em;
        }
        .s6-btn:hover {
          background: rgba(255,255,255,0.14);
          border-color: rgba(255,255,255,0.22);
        }

        /* Divider */
        .s6-divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin-bottom: 26px;
        }

        /* Features */
        .s6-features {
          list-style: none;
          margin: 0; padding: 0;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .s6-feat {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .s6-feat-dot {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 1.5px solid rgba(168,92,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          background: rgba(168,92,255,0.06);
        }
        .s6-feat-txt {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255,255,255,.6);
          line-height: 1.5;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          #s6-inner { padding: 0 24px; }
          #s6-grid  { grid-template-columns: repeat(2, 1fr); }
          #s6-grid .s6-card:last-child {
            grid-column: 1 / -1;
            max-width: 380px;
            margin: 0 auto;
            width: 100%;
          }
        }
        @media (max-width: 560px) {
          #s6 { padding: 60px 0 72px; }
          #s6-inner { padding: 0 16px; }
          #s6-grid  { grid-template-columns: 1fr; }
          #s6-grid .s6-card:last-child { max-width: none; }
        }
      `}</style>

      <section id="s6" ref={ref} className={vis ? "s6-vis" : ""}>
        <div id="s6-inner">

          {/* ── Heading ── */}
          <div id="s6-head">
            <h2 id="s6-title">Our Plans Details</h2>
            <div id="s6-subpill">For your needs</div>
          </div>

          {/* ── Cards ── */}
          <div id="s6-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className="s6-card">
                {/* Label pill */}
                <div className="s6-plan-pill">
                  <span>{plan.name}</span>
                </div>

                {/* Name */}
                <h3 className="s6-plan-name">{plan.name}</h3>

                {/* Price */}
                <div className="s6-price">
                  <span className="s6-price-sym">$</span>
                  <span className="s6-price-num">{plan.amount}</span>
                  <span className="s6-price-mo">/ month</span>
                </div>

                {/* Sub */}
                <p className="s6-sub">{plan.sub}</p>

                {/* CTA */}
                <button className="s6-btn">
                  Start free trial
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M2 6.5h9M8 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="s6-divider" />

                {/* Features */}
                <ul className="s6-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="s6-feat">
                      <span className="s6-feat-dot"><CheckIcon /></span>
                      <span className="s6-feat-txt">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 7 — FEATURES GRID
───────────────────────────────────────────────────────────── */
const S7_FEATURES = [
  {
    id: "fullsupport",
    img: "/feat-fullsupport.png",
    imgAlt: "Full support chip",
    title: "Full support",
    desc: "24/7 technical assistance and AI-driven troubleshooting to ensure your communication never stops",
    imgStyle: { width: "220px", maxWidth: "80%" },
  },
  {
    id: "datareporting1",
    img: "/feat-datareporting.png",
    imgAlt: "Data & Reporting icon",
    title: "Data & Reporting",
    desc: "Track your communication trends and accessibility usage with detailed, private analytics",
    imgStyle: { width: "110px", maxWidth: "60%" },
  },
  {
    id: "marketing",
    img: "/feat-marketing.png",
    imgAlt: "Marketing Assistant icon",
    title: "Marketing Assistant",
    desc: "Tailored tools for deaf entrepreneurs to help manage outreach and professional communication",
    imgStyle: { width: "110px", maxWidth: "60%" },
  },
  {
    id: "itsupport",
    img: "/feat-itsupport.png",
    imgAlt: "IT Support component",
    title: "IT Support",
    desc: "Specialized setup for organizations and schools to integrate HearMe into existing systems",
    imgStyle: { width: "260px", maxWidth: "90%" },
  },
  {
    id: "datareporting2",
    img: "/feat-databars.png",
    imgAlt: "Data bars component",
    title: "Data & Reporting",
    desc: "Signs are converted into text or voice. Speech is instantly translated back into sign language",
    imgStyle: { width: "200px", maxWidth: "80%" },
  },
  {
    id: "admin",
    img: "/feat-admin.png",
    imgAlt: "Admin & Operations component",
    title: "Admin & Operations",
    desc: "Manage internal workflows, user permissions, and service coordination efficiently",
    imgStyle: { width: "240px", maxWidth: "85%" },
  },
];

function Section7() {
  return (
    <>
      <style>{`
        /* ════════════════ SECTION 7 — FEATURES GRID ════════════════ */
        #s7 {
          position: relative;
          background: #f5f5f7;
          padding: 96px 0 108px;
        }

        #s7-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 40px;
        }

        #s7-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 72px 48px;
        }

        .s7-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }

        .s7-visual {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 130px;
          margin-bottom: 28px;
        }

        .s7-visual img {
          display: block;
          object-fit: contain;
          height: 100%;
        }

        .s7-card[data-id="itsupport"] .s7-visual {
          height: 110px;
        }
        .s7-card[data-id="itsupport"] .s7-visual img {
          height: 100%;
          width: auto;
          max-width: none;
        }

        .s7-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #111;
          line-height: 1.25;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }

        .s7-desc {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #555;
          line-height: 1.65;
          max-width: 300px;
        }

        @media (max-width: 860px) {
          #s7-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 56px 36px;
          }
        }

        @media (max-width: 560px) {
          #s7 { padding: 64px 0 72px; }
          #s7-inner { padding: 0 24px; }
          #s7-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .s7-visual { height: 100px; }
        }
      `}</style>

      <section id="s7">
        <div id="s7-inner">
          <div id="s7-grid">
            {S7_FEATURES.map((f) => (
              <div key={f.id} className="s7-card" data-id={f.id}>
                <div className="s7-visual">
                  <img src={f.img} alt={f.imgAlt} style={f.imgStyle} loading="lazy" />
                </div>
                <h3 className="s7-title">{f.title}</h3>
                <p className="s7-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION 8 — CTA + FOOTER
───────────────────────────────────────────────────────────── */
const GLOBE    = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1773256819/earthimg_ehscyi.png";
const LOGO_CLD = "https://res.cloudinary.com/dyo9wiou5/image/upload/v1773253027/image_9_6_xsnho3.png";

function Section8() {
  return (
    <>
      <style>{`
        /* ══ SECTION 8 ══ */
        #s8 {
          position: relative;
          background: transparent;
          padding: 64px 32px 64px !important;
        }

        #s8-wrap {
          max-width: 1160px;
          margin-left: auto !important;
          margin-right: auto !important;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── CTA card ── */
        #s8-cta {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(120deg, #7c3aed 0%, #9333ea 50%, #6d28d9 100%);
          display: flex;
          align-items: stretch;
          min-height: 260px;
          box-shadow: 0 20px 56px rgba(109,40,217,0.45);
          z-index: 2;
        }

        #s8-cta-text {
          flex: 1;
          padding: 52px 40px 52px 52px !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
        }

        #s8-cta-h {
          font-family: 'Bricolage Grotesque', sans-serif !important;
          font-size: clamp(26px, 3.2vw, 42px) !important;
          font-weight: 800 !important;
          color: #ffffff !important;
          line-height: 1.12 !important;
          letter-spacing: -0.5px !important;
          margin: 0 !important;
        }

        #s8-cta-sub {
          font-family: 'Inter', sans-serif !important;
          font-size: 14px !important;
          color: rgba(255,255,255,0.75) !important;
          line-height: 1.65 !important;
          max-width: 400px;
          margin: 0 !important;
        }

        #s8-cta-btn {
          display: inline-flex !important;
          align-items: center !important;
          padding: 12px 28px !important;
          border-radius: 100px !important;
          background: #ffffff !important;
          color: #1a0a3c !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          border: none !important;
          cursor: pointer !important;
          width: fit-content !important;
          transition: background .18s, transform .15s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        #s8-cta-btn:hover { background: #ede9ff !important; transform: translateY(-1px); }

        #s8-globe {
          width: 36%;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          border-radius: 0 24px 24px 0;
        }
        #s8-globe img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        /* ── Black footer ── */
        #s8-footer {
          background: #110d1e !important;
          border-radius: 0 0 24px 24px !important;
          margin-top: 0 !important;
          padding: 52px 56px 44px !important;
          position: relative;
          z-index: 1;
        }

        #s8-footer-inner {
          display: flex !important;
          align-items: flex-start !important;
          gap: 48px !important;
          flex-wrap: nowrap;
        }

        #s8-brand {
          flex: 0 0 220px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
        }
        #s8-brand img {
          width: 120px !important;
          height: auto !important;
          object-fit: contain !important;
          display: block !important;
        }
        #s8-addr {
          font-family: 'Inter', sans-serif !important;
          font-size: 12px !important;
          color: rgba(255,255,255,0.45) !important;
          line-height: 1.85 !important;
          margin: 0 !important;
          display: block !important;
        }

        #s8-links {
          flex: 1 !important;
          display: flex !important;
          justify-content: flex-end !important;
          gap: 52px !important;
        }

        .s8-col { display: flex !important; flex-direction: column !important; }
        .s8-col h4 {
          font-family: 'Inter', sans-serif !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: rgba(255,255,255,0.35) !important;
          text-transform: uppercase !important;
          letter-spacing: .1em !important;
          margin: 0 0 16px !important;
          display: block !important;
        }
        .s8-col ul {
          list-style: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 10px !important;
        }
        .s8-col ul li { display: list-item !important; }
        .s8-col ul li a {
          font-family: 'Inter', sans-serif !important;
          font-size: 13px !important;
          color: rgba(255,255,255,0.62) !important;
          text-decoration: none !important;
          display: block !important;
          transition: color .15s;
        }
        .s8-col ul li a:hover { color: #fff !important; }

        #s8-bar {
          margin-top: 40px !important;
          padding-top: 20px !important;
          border-top: 1px solid rgba(255,255,255,0.08) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }
        #s8-bar p {
          font-family: 'Inter', sans-serif !important;
          font-size: 12px !important;
          color: rgba(255,255,255,0.3) !important;
          margin: 0 !important;
          display: block !important;
        }

        @media (max-width: 900px) {
          #s8-globe { width: 30%; }
          #s8-footer { padding: 44px 32px 36px !important; }
          #s8-footer-inner { flex-wrap: wrap !important; }
          #s8-brand { flex: 0 0 100% !important; }
          #s8-links { justify-content: flex-start !important; }
        }
        @media (max-width: 600px) {
          #s8 { padding: 40px 14px 40px !important; }
          #s8-cta { flex-direction: column; min-height: unset; }
          #s8-cta-text { padding: 36px 24px 24px !important; }
          #s8-globe { width: 100%; height: 190px; border-radius: 0 0 24px 24px; }
          #s8-footer { padding: 36px 20px 28px !important; border-radius: 0 0 20px 20px !important; }
          #s8-links { flex-wrap: wrap !important; gap: 28px !important; }
        }
      `}</style>

      <div id="s8">
        <div id="s8-wrap">

          <div id="s8-cta">
            <div id="s8-cta-text">
              <h2 id="s8-cta-h">
                Ready to break the silence?<br />Start here now
              </h2>
              <p id="s8-cta-sub">
                Join thousands of users worldwide who are communicating without limits.
                Start your journey with HearMe today
              </p>
              <button id="s8-cta-btn">Get Started</button>
              <a
                href="/asl-test"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 14,
                  padding: "10px 22px",
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.35)",
                  borderRadius: 99,
                  color: "#d8b4fe",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                  transition: "background 0.2s",
                }}
              >
                🧪 Test ASL Recognition Live
              </a>
            </div>
            <div id="s8-globe">
              <img src={GLOBE} alt="Globe" loading="lazy" />
            </div>
          </div>

          <div id="s8-footer">
            <div id="s8-footer-inner">
              <div id="s8-brand">
                <img src={LOGO_CLD} alt="HearMe" />
                <p id="s8-addr">
                  Hear Me Technologies SIA<br />
                  Brīvības iela 142-12, Riga, LV-1012<br />
                  Latvia
                </p>
              </div>
              <div id="s8-links">
                <div className="s8-col">
                  <h4>Quick Links</h4>
                  <ul>
                    {["Pricing","Resources","About us","FAQ","Contact us"].map(l => (
                      <li key={l}><a href="#">{l}</a></li>
                    ))}
                  </ul>
                </div>
                <div className="s8-col">
                  <h4>Social</h4>
                  <ul>
                    {["Facebook","Instagram","LinkedIn","Twitter","Youtube"].map(l => (
                      <li key={l}><a href="#">{l}</a></li>
                    ))}
                  </ul>
                </div>
                <div className="s8-col">
                  <h4>Legal</h4>
                  <ul>
                    {["Terms of service","Privacy policy","Cookie policy"].map(l => (
                      <li key={l}><a href="#">{l}</a></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div id="s8-bar">
              <p>© {new Date().getFullYear()} HearMe Technologies SIA. All rights reserved.</p>
              <p>Made with ♥ for accessibility</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Component ──────────────────────────────────────────────────── */
export default function HomePage({ onGetStarted }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setLoaded(true))
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = () => onGetStarted?.("any");

  const handleNav = (id) => {
    if (id === "communicate") go();
  };

  return (
    <>
      <style>{`
        #hm-root, #hm-root * { box-sizing: border-box; margin: 0; padding: 0; }

        #hm-root {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          background: #060214;
          font-family: 'Inter', system-ui, sans-serif;
          color: #fff;
        }

        /* ── Background ── */
        #hm-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            linear-gradient(
              180deg,
              rgba(6,2,20,0.62) 0%,
              rgba(6,2,20,0.1)  48%,
              rgba(6,2,20,0.55) 100%
            ),
            url('${BG}') center 78% / cover no-repeat;
        }
        #hm-ambient {
          position: fixed;
          bottom: 0; right: 0;
          width: 850px; height: 650px;
          background: radial-gradient(
            ellipse at 62% 88%,
            rgba(168,85,247,0.22) 0%,
            transparent 60%
          );
          z-index: 1;
          pointer-events: none;
        }

        /* ══════════════════════ NAV (Floating Island) ══════════════════════ */
        #hm-nav {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: calc(100% - 48px);
          max-width: 1200px;
          height: 64px;
          padding: 0 12px 0 24px;
          background: rgba(11, 8, 30, 0.4);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 100px;
          box-shadow: 
            0 4px 24px -1px rgba(0, 0, 0, 0.4),
            0 0 40px rgba(139, 47, 248, 0.1);
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        #hm-nav:hover {
          border-color: rgba(168, 85, 247, 0.4);
          box-shadow: 
            0 8px 32px -1px rgba(0, 0, 0, 0.5),
            0 0 60px rgba(139, 47, 248, 0.15);
        }

        /* Logo */
        .hm-logo {
          height: 32px;
          width: auto;
          object-fit: contain;
          transition: transform 0.3s ease;
        }
        .hm-logo:hover {
          transform: scale(1.05);
        }

        /* Nav links wrapper */
        #hm-navlinks {
          display: flex;
          align-items: center;
          gap: 12px; /* Increased from 4px to declutter */
          height: 100%;
        }

        /* ── Improved Capsules (Pills) ── */
        .hm-home-pill {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 8px 24px 8px 10px;
          border-radius: 100px;
          background: linear-gradient(135deg, #8B2FF8 0%, #A85CFF 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.02em;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          white-space: nowrap;
          box-shadow: 0 4px 15px rgba(139, 47, 248, 0.4);
        }

        .hm-home-pill:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 30px rgba(139, 47, 248, 0.5);
          filter: brightness(1.1);
        }

        .hm-home-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.4s ease;
        }

        .hm-home-icon img {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        /* ── Regular nav items (Capsules) ── */
        .hm-nb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 100px;
          font-size: 13.5px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          white-space: nowrap;
          letter-spacing: .02em;
        }

        .hm-nb:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }

        /* Get Started Nav Capsule */
        .hm-nav-cta {
          display: inline-flex;
          align-items: center;
          padding: 11px 26px;
          border-radius: 100px;
          background: #fff;
          color: #060214;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          margin-left: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .hm-nav-cta:hover {
          transform: scale(1.03);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }

        /* ══════════════════════ HERO ══════════════════════ */
        #hm-hero {
          position: relative; z-index: 10;
          display: flex;
          align-items: center;
          gap: 32px;
          max-width: 1380px;
          margin: 0 auto;
          padding: 52px 52px 0;
          min-height: calc(100vh - 68px);
        }

        /* ── Left column ── */
        #hm-left {
          flex: 0 0 44%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          align-self: center;
          opacity: 0;
          transform: translateY(30px);
          transition:
            opacity  .9s cubic-bezier(.22,1,.36,1),
            transform .9s cubic-bezier(.22,1,.36,1);
        }
        #hm-left.hm-in { opacity: 1; transform: none; }

        /* ── Improved Social proof pill ── */
        #hm-social {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 100px;
          padding: 6px 16px 6px 8px;
          width: fit-content;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          cursor: pointer;
        }
        #hm-social:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(168, 85, 247, 0.5);
        }
        .hm-avgroup {
          display: flex;
          align-items: center;
        }
        .hm-av {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid #060214;
          margin-right: -10px;
          object-fit: cover;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }
        #hm-social:hover .hm-av {
          transform: scale(1.1);
          margin-right: -6px;
        }
        .hm-av:last-child { margin-right: 0; }
        #hm-social-txt {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: .01em;
          margin-left: 8px;
        }

        /* ── Improved AI-Powered badge ── */
        .hm-ai-tag {
          display: inline-block;
          position: relative;
          background: rgba(139, 47, 248, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 12px;
          padding: 4px 16px;
          box-shadow: 0 0 20px rgba(139, 47, 248, 0.15);
        }
        .hm-ai-tag-inner {
          background: linear-gradient(90deg, #fff 0%, #A85CFF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 0.9em;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        /* ── Subtitle ── */
        #hm-sub {
          font-size: 15px;
          font-weight: 400;
          color: rgba(255,255,255,0.52);
          line-height: 1.78;
          max-width: 370px;
        }

        /* ── Get Started — exact match to Component 5.png ── */
        #hm-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        #hm-cta-label {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          letter-spacing: .01em;
        }
        #hm-cta-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform .2s;
          display: block;
          line-height: 0;
        }
        #hm-cta-btn img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          display: block;
        }
        #hm-cta-btn:hover { transform: scale(1.1); }

        /* ══════════════════════ RIGHT / TABLET ══════════════════════ */
        #hm-right {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          align-self: flex-end;
          opacity: 0;
          transform: translateY(44px);
          transition:
            opacity  1.05s cubic-bezier(.22,1,.36,1) .18s,
            transform 1.05s cubic-bezier(.22,1,.36,1) .18s;
        }
        #hm-right.hm-in { opacity: 1; transform: none; }

        #hm-device-wrap {
          position: relative;
          width: 100%;
          max-width: 700px;
          animation: hm-float 6.5s ease-in-out infinite;
        }
        @keyframes hm-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }

        /* Tablet frame */
        #hm-device {
          position: relative;
          background: linear-gradient(158deg, #1b1240 0%, #0b0820 100%);
          border-radius: 30px;
          border: 1.5px solid rgba(168,85,247,0.32);
          padding: 12px 12px 50px;
          box-shadow:
            0 0 0 .5px rgba(255,255,255,.05),
            0 50px 90px rgba(0,0,0,.7),
            0 0 60px rgba(168,85,247,.22),
            0 0 130px rgba(168,85,247,.08),
            inset 0 1px 0 rgba(255,255,255,.07);
        }
        #hm-device::before {
          content: '';
          position: absolute; inset: 0;
          border-radius: 30px;
          background: linear-gradient(168deg, rgba(255,255,255,.045) 0%, transparent 38%);
          pointer-events: none;
        }
        #hm-cambar {
          display: flex; justify-content: center; padding-bottom: 8px;
        }
        #hm-camdot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.07);
        }
        #hm-screen {
          border-radius: 14px; overflow: hidden;
          background: #000; position: relative;
          aspect-ratio: 16 / 10;
        }
        #hm-screen::after {
          content: '';
          position: absolute; inset: 0; border-radius: 14px;
          background: linear-gradient(160deg, rgba(255,255,255,.04) 0%, transparent 35%);
          pointer-events: none; z-index: 2;
        }
        #hm-vid { width: 100%; height: 100%; object-fit: cover; display: block; }
        #hm-homebar {
          position: absolute; bottom: 14px; left: 50%;
          transform: translateX(-50%);
          width: 72px; height: 4px; border-radius: 100px;
          background: rgba(255,255,255,.22);
        }
        #hm-puddle {
          position: absolute; bottom: -16px; left: 50%;
          transform: translateX(-50%);
          width: 60%; height: 46px;
          background: radial-gradient(ellipse, rgba(168,85,247,.6) 0%, transparent 70%);
          filter: blur(16px); border-radius: 50%;
          pointer-events: none;
        }

        /* ══════════════════════ RESPONSIVE ══════════════════════ */
        @media (max-width: 1200px) {
          #hm-nav {
            width: calc(100% - 32px);
            padding: 0 12px 0 20px;
          }
          #hm-navlinks {
            gap: 4px;
          }
          .hm-nb {
            padding: 8px 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 1024px) {
          #hm-nav {
            top: 16px;
            height: 56px;
          }
          #hm-hero {
            flex-direction: column; align-items: center;
            padding: 100px 32px 40px; min-height: auto; gap: 56px;
          }
          #hm-left {
            flex: none; max-width: 600px;
            align-items: center; text-align: center; align-self: auto;
          }
          #hm-sub    { max-width: none; text-align: center; }
          #hm-right  { flex: none; width: 100%; max-width: 640px; align-self: auto; }
        }

        @media (max-width: 860px) {
          #hm-navlinks .hm-nb:nth-child(2),
          #hm-navlinks .hm-nb:nth-child(3) {
            display: none; /* Hide least important items on tablet */
          }
        }

        @media (max-width: 640px) {
          #hm-nav       { padding: 0 16px; top: 12px; height: 50px; width: calc(100% - 20px); }
          #hm-navlinks  { gap: 2px; }
          .hm-nb { display: none; } /* Hide all text links on mobile */
          .hm-home-pill { padding: 6px 16px 6px 8px; font-size: 12px; }
          .hm-home-icon { width: 24px; height: 24px; }
          .hm-nav-cta { padding: 8px 16px; font-size: 11px; margin-left: 8px; }
          #hm-hero      { padding: 80px 20px 28px; }
          #hm-h1        { letter-spacing: -1px; }
        }
      `}</style>

      <div id="hm-root">
        <div id="hm-bg" />
        <div id="hm-ambient" />

        {/* ══ NAVBAR ══════════════════════════════════════ */}
        <header id="hm-nav">
          <img className="hm-logo" src={LOGO} alt="HearMe" />

          <nav id="hm-navlinks">
            <button className="hm-home-pill" onClick={() => handleNav("home")}>
              <span className="hm-home-icon">
                <img src={ICON_HOME} alt="" />
              </span>
              Home
            </button>

            {[
              { id: "how",        label: "How it works" },
              { id: "emergency",  label: "Emergency" },
              { id: "communicate",label: "Communicate" },
              { id: "features",   label: "Features" },
            ].map((n) => (
              <button
                key={n.id}
                className="hm-nb"
                onClick={() => handleNav(n.id)}
              >
                {n.label}
              </button>
            ))}
            
            <button className="hm-nav-cta" onClick={go}>
              Get Started
            </button>
          </nav>
        </header>

        {/* ══ HERO ════════════════════════════════════════ */}
        <section id="hm-hero">

          {/* Left */}
          <div id="hm-left" className={loaded ? "hm-in" : ""}>

            {/* Social proof pill — real photos + arrow, exact to Component 5 */}
            <div id="hm-social">
              <div className="hm-avgroup">
                <img className="hm-av" src={AVATAR1} alt="user" />
                <img className="hm-av" src={AVATAR2} alt="user" />
                <img className="hm-av" src={AVATAR3} alt="user" />
              </div>
              <span id="hm-social-txt">15k + people believe on us</span>
              <div className="hm-social-arrow">
                <img src="/cta-circle.png" alt="" />
              </div>
            </div>

            {/* Heading */}
            <h1 id="hm-h1">
              Real-time
              <br />
              {/* AI-Powered pill — dark bg + gradient text, exact to Component 5 */}
              <span className="hm-ai-tag">
                <span className="hm-ai-tag-inner">AI-Powered</span>
              </span>
              <br />
              communication
              <br />
              for everyone
            </h1>

            {/* Subtitle */}
            <p id="hm-sub">
              Signs are converted into text or voice.
              <br />
              Speech is instantly translated back into sign language.
            </p>

            {/* Get Started — label + black circle arrow (cta-circle.png) */}
            <div id="hm-cta-row">
              <span id="hm-cta-label">Get Started</span>
              <button id="hm-cta-btn" onClick={go} aria-label="Get Started">
                <img src="/cta-circle.png" alt="→" />
              </button>
            </div>
          </div>

          {/* Right — tablet */}
          <div id="hm-right" className={loaded ? "hm-in" : ""}>
            <div id="hm-device-wrap">
              <div id="hm-device">
                <div id="hm-cambar"><div id="hm-camdot" /></div>
                <div id="hm-screen">
                  <video id="hm-vid" src={VID} autoPlay muted loop playsInline />
                </div>
                <div id="hm-homebar" />
              </div>
              <div id="hm-puddle" />
            </div>
          </div>

        </section>

        {/* ══ SECTION 2 ════════════════════════════════ */}
        <Section2 />

        {/* ══ SECTION 3 ════════════════════════════════ */}
        <Section3 />

        {/* ══ SECTION 4 ════════════════════════════════ */}
        <Section4 />

        {/* ══ SECTION 5 ════════════════════════════════ */}
        <Section5 />

        {/* ══ SECTION 6 ════════════════════════════════ */}
        <Section6 />

        {/* ══ SECTION 7 ════════════════════════════════ */}
        <Section7 />

        {/* ══ SECTION 8 — CTA + FOOTER ═════════════════ */}
        <Section8 />

      </div>
    </>
  );
}

