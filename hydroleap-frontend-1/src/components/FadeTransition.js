import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const FadeTransition = ({
  children,
  targetPath,
  externalTriggerRef,
  autoTrigger = false,
}) => {
  const [fade, setFade] = useState(false);
  const navigate = useNavigate();
  const [customPath, setCustomPath] = useState(null);

  const triggerFade = (path = null) => {
    setCustomPath(path);
    setFade(true);
  };

  useEffect(() => {
    if (externalTriggerRef) {
      externalTriggerRef.current = triggerFade;
    }

    if (autoTrigger) {
      const handleTrigger = () => triggerFade();
      const handleKeyDown = (e) => {
        if (e.code === "Enter" || e.code === "Space") handleTrigger();
      };

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("click", handleTrigger);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("click", handleTrigger);
      };
    }
  }, [externalTriggerRef, autoTrigger]);

  useEffect(() => {
    if (fade) {
      const timeout = setTimeout(() => {
        navigate(customPath || targetPath);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [fade, navigate, customPath, targetPath]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {children}
      {fade && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: "100vw",
            backgroundColor: "#000",
            opacity: 1,
            animation: "fadeOut 0.5s forwards",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />
      )}
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FadeTransition;
