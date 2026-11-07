/* Page-change transition: three beams slide across from opposite sides, like the triangle
   assembling, then carry on through. Driven imperatively by AppProvider.go(). */
export default function Curtain() {
  return (
    <div className="curtain" id="curtain" aria-hidden="true">
      <i className="shard" /><i className="shard" /><i className="shard" />
      <div className="curtain__inner">
        <span className="curtain__mask mono"><span data-curtain-line data-curtain-path>/</span></span>
        <span className="curtain__mask curtain__title"><span data-curtain-line data-curtain-title>Paradox</span></span>
        <span className="curtain__mask mono"><span data-curtain-line>Techfiesta ’26 — inter-NMIMS</span></span>
      </div>
    </div>
  );
}
