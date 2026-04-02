import { useMemo } from "react";
import leavesImg from "../../assets/leaves.png";

/**
 * Sunlit dappled-light effect — simulates sunlight streaming through window
 * blinds with leaf shadows, progressive blur, and gentle wind animation.
 * Adapted from https://github.com/jackyzha0/sunlit
 */
export default function SunlitEffect() {
  // Time-aware parameters: opacity & warmth shift with the sun
  const { shadowOpacity, glowOpacity, warmth } = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 7 && h < 10) return { shadowOpacity: 0.06, glowOpacity: 0.3, warmth: "warm" };      // morning
    if (h >= 10 && h < 16) return { shadowOpacity: 0.07, glowOpacity: 0.35, warmth: "day" };     // midday
    if (h >= 16 && h < 19) return { shadowOpacity: 0.06, glowOpacity: 0.4, warmth: "sunset" };   // sunset
    return { shadowOpacity: 0, glowOpacity: 0, warmth: "night" };                                 // night — hidden
  }, []);

  if (warmth === "night") return null;

  const bounceColor =
    warmth === "sunset" ? "#f5c89a" : warmth === "warm" ? "#f5d7a6" : "#f0dbb8";

  return (
    <div className="sunlit-root">
      {/* Warm glow from the "window" direction */}
      <div
        className="sunlit-glow"
        style={{ opacity: glowOpacity, background: `linear-gradient(309deg, ${bounceColor}, ${bounceColor} 20%, transparent)` }}
      />
      {/* Floor bounce light */}
      <div
        className="sunlit-glow-bounce"
        style={{ opacity: glowOpacity * 0.6, background: `linear-gradient(355deg, ${bounceColor} 0%, transparent 30%)` }}
      />

      {/* Perspective-projected shadow layer */}
      <div className="sunlit-perspective" style={{ opacity: shadowOpacity }}>
        {/* Leaf shadow texture with SVG wind displacement */}
        <div className="sunlit-leaves" style={{ backgroundImage: `url(${leavesImg})` }} />

        {/* Horizontal blind shutters */}
        <div className="sunlit-blinds">
          <div className="sunlit-shutters">
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} className="sunlit-shutter" />
            ))}
          </div>
          <div className="sunlit-vertical">
            <div className="sunlit-bar" />
            <div className="sunlit-bar" />
          </div>
        </div>
      </div>

      {/* Progressive blur: sharp near "wall", soft further away */}
      <div className="sunlit-progressive-blur">
        <div />
        <div />
        <div />
        <div />
      </div>
    </div>
  );
}
