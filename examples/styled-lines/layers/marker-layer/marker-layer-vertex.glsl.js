export default `\
#define SHADER_NAME marker-layer-vertex-shader

attribute vec3 vertices;

attribute vec3 instancePositions;
attribute vec4 instanceColors;
attribute vec3 instancePickingColors;
attribute float instanceRadius;
attribute float instanceAngles;

uniform float opacity;
uniform float renderPickingBuffer;

varying vec4 vColor;

vec2 rotate(vec2 vertex, float angle) {
  float angle_radian = angle * PI / 180.0;
  float cos_angle = cos(angle_radian);
  float sin_angle = sin(angle_radian);
  mat2 rotationMatrix = mat2(cos_angle, -sin_angle, sin_angle, cos_angle);
  return rotationMatrix * vertex * vec2(1.0, -1.0);
}

void main(void) {
  vec2 center = project_position(instancePositions.xy);
  vec2 vertex = rotate(vertices.xy, instanceAngles) * project_scale(instanceRadius);
  gl_Position = project_to_clipspace(vec4(center + vertex, vertices.z, 1.0));

  vColor = vec4(instanceColors.rgb, instanceColors.a * opacity) / 255.;
}
`;
