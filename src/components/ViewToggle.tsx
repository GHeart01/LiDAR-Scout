import { useStore } from "../store";

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
