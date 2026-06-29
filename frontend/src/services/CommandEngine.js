import * as OG from 'opengeometry'

const SHAPE_CREATORS = {
  cuboid: (params) => new OG.Cuboid(params.width, params.height, params.depth),
  cylinder: (params) => new OG.Cylinder(params.radius, params.height, params.segments),
  sphere: (params) => new OG.Sphere(params.radius, params.segments),
  wedge: (params) => new OG.Wedge(params.width, params.height, params.depth),
  polygon: (params) => new OG.Polygon(params.points, params.holes),
  arc: (params) => new OG.Arc(params.center, params.radius, params.startAngle, params.endAngle),
  curve: (params) => new OG.Curve(params.controlPoints),
  line: (params) => new OG.Line(params.start, params.end),
  polyline: (params) => new OG.Polyline(params.points),
  rectangle: (params) => new OG.Rectangle(params.width, params.height, params.center)
}

class CommandEngine {
  constructor() {
    this.scene = null
    this.meshes = new Map()
  }

  setScene(scene) {
    this.scene = scene
  }

  parse(command) {
    if (!command || !command.action) {
      throw new Error('Invalid command: missing action')
    }
    return command
  }

  execute(command, addToScene) {
    const parsed = this.parse(command)

    switch (parsed.action) {
      case 'create':
        return this.executeCreate(parsed, addToScene)
      case 'modify':
        return this.executeModify(parsed, addToScene)
      case 'delete':
        return this.executeDelete(parsed, addToScene)
      case 'transform':
        return this.executeTransform(parsed, addToScene)
      case 'boolean':
        return this.executeBoolean(parsed, addToScene)
      case 'export':
        return this.executeExport(parsed)
      default:
        throw new Error(`Unknown action: ${parsed.action}`)
    }
  }

  executeCreate(command, addToScene) {
    const { shape, params, transform, material, description } = command

    if (!SHAPE_CREATORS[shape]) {
      throw new Error(`Unknown shape: ${shape}`)
    }

    const geometry = SHAPE_CREATORS[shape](params || {})

    const mesh = {
      id: `mesh_${Date.now()}`,
      geometry,
      transform: transform || { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      material: material || { color: '#888888', opacity: 1 },
      shape,
      params,
      description
    }

    this.meshes.set(mesh.id, mesh)

    if (addToScene) {
      addToScene(mesh)
    }

    return mesh
  }

  executeModify(command, addToScene) {
    const { id, params, transform, material, description } = command
    const mesh = this.meshes.get(id)

    if (!mesh) {
      throw new Error(`Mesh not found: ${id}`)
    }

    if (params) {
      if (mesh.shape && SHAPE_CREATORS[mesh.shape]) {
        mesh.geometry = SHAPE_CREATORS[mesh.shape](params)
        mesh.params = params
      }
    }

    if (transform) {
      mesh.transform = { ...mesh.transform, ...transform }
    }

    if (material) {
      mesh.material = { ...mesh.material, ...material }
    }

    if (description) {
      mesh.description = description
    }

    return mesh
  }

  executeDelete(command, addToScene) {
    const { id } = command
    const mesh = this.meshes.get(id)

    if (!mesh) {
      throw new Error(`Mesh not found: ${id}`)
    }

    this.meshes.delete(id)
    return { deleted: id }
  }

  executeTransform(command, addToScene) {
    const { id, transform } = command
    const mesh = this.meshes.get(id)

    if (!mesh) {
      throw new Error(`Mesh not found: ${id}`)
    }

    mesh.transform = { ...mesh.transform, ...transform }
    return mesh
  }

  executeBoolean(command, addToScene) {
    const { operation, ids, params, description } = command

    if (!ids || ids.length < 2) {
      throw new Error('Boolean operation requires at least 2 meshes')
    }

    const meshes = ids.map(id => this.meshes.get(id)).filter(Boolean)

    if (meshes.length < 2) {
      throw new Error('Not enough valid meshes for boolean operation')
    }

    let result = meshes[0].geometry
    for (let i = 1; i < meshes.length; i++) {
      switch (operation) {
        case 'union':
          result = result.union(meshes[i].geometry)
          break
        case 'subtract':
          result = result.subtract(meshes[i].geometry)
          break
        case 'intersect':
          result = result.intersect(meshes[i].geometry)
          break
        default:
          throw new Error(`Unknown boolean operation: ${operation}`)
      }
    }

    const mesh = {
      id: `mesh_${Date.now()}`,
      geometry: result,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      material: meshes[0].material,
      shape: 'boolean',
      params: { operation, ids },
      description
    }

    this.meshes.set(mesh.id, mesh)

    if (addToScene) {
      addToScene(mesh)
    }

    return mesh
  }

  executeExport(command) {
    const { format, options } = command

    const exportFormats = {
      stl: 'exportSTL',
      step: 'exportSTEP',
      ifc: 'exportIFC',
      pdf: 'exportPDF'
    }

    if (!exportFormats[format]) {
      throw new Error(`Unknown export format: ${format}`)
    }

    return { format, options, status: 'ready' }
  }

  getMesh(id) {
    return this.meshes.get(id)
  }

  getAllMeshes() {
    return Array.from(this.meshes.values())
  }

  clear() {
    this.meshes.clear()
  }
}

export const commandEngine = new CommandEngine()
export default CommandEngine