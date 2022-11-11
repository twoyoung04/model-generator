export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  const needResize =
    canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

//#region shader & program
export function createProgram(
  gl: WebGLRenderingContext,
  shaders: WebGLShader[],
  attribs?: string[],
  callback?: (s: string) => void
) {
  let program = gl.createProgram();
  shaders.forEach(function (shader) {
    gl.attachShader(program, shader);
  });
  if (attribs) {
    attribs.forEach(function (attrib, ndx) {
      gl.bindAttribLocation(program, ndx, attrib);
    });
  }
  gl.linkProgram(program);

  // Check the link status
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    if (callback) callback('Error in program linking...');
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}
//#endregion
