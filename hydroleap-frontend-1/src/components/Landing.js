import React, { useEffect, useRef } from "react";
import logo from "../assets/hydroleap-logo.png";
import seaVideo from "../assets/sea.mp4";
import FadeTransition from "./FadeTransition";

const Landing = () => {
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleTrigger = () => {
      if (triggerRef.current) {
        triggerRef.current();
      }
    };

    const handleKeyDown = (e) => {
      if (e.code === "Enter" || e.code === "Space") handleTrigger();
    };

    // Set timeout to auto-navigate after 3 seconds (1500ms)
    const autoNavTimeout = setTimeout(handleTrigger, 1500);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleTrigger);

    return () => {
      clearTimeout(autoNavTimeout);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleTrigger);
    };
  }, []);

  return (
    <FadeTransition targetPath="/choose" externalTriggerRef={triggerRef}>
      <div
        style={{
          position: "relative",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
        }}
      >
        <video
          autoPlay
          loop
          muted
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        >
          <source src={seaVideo} type="video/mp4" />
          <p style={{ color: "white", textAlign: "center" }}>
            Your browser does not support HTML5 video.
          </p>
        </video>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              border: "2px solid rgba(255,255,255,0.2)",
              animation: "pulseRing 3s infinite ease-in-out",
            }}
          >
            <img
              src={logo}
              alt="Hydroleap Logo"
              style={{
                width: "160px",
                height: "160px",
                objectFit: "contain",
                filter: "drop-shadow(0 0 10px #ffffff)",
              }}
            />
          </div>
        </div>
      </div>
    </FadeTransition>
  );
};

export default Landing;
