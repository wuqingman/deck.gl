export const Quad = {
  id: 'quad',
  vertices: [-0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0],
  indices: [0, 3, 2, 0, 2, 1],
  offset: [0.5, 0, 0]
};

export const Rectangle = {
  id: 'rectangle',
  vertices: [-2, -0.5, 0, -2, 0.5, 0, 2, 0.5, 0, 2, -0.5, 0],
  indices: [0, 3, 2, 0, 2, 1],
  offset: [2, 0, 0]
};

export const Arrow = {
  id: 'arrow',
  vertices: [0, 0, 0, 0.5, 0, 0, -0.25, 0.5, 0, -0.5, 0.5, 0, -0.25, -0.5, 0, -0.5, -0.5, 0],
  indices: [0, 1, 2, 0, 2, 3, 0, 4, 1, 0, 5, 4],
  offset: [0.25, 0, 0]
};

export const MARKER_MAP = {
  arrow: Arrow,
  quad: Quad,
  rectangle: Rectangle
};

export const getMarkerId = marker => (marker ? marker.id : 'undefined');
export const getMarkerById = id => MARKER_MAP[id] || null;
