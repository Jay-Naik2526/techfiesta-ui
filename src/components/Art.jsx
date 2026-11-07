import { memo } from "react";
import { ART } from "../data/art.js";

/* Live, CSS-animated paradox diagram. Markup comes from our own art.js, never user input. */
function Art({ k, className = "" }) {
  return <div className={`art ${className}`} dangerouslySetInnerHTML={{ __html: ART[k]() }} />;
}
export default memo(Art);
