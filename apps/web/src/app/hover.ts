/** Hover only exists on mouse-like devices; on touch it would stick after a tap. */
export const CAN_HOVER = matchMedia('(hover:hover) and (pointer:fine)').matches;
