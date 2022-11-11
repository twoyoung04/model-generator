precision mediump float;

// Passed in from the vertex shader.
varying vec2 v_texcoord;
varying vec3 v_normal;

uniform sampler2D u_texture;

void main() {
  gl_FragColor = vec4(v_normal * .5 + .5, 1);
}