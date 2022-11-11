import { EventEmitter, EventType } from './event';

type Vector2 = {
  x: number;
  y: number;
};

export class DrawApp {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  MOUSE_DOWN: boolean;
  CANVAS_X: number;
  CANVAS_Y: number;
  MOUSE_START_X: number;
  MOUSE_START_Y: number;
  points: Vector2[];
  pathStr: string;
  eventEmitter: EventEmitter;

  constructor(canvas: HTMLCanvasElement, eventEmitter: EventEmitter) {
    this.canvas = canvas;
    this.initCanvas();
    this.ctx = canvas.getContext('2d');
    this.ctx.lineWidth = 2;

    this.MOUSE_DOWN = false;
    let rect = canvas.getBoundingClientRect();
    this.CANVAS_X = rect.x;
    this.CANVAS_Y = rect.y;
    this.points = [];
    this.pathStr = '';
    this.eventEmitter = eventEmitter;

    this.initHandler();
  }

  initCanvas() {
    let canvas = this.canvas;
    let style = canvas.style;
    style.backgroundColor = 'transparent';
    style.position = 'absolute';
    style.left = 0 + 'px';
    style.top = 0 + 'px';
    style.zIndex = '10';
    style.width = '100vw';
    style.height = '100vh';
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  private initHandler() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private render(points) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    points = points ?? this.points;

    this.ctx.beginPath();
    this.ctx.strokeStyle = '#33e';

    // draw lines
    for (let i = Math.max(points.length - 6, 0); i < points.length - 1; ) {
      let p0 = points[i++];
      let p1 = points[i++];
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.lineTo(p1.x, p1.y);
    }
    this.ctx.stroke();

    // draw circles
    this.ctx.beginPath();
    this.ctx.fillStyle = '#33e';
    for (let i = Math.max(points.length - 6, 0); i < points.length - 1; ) {
      let p0 = points[i++];
      let p1 = points[i++];
      // !!! have to do this, otherwise the path is continuous and fill the path we create before
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.ellipse(p0.x, p0.y, 4, 4, 0, 0, Math.PI * 2, false);
      this.ctx.ellipse(p1.x, p1.y, 4, 4, 0, 0, Math.PI * 2, false);
    }
    this.ctx.fill();

    // draw curves
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#000';
    if (points.length >= 4) {
      for (let i = 0; i < points.length - 2; ) {
        let p0 = points[i++];
        let p1 = points[i++];
        let p2 = points[i++];
        let p3 = points[i++];

        this.ctx.moveTo(p0.x, p0.y);
        this.ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      }
    }
    this.ctx.stroke();

    this.updatePathStr(points);
  }

  public updatePathStr(points?) {
    points = points ?? this.points;
    let str = '';
    if (points.length >= 4) {
      str += `M${points[0].x / 10} ${points[0].y / 10}`;
      for (let i = 0; i < points.length - 2; ) {
        let p0 = points[i++];
        let p1 = points[i++];
        let p2 = points[i++];
        let p3 = points[i++];

        str += `C${p1.x / 10} ${p1.y / 10} ${p2.x / 10} ${p2.y / 10} ${
          p3.x / 10
        } ${p3.y / 10}`;
      }
    }
    this.pathStr = str;
    // this.eventEmitter.trigger(EventType.SVG_DATA_CHANGING, [
    //   { pathStr: this.pathStr },
    // ]);
  }

  public exportPathStr() {
    return this.pathStr;
  }

  private onMouseDown(e: MouseEvent) {
    this.MOUSE_DOWN = true;
    this.MOUSE_START_X = e.clientX - this.CANVAS_X;
    this.MOUSE_START_Y = e.clientY - this.CANVAS_Y;
  }
  private onMouseMove(e: MouseEvent) {
    if (this.MOUSE_DOWN) {
      let currentX = e.clientX - this.CANVAS_X;
      let currentY = e.clientY - this.CANVAS_Y;
      let startP = { x: this.MOUSE_START_X, y: this.MOUSE_START_Y };
      let currentP = { x: currentX, y: currentY };
      let currentInverseP = {
        x: startP.x * 2 - currentX,
        y: startP.y * 2 - currentY,
      };
      let d = dis(currentP, startP);
      if (d < 5) {
        //
      }
      let points = this.points.map((p) => {
        return { x: p.x, y: p.y };
      });
      if (points.length == 0) {
        points.push(startP, currentP);
      } else {
        points.push(currentInverseP, startP);
        points.push(startP, currentP);
      }
      this.render(points);
    }
  }
  private onMouseUp(e: MouseEvent) {
    if (this.MOUSE_DOWN) {
      this.MOUSE_DOWN = false;
      let currentX = e.clientX - this.CANVAS_X;
      let currentY = e.clientY - this.CANVAS_Y;
      let startP = { x: this.MOUSE_START_X, y: this.MOUSE_START_Y };
      let currentP = { x: currentX, y: currentY };
      let currentInverseP = {
        x: startP.x * 2 - currentX,
        y: startP.y * 2 - currentY,
      };
      let d = dis(currentP, startP);
      if (d < 5) {
        // needs handle?
      }
      if (this.points.length == 0) {
        this.points.push(startP, currentP);
      } else {
        this.points.push(currentInverseP, startP);
        this.points.push(startP, currentP);
      }
      this.eventEmitter.trigger(EventType.SVG_DATA_CHANGING, [
        { pathStr: this.pathStr },
      ]);
    }
  }
}

function dis(p1: Vector2, p2: Vector2) {
  return Math.sqrt(
    (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)
  );
}
