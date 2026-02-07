export function clearPressed(elementsById) {
  for (const element of elementsById.values()) {
    element.classList.remove("active");
  }
}

export function setPressed(elementsById, id, pressed) {
  const element = elementsById.get(id);
  if (!element) return;
  element.classList.toggle("active", pressed);
}

export function setGuideTarget(elementsById, id) {
  for (const element of elementsById.values()) {
    element.classList.remove("guide-next");
  }
  const target = elementsById.get(id);
  if (target) {
    target.classList.add("guide-next");
  }
}
