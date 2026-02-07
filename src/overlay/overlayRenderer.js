export function renderOverlay({
  overlayRoot,
  overlayMap,
  onChordDown,
  onChordUp,
  onStrumEvent
}) {
  overlayRoot.innerHTML = "";
  const elementsById = new Map();

  for (const el of overlayMap.elements) {
    const node = document.createElement("div");
    node.dataset.id = el.id;
    node.dataset.type = el.type;
    node.className = `hit hit--${el.type}`;

    const [x, y, w, h] = el.bbox;
    Object.assign(node.style, {
      position: "absolute",
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${w * 100}%`,
      height: `${h * 100}%`,
      transform: "translateZ(0)"
    });

    if (el.type === "chord") {
      node.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        node.setPointerCapture(ev.pointerId);
        onChordDown(el, ev);
      });
      node.addEventListener("pointerup", (ev) => {
        ev.preventDefault();
        onChordUp(el, ev);
      });
      node.addEventListener("pointercancel", (ev) => {
        ev.preventDefault();
        onChordUp(el, ev);
      });
    }

    if (el.type === "strumplate") {
      attachStrumHandlers(node, el, onStrumEvent);
    }

    overlayRoot.appendChild(node);
    elementsById.set(el.id, node);
  }

  return { elementsById };
}

function attachStrumHandlers(node, strumEl, onStrumEvent) {
  let isDown = false;

  const emit = (ev, phase) => {
    const rect = node.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    onStrumEvent({ phase, x, y, pointerType: ev.pointerType, meta: strumEl });
  };

  node.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    isDown = true;
    node.setPointerCapture(ev.pointerId);
    emit(ev, "down");
  });

  node.addEventListener("pointermove", (ev) => {
    if (!isDown) return;
    ev.preventDefault();
    emit(ev, "move");
  });

  node.addEventListener("pointerup", (ev) => {
    if (!isDown) return;
    ev.preventDefault();
    isDown = false;
    emit(ev, "up");
  });

  node.addEventListener("pointercancel", (ev) => {
    if (!isDown) return;
    ev.preventDefault();
    isDown = false;
    emit(ev, "cancel");
  });
}
