import { useStore } from "../store.js";

// Floating segmented control to switch between the 3D and top-down cameras.
export default function ViewToggle() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  return (
    <div id="view-toggle" title="Camera view">
      <button className={view === "iso" ? "active" : ""} onClick={() => setView("iso")}>
        3D
      </button>
      <button className={view === "top" ? "active" : ""} onClick={() => setView("top")}>
        Top
      </button>
    </div>
  );
}
