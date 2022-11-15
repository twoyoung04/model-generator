import { LatheApp } from "./lathe"
import { DrawApp } from "./draw"
import { EventEmitter } from "./event"

export class App {
  constructor() {
    const webglCanvas = document.createElement("canvas") as HTMLCanvasElement
    const drawCanvas = document.createElement("canvas") as HTMLCanvasElement
    const container = document.createElement("div") as HTMLDivElement
    container.style.position = "relative"

    webglCanvas.style.width = "100vw"
    webglCanvas.style.height = "100vh"

    document.body.append(container)
    container.append(webglCanvas)
    container.append(drawCanvas)

    const eventEmitter = new EventEmitter()

    let latheApp = new LatheApp(webglCanvas, eventEmitter)
    let drawApp = new DrawApp(drawCanvas, eventEmitter)
  }
}
