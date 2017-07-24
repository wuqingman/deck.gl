export const Quad = {
  vertices: [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0],
  indices: [0, 3, 2, 0, 2, 1]
};

export const Rectangle = {
  vertices: [-2, -0.5, 0, -2, 0.5, 0, 2, 0.5, 0, 2, -0.5, 0],
  indices: [0, 3, 2, 0, 2, 1]
};

export const Arrow = {
  vertices: [0.25, 0, 0, 0.5, 0, 0, -0.25, 0.5, 0, -0.5, 0.5, 0, -0.25, -0.5, 0, -0.5, -0.5, 0],
  indices: [0, 1, 2, 0, 2, 3, 0, 4, 1, 0, 5, 4]
};
