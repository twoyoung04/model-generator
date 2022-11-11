precision mediump float;

attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 u_matrix;

varying vec2 v_texcoord;
varying vec3 v_normal;

void main() {
  // Multiply the position by the matrix.
	// gl_PointSize = a_ttt;
  gl_Position = u_matrix * a_position;

  // Pass the texcoord to the fragment shader.
  v_texcoord = a_texcoord;
	v_normal = a_normal;
}