import happySvg from "./happy.svg";
import calmSvg from "./calm.svg";
import sadSvg from "./sad.svg";
import angrySvg from "./angry.svg";
import anxiousSvg from "./anxious.svg";
import tiredSvg from "./tired.svg";
import loveSvg from "./love.svg";
import thinkingSvg from "./thinking.svg";
import surprisedSvg from "./surprised.svg";
import confidentSvg from "./confident.svg";

// Map from emoji to SVG URL — used for rendering mood icons
// The emoji string is what gets stored in the database
export const MOOD_ICONS: Record<string, string> = {
  "😊": happySvg,
  "😌": calmSvg,
  "😢": sadSvg,
  "😤": angrySvg,
  "😰": anxiousSvg,
  "😴": tiredSvg,
  "🥰": loveSvg,
  "🤔": thinkingSvg,
  "😮": surprisedSvg,
  "😎": confidentSvg,
};
