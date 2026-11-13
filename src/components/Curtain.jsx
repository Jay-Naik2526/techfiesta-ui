/* Page-change transition: the screen folds shut as a wall of tesseract cells — each cell flips closed
   in 3D, in a wave that starts where you clicked — then unfolds onto the next page.
   Driven imperatively by AppProvider.go(). */
const PORTRAIT = typeof innerWidth !== "undefined" && innerWidth < innerHeight;
export const FOLD = PORTRAIT ? { cols: 5, rows: 9 } : { cols: 10, rows: 6 };

export default function Curtain() {
  return (
    <div className="curtain" id="curtain" aria-hidden="true" style={{ "--c": FOLD.cols, "--r": FOLD.rows }}>
      <div className="fold">
        {Array.from({ length: FOLD.cols * FOLD.rows }, (_, i) => <i key={i} className="fold__cell" />)}
      </div>
      <div className="curtain__inner">
        <span className="curtain__mask mono"><span data-curtain-line data-curtain-path>/</span></span>
        <span className="curtain__mask curtain__title"><span data-curtain-line data-curtain-title>Paradox</span></span>
        <span className="curtain__mask mono"><span data-curtain-line>Techfiesta ’26 — inter-NMIMS</span></span>
      </div>
    </div>
  );
}
