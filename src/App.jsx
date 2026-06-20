import React, { useState, useRef, useCallback } from "react";
import HomePage from "./HomePage";
import Communication from "./Communication";
import ASLRecognition from "./ASLRecognition";
import SignGifTest from "./pages/SignGifTest";
import TestCommunicationAzure from "./pages/TestCommunicationAzure";
import CommunicationLobby from "./pages/CommunicationLobby";
import CommunicationCall from "./pages/CommunicationCall";
import DeafCommunication from "./pages/DeafCommunication";
import ASLTestPage from "./pages/ASLTestPage";

function App() {
  // Check if we're on test pages (legacy routes)
  const pathname = window.location.pathname;
  const hash = window.location.hash;

  console.log("📍 App rendering - pathname:", pathname, "hash:", hash);

  const isSignGifTest =
    pathname === "/sign-gif-test" || hash === "#/sign-gif-test";
  const isAzureTest =
    pathname === "/test-communication-azure" ||
    hash === "#/test-communication-azure";
  const isASLTest =
    pathname === "/asl-test" || hash === "#/asl-test";

  // If on legacy test pages, show them directly (no router)
  if (isSignGifTest) {
    return <SignGifTest />;
  }

  if (isAzureTest) {
    return <TestCommunicationAzure />;
  }

  if (isASLTest) {
    return <ASLTestPage />;
  }

  // Handle new communication flow routes (production)
  if (pathname === "/communication" || pathname.startsWith("/communication/")) {
    if (pathname.startsWith("/communication/call/")) {
      return <CommunicationCall />;
    }
    return <CommunicationLobby />;
  }

  // Legacy test routes (kept for backward compatibility)
  if (
    pathname === "/test-communication" ||
    pathname.startsWith("/test-communication/")
  ) {
    if (pathname.startsWith("/test-communication/call/")) {
      return <CommunicationCall />;
    }
    return <CommunicationLobby />;
  }

  // Handle deaf communication route
  if (
    pathname === "/communication/deaf" ||
    pathname.startsWith("/communication/deaf")
  ) {
    return <DeafCommunication />;
  }

  // App state - show home page first
  const [showHomePage, setShowHomePage] = useState(true);
  const [activeNav, setActiveNav] = useState("communicate");
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const navItemsRef = useRef({});

  // Update indicator position when active nav changes
  React.useEffect(() => {
    if (indicatorRef.current && navItemsRef.current[activeNav]) {
      const activeItem = navItemsRef.current[activeNav];
      const navContainer = navRef.current;

      if (activeItem && navContainer) {
        const navRect = navContainer.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        indicatorRef.current.style.left = `${itemRect.left - navRect.left}px`;
        indicatorRef.current.style.width = `${itemRect.width}px`;
      }
    }
  }, [activeNav]);

  // Handle navigation clicks
  const handleNavClick = useCallback((navId, handler) => {
    setActiveNav(navId);
    if (handler) handler();
  }, []);

  // Handle getting started from home page
  const handleGetStarted = useCallback((userType) => {
    // Route directly to the production communication flow
    window.location.href = "/communication";
  }, []);

  // Show home page first
  if (showHomePage) {
    return <HomePage onGetStarted={handleGetStarted} />;
  }

  // Show Communication page (video calling interface)
  return <Communication />;
}

export default App;
