import { LatheApp } from "./lathe"
import { DrawApp } from "./draw"
import { EventEmitter } from "./event"
import { Pencil } from "./pencil"

export class App {
  constructor() {
    this.initDescription()
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
    // let drawApp = new DrawApp(drawCanvas, eventEmitter)
    let pencil = new Pencil(drawCanvas, eventEmitter)
  }

  private initDescription() {
    const description = document.createElement("p")
    description.innerText = "Just drag to draw & edit"
    description.style.position = "absolute"
    description.style.left = "50%"
    description.style.transform = "translate(-50%, 0px)"
    document.body.append(description)
  }
}
