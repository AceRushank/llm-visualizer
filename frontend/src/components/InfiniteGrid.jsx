import React, { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";

export default function InfiniteGrid() {

  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  useEffect(() => {
    const onMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    const onLeave = () => {
      mouseX.set(-9999);
      mouseY.set(-9999);
    };
    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.35) % 40);
    gridOffsetY.set((gridOffsetY.get() + 0.35) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >

      <div style={{ position: "absolute", inset: 0, opacity: 0.05 }}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          maskImage,
          WebkitMaskImage: maskImage,
          pointerEvents: "none",
        }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            right: "-10%",
            top: "-15%",
            width: "35%",
            height: "35%",
            borderRadius: "50%",
            background: "rgba(99,102,241,0.07)",
            filter: "blur(100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-10%",
            bottom: "-15%",
            width: "35%",
            height: "35%",
            borderRadius: "50%",
            background: "rgba(6,182,212,0.05)",
            filter: "blur(100px)",
          }}
        />
      </div>
    </div>
  );
}

function GridPattern({ offsetX, offsetY }) {
  return (
    <svg
      style={{ width: "100%", height: "100%", color: "rgba(99,102,241,1)" }}
    >
      <defs>
        <motion.pattern
          id="infinite-grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#infinite-grid-pattern)" />
    </svg>
  );
}
