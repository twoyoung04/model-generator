import * as paper from "paper"
import { EventEmitter, EventType } from "./event"

const { Path, Tool } = paper

export class Pencil {
  canvas: HTMLCanvasElement
  eventEmitter: EventEmitter
  path: paper.Path
  tool: paper.Tool
  mode: any
  currentEditPoint: paper.Point
  currentEditPack: { type: string; segment: any; point: any }
  constructor(canvas: HTMLCanvasElement, eventEmitter: EventEmitter) {
    this.canvas = canvas
    this.eventEmitter = eventEmitter
    this.initCanvas()
    paper.setup(canvas)

    this.mode = "INSERT"

    this.tool = new Tool()
    this.tool.onMouseDown = this.onMouseDown.bind(this)
    this.tool.onMouseDrag = this.onMouseDrag.bind(this)
    this.tool.onMouseUp = this.onMouseUp.bind(this)
  }
  private initCanvas() {
    let canvas = this.canvas
    let style = canvas.style
    style.backgroundColor = "transparent"
    style.position = "absolute"
    style.left = 0 + "px"
    style.top = 0 + "px"
    style.zIndex = "10"
    style.width = "100vw"
    style.height = "100vh"
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
  }

  private onMouseDown(event: paper.MouseEvent) {
    if (this.path) {
      let nearestPack = getNearestPack(this.path, event.point)
      let nearestPoint = nearestPack.point

      if (nearestPack.dis < 5) {
        this.mode = "EDIT"
        this.currentEditPoint = nearestPoint
        this.currentEditPack = nearestPack
      } else {
        this.mode = "INSERT"
        this.path.selected = false
        this.path.remove()

        this.path = new Path({
          segments: [event.point],
          strokeColor: "black",
          fullySelected: true,
        })
      }
    } else {
      this.path = new Path({
        segments: [event.point],
        strokeColor: "black",
        fullySelected: true,
      })
    }
  }

  private onMouseDrag(event) {
    if (this.mode === "INSERT") {
      this.path.add(event.point)
    } else if (this.mode === "EDIT") {
      let pack = this.currentEditPack
      if (pack.type === "CONTROL") {
        pack.point.x = event.point.x - pack.segment.point.x
        pack.point.y = event.point.y - pack.segment.point.y
      } else {
        pack.point.x = event.point.x
        pack.point.y = event.point.y
      }
    }
  }

  private onMouseUp(event) {
    if (this.mode === "INSERT") {
      this.path.simplify(10)
      let svg = this.path.exportSVG() as SVGElement
      let svgStr = svg.getAttribute("d")
      this.eventEmitter.trigger(EventType.SVG_DATA_CHANGING, [
        { pathStr: svgStr },
      ])

      this.path.fullySelected = true
    } else {
      this.mode = "INSERT"
      let svg = this.path.exportSVG() as SVGElement
      let svgStr = svg.getAttribute("d")
      this.eventEmitter.trigger(EventType.SVG_DATA_CHANGING, [
        { pathStr: svgStr },
      ])
    }
  }
}

/**
 * 获取距离点最近的某段曲线
 * @param path 待判断的 path
 * @param point 待计算的点
 * @returns 返回编辑所需的 Pack
 */
export function getNearestPack(path: paper.Path, point: paper.Point) {
  let segments = path.segments
  let dis = 1000000000
  let type = "CONTROL"
  let segment = null
  let resPoint = null

  segments.forEach((seg) => {
    let tempDis = point.getDistance(seg.point)
    if (tempDis < dis) {
      dis = tempDis
      type = "POINT"
      segment = seg
      resPoint = seg.point
    }
    // 控制点的坐标是相对值，需要单独计算
    let ps = [seg.handleIn, seg.handleOut]
    ps.forEach((p) => {
      if (p) {
        let tempDis = point.getDistance({
          x: p.x + seg.point.x,
          y: p.y + seg.point.y,
        })
        if (tempDis < dis) {
          dis = tempDis
          type = "CONTROL"
          segment = seg
          resPoint = p
        }
      }
    })
  })
  return {
    type,
    segment,
    point: resPoint,
    dis,
  }
}
