import vertexShaderSource from '../shaders/lathe/vertexShader.glsl';
import fragmentShaderSource from '../shaders/lathe/fragmentShader.glsl';
import { v2 } from './math/v2';
import * as m4 from './math/m4';
import { EventEmitter, EventType } from './event';
import {
  resizeCanvasToDisplaySize,
  createShader,
  createProgram,
} from './utils';

//#region buffer & attributes
type Attrib = {
  name: string;
  numComponents: number;
  type: number;
  data: any;
};
type VertexData = {
  position?: number[];
  texcoord?: number[];
  normal?: number[];
  indices?: number[];
};

function setBufferAndAttribs(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  attribs: Attrib[]
) {
  attribs.forEach((attr, i) => {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, attr.data, gl.STATIC_DRAW);
    let loc = gl.getAttribLocation(program, attr.name);

    gl.vertexAttribPointer(loc, attr.numComponents, attr.type, false, 0, 0);
    gl.enableVertexAttribArray(loc);
  });
}

function createBufferInfoFromArrays(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  arrays: VertexData
) {
  let bufferInfo = {} as any;
  let indices = arrays.indices;
  if (indices) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    let typeData = new Uint16Array(indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, typeData, gl.STATIC_DRAW);
    bufferInfo.indices = {
      data: buffer,
    };
    bufferInfo.numElements = typeData.length;
  }
  let attribs: Attrib[] = [];
  if (arrays.position) {
    attribs.push({
      name: 'a_position',
      type: gl.FLOAT,
      numComponents: 3,
      data: new Float32Array(arrays.position),
    });
  }
  if (arrays.texcoord) {
    attribs.push({
      name: 'a_texcoord',
      type: gl.FLOAT,
      numComponents: 2,
      data: new Float32Array(arrays.texcoord),
    });
  }
  if (arrays.normal) {
    attribs.push({
      name: 'a_normal',
      type: gl.FLOAT,
      numComponents: 3,
      data: new Float32Array(arrays.normal),
    });
  }
  setBufferAndAttribs(gl, program, attribs);

  return bufferInfo;
}
//#endregion

export class LatheApp {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  program: WebGLProgram;
  // todo: standardize type
  data: any;
  worldMatrix: any;
  bufferInfo: any;
  extents: any;
  projectionMatrix: any;
  svg: string;
  // gl.canvas.addEventListener('mousedown', (e) => {
  //   e.preventDefault();
  //   startRotateCamera(e);
  // });
  // window.addEventListener('mouseup', stopRotateCamera);
  // window.addEventListener('mousemove', rotateCamera);
  // gl.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startRotateCamera(e.touches[0]); });
  // window.addEventListener('touchend', (e) => { stopRotateCamera(e.touches[0]); });
  // window.addEventListener('touchmove', (e) => { rotateCamera(e.touches[0]); });

  lastPos: any;
  moving: boolean;
  eventEmitter: EventEmitter;
  constructor(canvas: HTMLCanvasElement, eventEmitter: EventEmitter) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    let gl = this.gl;
    this.initCanvas();

    // prepare shader
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    let fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    this.program = createProgram(gl, [vertexShader, fragmentShader], []);

    gl.useProgram(this.program);
    gl.viewport(0, 0, canvas.width, canvas.height);

    this.data = {
      tolerance: 0.15,
      distance: 0.04,
      divisions: 20,
      startAngle: 0,
      endAngle: Math.PI * 2,
      capStart: true,
      capEnd: true,
      maxAngle: (30 / 180) * Math.PI,
    };

    this.worldMatrix = m4.identity();
    // this is just a default value
    this.svg =
      'M14.4 24.35C27.3 33.85 16.8 44.75 15.3 45.55C13.8 46.35 17.8 52.05 21.1 55.05';

    this.update();
    this.tick();
    this.eventEmitter = eventEmitter;
    this.eventEmitter.on(
      EventType.SVG_DATA_CHANGING,
      this.handleSvgChange.bind(this)
    );
  }

  private initCanvas() {
    let canvas = this.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
  }

  private startRotateCamera(e) {
    this.lastPos = this.getRelativeMousePosition(this.canvas, e);
    this.moving = true;
  }

  private rotateCamera(e) {
    if (this.moving) {
      const pos = this.getRelativeMousePosition(this.canvas, e);
      const size = [4 / this.canvas.width, 4 / this.canvas.height];
      const delta = v2.mult(v2.sub(this.lastPos, pos), size);

      // this is bad but it works for a basic case so phffttt
      this.worldMatrix = m4.multiply(
        m4.xRotation(delta[1] * 5),
        this.worldMatrix
      );
      this.worldMatrix = m4.multiply(
        m4.yRotation(delta[0] * 5),
        this.worldMatrix
      );

      this.lastPos = pos;

      this.render();
    }
  }

  private stopRotateCamera(e) {
    this.moving = false;
  }
  private getRelativeMousePosition(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const x =
      ((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width;
    const y =
      ((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height;
    return [
      (x - canvas.width / 2) / window.devicePixelRatio,
      (y - canvas.height / 2) / window.devicePixelRatio,
    ];
  }

  private generateMesh(svg: string, bufferInfo?) {
    const curvePoints = parseSVGPath(svg);
    const data = this.data;

    const tempPoints = getPointsOnBezierCurves(curvePoints, data.tolerance);
    const points = simplifyPoints(
      tempPoints,
      0,
      tempPoints.length,
      data.distance
    );
    const tempArrays = lathePoints(
      points,
      data.startAngle,
      data.endAngle,
      data.divisions,
      data.capStart,
      data.capEnd
    );
    const arrays = generateNormals(tempArrays, data.maxAngle);

    const extents = getExtents(tempArrays.position);

    // 该判断避免重复创建 buffer
    bufferInfo = createBufferInfoFromArrays(this.gl, this.program, arrays);

    return {
      extents,
      bufferInfo,
    };
  }

  private update() {
    let info = this.generateMesh(this.svg, this.bufferInfo);
    this.bufferInfo = info.bufferInfo;
    this.extents = info.extents;
    this.render();
  }

  private render() {
    const gl = this.gl;
    const canvas = this.canvas;
    const extents = this.extents;

    const program = this.program;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    // Compute the projection matrix
    const fieldOfViewRadians = Math.PI * 0.25;
    const aspect = gl.canvas.width / gl.canvas.height;
    this.projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    // Compute the camera's matrix using look at.
    const midY = lerp(extents.min[1], extents.max[1], 0.5);
    const sizeToFitOnScreen = (extents.max[1] - extents.min[1]) * 0.6;
    const distance = sizeToFitOnScreen / Math.tan(fieldOfViewRadians * 0.5);
    const cameraPosition = [0, midY, distance];
    const target = [0, midY, 0];
    const up = [0, -1, 0]; // we used 2d points as input which means orientation is flipped
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);

    const viewProjectionMatrix = m4.multiply(this.projectionMatrix, viewMatrix);

    const u_matrix = m4.multiply(viewProjectionMatrix, this.worldMatrix);

    let u_matrixLoc = gl.getUniformLocation(program, 'u_matrix');

    gl.uniformMatrix4fv(u_matrixLoc, false, u_matrix);
    // todo: 设置纹理
    // gl.uni
    let n = this.bufferInfo.numElements;

    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
  }

  private tick() {
    resizeCanvasToDisplaySize(this.canvas);
    let speed = 0.05;
    m4.yRotate(this.worldMatrix, (speed / 60) * Math.PI, this.worldMatrix);
    this.render();

    requestAnimationFrame(this.tick.bind(this));
  }

  private handleSvgChange(e) {
    const { pathStr } = e;
    if (!pathStr) return;
    this.svg = pathStr;
    this.update();
  }
}

//#region utils
// todo: supplement type of params
function getPointsOnBezierCurves(points, tolerance) {
  const newPoints = [];
  const numSegments = (points.length - 1) / 3;
  for (let i = 0; i < numSegments; ++i) {
    const offset = i * 3;
    getPointsOnBezierCurveWithSplitting(points, offset, tolerance, newPoints);
  }
  return newPoints;
}

function getPointsOnBezierCurveWithSplitting(
  points,
  offset,
  tolerance,
  newPoints
) {
  const outPoints = newPoints || [];
  if (flatness(points, offset) < tolerance) {
    // just add the end points of this curve
    outPoints.push(points[offset + 0]);
    outPoints.push(points[offset + 3]);
  } else {
    // subdivide
    const t = 0.5;
    const p1 = points[offset + 0];
    const p2 = points[offset + 1];
    const p3 = points[offset + 2];
    const p4 = points[offset + 3];

    const q1 = v2.lerp(p1, p2, t);
    const q2 = v2.lerp(p2, p3, t);
    const q3 = v2.lerp(p3, p4, t);

    const r1 = v2.lerp(q1, q2, t);
    const r2 = v2.lerp(q2, q3, t);

    const red = v2.lerp(r1, r2, t);

    // do 1st half
    getPointsOnBezierCurveWithSplitting(
      [p1, q1, r1, red],
      0,
      tolerance,
      outPoints
    );
    // do 2nd half
    getPointsOnBezierCurveWithSplitting(
      [red, r2, q3, p4],
      0,
      tolerance,
      outPoints
    );
  }
  return outPoints;
}

function flatness(points, offset) {
  const p1 = points[offset + 0];
  const p2 = points[offset + 1];
  const p3 = points[offset + 2];
  const p4 = points[offset + 3];

  let ux = 3 * p2[0] - 2 * p1[0] - p4[0];
  ux *= ux;
  let uy = 3 * p2[1] - 2 * p1[1] - p4[1];
  uy *= uy;
  let vx = 3 * p3[0] - 2 * p4[0] - p1[0];
  vx *= vx;
  let vy = 3 * p3[1] - 2 * p4[1] - p1[1];
  vy *= vy;

  if (ux < vx) {
    ux = vx;
  }

  if (uy < vy) {
    uy = vy;
  }

  return ux + uy;
}

function parseSVGPath(svg) {
  const points = [];
  let delta = false;
  let keepNext = false;
  let need = 0;
  let value = '';
  let values = [];
  let lastValues = [0, 0];
  let nextLastValues = [0, 0];

  function addValue() {
    if (value.length > 0) {
      values.push(parseFloat(value));
      if (values.length === 2) {
        if (delta) {
          values[0] += lastValues[0];
          values[1] += lastValues[1];
        }
        points.push(values);
        if (keepNext) {
          nextLastValues = values.slice();
        }
        --need;
        if (!need) {
          lastValues = nextLastValues;
        }
        values = [];
      }
      value = '';
    }
  }

  svg.split('').forEach((c) => {
    if ((c >= '0' && c <= '9') || c === '.') {
      value += c;
    } else if (c === '-') {
      addValue();
      value = '-';
    } else if (c === 'm') {
      addValue();
      keepNext = true;
      need = 1;
      delta = true;
    } else if (c === 'c') {
      addValue();
      keepNext = true;
      need = 3;
      delta = true;
    } else if (c === 'M') {
      addValue();
      keepNext = true;
      need = 1;
      delta = false;
    } else if (c === 'C') {
      addValue();
      keepNext = true;
      need = 3;
      delta = false;
    } else if (c === ',') {
      addValue();
    } else if (c === ' ') {
      addValue();
    }
  });
  addValue();
  let min = points[0].slice();
  let max = points[0].slice();
  for (let i = 1; i < points.length; ++i) {
    min = v2.min(min, points[i]);
    max = v2.max(max, points[i]);
  }
  let range = v2.sub(max, min);
  let halfRange = v2.mult(range, 0.5);
  for (let i = 0; i < points.length; ++i) {
    const p = points[i];
    p[0] = p[0] - min[0];
    p[1] = p[1] - min[0] - halfRange[1];
  }
  return points;
}

function simplifyPoints(points, start, end, epsilon, newPoints?) {
  const outPoints = newPoints || [];

  // find the most distant point from the line formed by the endpoints
  const s = points[start];
  const e = points[end - 1];
  let maxDistSq = 0;
  let maxNdx = 1;
  for (let i = start + 1; i < end - 1; ++i) {
    const distSq = v2.distanceToSegmentSq(points[i], s, e);
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
      maxNdx = i;
    }
  }

  // if that point is too far
  if (Math.sqrt(maxDistSq) > epsilon) {
    // split
    simplifyPoints(points, start, maxNdx + 1, epsilon, outPoints);
    simplifyPoints(points, maxNdx, end, epsilon, outPoints);
  } else {
    // add the 2 end points
    outPoints.push(s, e);
  }

  return outPoints;
}

function lathePoints(
  points,
  startAngle, // angle to start at (ie 0)
  endAngle, // angle to end at (ie Math.PI * 2)
  numDivisions, // how many quads to make around
  capStart, // true to cap the top
  capEnd
) {
  // true to cap the bottom
  const positions = [];
  const texcoords = [];
  const indices = [];

  const vOffset = capStart ? 1 : 0;
  const pointsPerColumn = points.length + vOffset + (capEnd ? 1 : 0);
  const quadsDown = pointsPerColumn - 1;

  // 生成 v 值
  let vcoords = [];

  // 先计算出每一点对应的长度
  let length = 0;
  for (let i = 0; i < points.length - 1; ++i) {
    vcoords.push(length);
    length += v2.distance(points[i], points[i + 1]);
  }
  vcoords.push(length); // 最后一个点

  // 除以总长
  vcoords = vcoords.map((v) => v / length);

  // generate points
  for (let division = 0; division <= numDivisions; ++division) {
    const u = division / numDivisions;
    const angle = lerp(startAngle, endAngle, u);
    const mat = m4.yRotation(angle);
    if (capStart) {
      // add point on Y access at start
      positions.push(0, points[0][1], 0);
      texcoords.push(u, 0);
    }
    points.forEach((p, ndx) => {
      const tp = m4.transformPoint(mat, [...p, 0]);
      positions.push(tp[0], tp[1], tp[2]);
      // note: this V is wrong. It's spacing by ndx instead of distance along curve
      const v = (ndx + vOffset) / quadsDown;
      texcoords.push(u, vcoords[ndx]); // v?
    });
    if (capEnd) {
      // add point on Y access at end
      positions.push(0, points[points.length - 1][1], 0);
      texcoords.push(u, 1);
    }
  }

  // generate indices
  for (let division = 0; division < numDivisions; ++division) {
    const column1Offset = division * pointsPerColumn;
    const column2Offset = column1Offset + pointsPerColumn;
    for (let quad = 0; quad < quadsDown; ++quad) {
      indices.push(
        column1Offset + quad,
        column1Offset + quad + 1,
        column2Offset + quad
      );
      indices.push(
        column1Offset + quad + 1,
        column2Offset + quad + 1,
        column2Offset + quad
      );
    }
  }

  return {
    position: positions,
    texcoord: texcoords,
    indices: indices,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getExtents(positions) {
  const min = positions.slice(0, 3);
  const max = positions.slice(0, 3);
  for (let i = 3; i < positions.length; i += 3) {
    min[0] = Math.min(positions[i + 0], min[0]);
    min[1] = Math.min(positions[i + 1], min[1]);
    min[2] = Math.min(positions[i + 2], min[2]);
    max[0] = Math.max(positions[i + 0], max[0]);
    max[1] = Math.max(positions[i + 1], max[1]);
    max[2] = Math.max(positions[i + 2], max[2]);
  }
  return {
    min: min,
    max: max,
  };
}

function generateNormals(arrays, maxAngle) {
  const positions = arrays.position;
  const texcoords = arrays.texcoord;

  // 首先计算出每个面的法向量
  let getNextIndex = makeIndiceIterator(arrays);
  const numFaceVerts = getNextIndex.numElements;
  const numVerts = arrays.position.length;
  const numFaces = numFaceVerts / 3;
  const faceNormals = [];

  // 计算每个面的法向量，
  // 计算过程中为每个面新建顶点
  for (let i = 0; i < numFaces; ++i) {
    const n1 = getNextIndex() * 3;
    const n2 = getNextIndex() * 3;
    const n3 = getNextIndex() * 3;

    const v1 = positions.slice(n1, n1 + 3);
    const v2 = positions.slice(n2, n2 + 3);
    const v3 = positions.slice(n3, n3 + 3);

    faceNormals.push(
      m4.normalize(
        m4.cross(m4.subtractVectors(v1, v2), m4.subtractVectors(v3, v2))
      )
    );
  }

  let tempVerts = {};
  let tempVertNdx = 0;

  // 假设顶点位置精确匹配

  function getVertIndex(x, y, z) {
    const vertId = x + ',' + y + ',' + z;
    const ndx = tempVerts[vertId];
    if (ndx !== undefined) {
      return ndx;
    }
    const newNdx = tempVertNdx++;
    tempVerts[vertId] = newNdx;
    return newNdx;
  }

  // 我们需要算出共享的顶点
  // 这并不像我们看着面那么简单 (三角形)
  // 因为加入我们有一个标准的圆柱
  //
  //
  //      3-4
  //     /   \
  //    2     5   从上往下看，从 S 走到 E, E 和 S
  //    1     6   是不同的点，因为它们不共享UV坐标。
  //     \   /
  //      S/E
  //
  // 顶点在其实和结束位置并不是共享的
  // 由于它们有不同的UV坐标，但如果不
  // 把它们看作共享顶点就会得到错误结果

  const vertIndices = [];
  for (let i = 0; i < numVerts; ++i) {
    const offset = i * 3;
    const vert = positions.slice(offset, offset + 3);
    vertIndices.push(getVertIndex(vert[0], vert[1], vert[2]));
  }

  // 遍历所有顶点记录所在的面
  const vertFaces = [];
  getNextIndex.reset();
  for (let i = 0; i < numFaces; ++i) {
    for (let j = 0; j < 3; ++j) {
      const ndx = getNextIndex();
      const sharedNdx = vertIndices[ndx];
      let faces = vertFaces[sharedNdx];
      if (!faces) {
        faces = [];
        vertFaces[sharedNdx] = faces;
      }
      faces.push(i);
    }
  }

  // 遍历面上的顶点计算每个顶点的法向量
  // 只计算两面角度不大于 maxAngle 面
  // 将结果写入 newPositions,
  // newTexcoords 和 newNormals,
  // 丢弃相同的顶点
  tempVerts = {};
  tempVertNdx = 0;
  const newPositions = [];
  const newTexcoords = [];
  const newNormals = [];

  function getNewVertIndex(x, y, z, nx, ny, nz, u, v) {
    const vertId =
      x +
      ',' +
      y +
      ',' +
      z +
      ',' +
      nx +
      ',' +
      ny +
      ',' +
      nz +
      ',' +
      u +
      ',' +
      v;

    const ndx = tempVerts[vertId];
    if (ndx !== undefined) {
      return ndx;
    }
    const newNdx = tempVertNdx++;
    tempVerts[vertId] = newNdx;
    newPositions.push(x, y, z);
    newNormals.push(nx, ny, nz);
    newTexcoords.push(u, v);
    return newNdx;
  }

  const newVertIndices = [];
  getNextIndex.reset();
  const maxAngleCos = Math.cos(maxAngle);
  // 对每个面
  for (let i = 0; i < numFaces; ++i) {
    // 获取该面的法向量
    const thisFaceNormal = faceNormals[i];
    // 对于面上的每一点
    for (let j = 0; j < 3; ++j) {
      const ndx = getNextIndex();
      const sharedNdx = vertIndices[ndx];
      const faces = vertFaces[sharedNdx];
      const norm = [0, 0, 0];
      faces.forEach((faceNdx) => {
        // 面的法向量是否相同
        const otherFaceNormal = faceNormals[faceNdx];
        const dot = m4.dot(thisFaceNormal, otherFaceNormal);
        if (dot > maxAngleCos) {
          m4.addVectors(norm, otherFaceNormal, norm);
        }
      });
      m4.normalize(norm, norm);
      const poffset = ndx * 3;
      const toffset = ndx * 2;
      newVertIndices.push(
        getNewVertIndex(
          positions[poffset + 0],
          positions[poffset + 1],
          positions[poffset + 2],
          norm[0],
          norm[1],
          norm[2],
          texcoords[toffset + 0],
          texcoords[toffset + 1]
        )
      );
    }
  }

  return {
    position: newPositions,
    texcoord: newTexcoords,
    normal: newNormals,
    indices: newVertIndices,
  };
}

function makeIndexedIndicesFn(arrays) {
  const indices = arrays.indices;
  let ndx = 0;
  const fn = function () {
    return indices[ndx++];
  };
  fn.reset = function () {
    ndx = 0;
  };
  fn.numElements = indices.length;
  return fn;
}

function makeUnindexedIndicesFn(arrays) {
  let ndx = 0;
  const fn = function () {
    return ndx++;
  };
  fn.reset = function () {
    ndx = 0;
  };
  fn.numElements = arrays.positions.length / 3;
  return fn;
}

function makeIndiceIterator(arrays) {
  return arrays.indices
    ? makeIndexedIndicesFn(arrays)
    : makeUnindexedIndicesFn(arrays);
}
//#endregion
