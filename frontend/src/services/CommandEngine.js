import * as OG from 'opengeometry'

const DEFAULT_COLOR = 0x888888

function toVector3(arr) {
  if (!Array.isArray(arr)) return new OG.Vector3(0, 0, 0)
  return new OG.Vector3(arr[0] || 0, arr[1] || 0, arr[2] || 0)
}

function toColor(color) {
  if (typeof color === 'number') return color
  if (typeof color === 'string' && color.startsWith('#')) {
    return parseInt(color.slice(1), 16)
  }
  return DEFAULT_COLOR
}

const SHAPE_CREATORS = {
  cuboid: (params, material) => new OG.Cuboid({
    center: toVector3(params?.center),
    width: params?.width ?? 1,
    height: params?.height ?? 1,
    depth: params?.depth ?? 1,
    color: toColor(material?.color ?? params?.color)
  }),
  cylinder: (params, material) => new OG.Cylinder({
    center: toVector3(params?.center),
    radius: params?.radius ?? 0.5,
    height: params?.height ?? 1,
    segments: params?.segments ?? 32,
    angle: params?.angle ?? 2 * Math.PI,
    color: toColor(material?.color ?? params?.color)
  }),
  sphere: (params, material) => new OG.Sphere({
    center: toVector3(params?.center),
    radius: params?.radius ?? 0.5,
    widthSegments: params?.segments ?? 32,
    heightSegments: params?.segments ?? 32,
    color: toColor(material?.color ?? params?.color)
  }),
  wedge: (params, material) => new OG.Wedge({
    center: toVector3(params?.center),
    width: params?.width ?? 1,
    height: params?.height ?? 1,
    depth: params?.depth ?? 1,
    color: toColor(material?.color ?? params?.color)
  }),
  polygon: (params, material) => {
    const vertices = (params?.points || [[0, 0, 0], [1, 0, 0], [0, 1, 0]]).map(toVector3)
    const holes = (params?.holes || []).map(hole => hole.map(toVector3))
    return new OG.Polygon({
      vertices,
      holes: holes.length ? holes : undefined,
      color: toColor(material?.color ?? params?.color)
    })
  },
  arc: (params, material) => new OG.Arc({
    center: toVector3(params?.center),
    radius: params?.radius ?? 1,
    startAngle: params?.startAngle ?? 0,
    endAngle: params?.endAngle ?? 2 * Math.PI,
    segments: params?.segments ?? 32,
    color: toColor(material?.color ?? params?.color)
  }),
  curve: (params, material) => {
    const controlPoints = (params?.controlPoints || [[0, 0, 0], [1, 0, 0], [1, 1, 0]]).map(toVector3)
    return new OG.Curve({
      controlPoints,
      color: toColor(material?.color ?? params?.color)
    })
  },
  line: (params, material) => new OG.Line({
    start: toVector3(params?.start),
    end: toVector3(params?.end || [1, 0, 0]),
    color: toColor(material?.color ?? params?.color)
  }),
  polyline: (params, material) => {
    const points = (params?.points || [[0, 0, 0], [1, 0, 0]]).map(toVector3)
    return new OG.Polyline({
      points,
      color: toColor(material?.color ?? params?.color)
    })
  },
  rectangle: (params, material) => new OG.Rectangle({
    center: toVector3(params?.center),
    width: params?.width ?? 1,
    breadth: params?.height ?? 1,
    color: toColor(material?.color ?? params?.color)
  })
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

    const geometry = SHAPE_CREATORS[shape](params || {}, material || {})

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
        mesh.geometry = SHAPE_CREATORS[mesh.shape](params, material || mesh.material)
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
          result = OG.booleanUnion(result, meshes[i].geometry)
          break
        case 'subtract':
          result = OG.booleanSubtraction(result, meshes[i].geometry)
          break
        case 'intersect':
          result = OG.booleanIntersection(result, meshes[i].geometry)
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
