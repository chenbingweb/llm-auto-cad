/**
 * CommandEngine for OpenCASCADE.js
 * Converts JSON commands to OpenCASCADE.js 3D geometry
 */

let oc = null // OpenCASCADE.js instance

const DEFAULT_COLOR = 0x888888

/**
 * Initialize OpenCASCADE.js
 */
export async function initOC() {
  if (oc) return oc

  try {
    const module = await import('opencascade.js')
    console.log('Module keys:', Object.keys(module))

    // Call initOpenCascade to get the OCCT instance
    oc = await module.initOpenCascade()

    console.log('OpenCASCADE.js initialized, gp_Pnt:', typeof oc?.gp_Pnt)
    return oc
  } catch (e) {
    console.error('Failed to load OpenCASCADE.js:', e)
    throw e
  }
}

/**
 * Convert color string/number to OCCT color
 */
function toOCColor(color, defaultColor = DEFAULT_COLOR) {
  if (!oc) return defaultColor

  let hex = defaultColor
  if (typeof color === 'number') {
    hex = color
  } else if (typeof color === 'string' && color.startsWith('#')) {
    hex = parseInt(color.slice(1), 16)
  }

  // OCCT uses RGB values 0-1
  const r = ((hex >> 16) & 0xff) / 255
  const g = ((hex >> 8) & 0xff) / 255
  const b = (hex & 0xff) / 255
  return new oc.Color(r, g, b)
}

/**
 * Create OCCTgp_Pnt from array
 */
function toPnt(arr) {
  if (!oc) return null
  if (!Array.isArray(arr)) arr = [0, 0, 0]
  return new oc.gp_Pnt(arr[0] || 0, arr[1] || 0, arr[2] || 0)
}

/**
 * Create OCCTgp_Vec from array
 */
function toVec(arr) {
  if (!oc) return null
  if (!Array.isArray(arr)) arr = [0, 0, 0]
  return new oc.gp_Vec(arr[0] || 0, arr[1] || 0, arr[2] || 0)
}

/**
 * Create OCCTgp_Dir from array
 */
function toDir(arr) {
  if (!oc) return null
  if (!Array.isArray(arr)) arr = [0, 0, 1]
  return new oc.gp_Dir(arr[0] || 0, arr[1] || 0, arr[2] || 1)
}

/**
 * Create a box shape
 */
function createBox(params, material) {
  const { width = 1, height = 1, depth = 1, center = [0, 0, 0] } = params || {}

  const maker = oc.BRepPrimAPI_MakeBox(
    new oc.gp_Pnt(center[0] || 0, center[1] || 0, center[2] || 0),
    width, height, depth
  )
  const shape = maker.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Create a cylinder shape
 */
function createCylinder(params, material) {
  const {
    radius = 0.5,
    height = 1,
    center = [0, 0, 0],
    direction = [0, 0, 1],
    angle = 2 * Math.PI
  } = params || {}

  const ax2 = new oc.gp_Ax2(
    new oc.gp_Pnt(center[0] || 0, center[1] || 0, center[2] || 0),
    new oc.gp_Dir(direction[0] || 0, direction[1] || 0, direction[2] || 1)
  )
  const maker = oc.BRepPrimAPI_MakeCylinder(ax2, radius, height, angle)
  const shape = maker.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Create a sphere shape
 */
function createSphere(params, material) {
  const { radius = 0.5, center = [0, 0, 0] } = params || {}

  const maker = oc.BRepPrimAPI_MakeSphere(
    new oc.gp_Pnt(center[0] || 0, center[1] || 0, center[2] || 0),
    radius
  )
  const shape = maker.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Create a cone shape
 */
function createCone(params, material) {
  const { radius1 = 0.5, radius2 = 1, height = 1, center = [0, 0, 0], direction = [0, 0, 1] } = params || {}

  const ax2 = new oc.gp_Ax2(
    new oc.gp_Pnt(center[0] || 0, center[1] || 0, center[2] || 0),
    new oc.gp_Dir(direction[0] || 0, direction[1] || 0, direction[2] || 1)
  )

  const maker = oc.BRepPrimAPI_MakeCone(ax2, radius1, radius2, height)
  const shape = maker.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Create a torus shape
 */
function createTorus(params, material) {
  const { radius = 1, tubeRadius = 0.3, center = [0, 0, 0], direction = [0, 0, 1], angle = 2 * Math.PI } = params || {}

  const ax2 = new oc.gp_Ax2(
    new oc.gp_Pnt(center[0] || 0, center[1] || 0, center[2] || 0),
    new oc.gp_Dir(direction[0] || 0, direction[1] || 0, direction[2] || 1)
  )

  const maker = oc.BRepPrimAPI_MakeTorus(ax2, radius, tubeRadius, angle)
  const shape = maker.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Create from extruded polygon
 */
function createExtrude(params, material) {
  const { points = [[0, 0, 0]], height = 1, center = [0, 0, 0], direction = [0, 0, 1], holes = [] } = params || {}

  if (!oc) return null

  // Build wire from points
  const pnts = points.map(p => new oc.gp_Pnt(p[0] || 0, p[1] || 0, p[2] || 0))
  const edges = []
  for (let i = 0; i < pnts.length; i++) {
    const p1 = pnts[i]
    const p2 = pnts[(i + 1) % pnts.length]
    const edgeMaker = oc.BRepBuilderAPI_MakeEdge(p1, p2)
    if (edgeMaker.IsDone()) {
      edges.push(edgeMaker.Edge())
    }
  }

  if (edges.length < 3) {
    throw new Error('Need at least 3 points to create polygon')
  }

  // Create wire
  const wireMaker = oc.BRepBuilderAPI_MakeWire()
  edges.forEach(e => wireMaker.Add(e))
  const wire = wireMaker.Wire()

  // Create face
  const faceMaker = oc.BRepBuilderAPI_MakeFace(wire)
  if (!faceMaker.IsDone()) {
    throw new Error('Failed to create face from polygon')
  }
  let face = faceMaker.Face()

  // Extrude
  const dir = new oc.gp_Vec(direction[0] || 0, direction[1] || 0, direction[2] || 1)
  const prism = oc.BRepPrimAPI_MakePrism(face, dir.Multiplied(height))
  const shape = prism.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Create from sweep/pipe
 */
function createSweep(params, material) {
  const { profilePoints = [[0, 0, 0]], pathPoints = [[0, 0, 0], [0, 0, 1]], radius = 0.1 } = params || {}

  if (!oc) return null

  // Create profile wire
  const profilePnts = profilePoints.map(p => new oc.gp_Pnt(p[0] || 0, p[1] || 0, p[2] || 0))
  const profileEdges = []
  for (let i = 0; i < profilePnts.length; i++) {
    const p1 = profilePnts[i]
    const p2 = profilePnts[(i + 1) % profilePnts.length]
    const edgeMaker = oc.BRepBuilderAPI_MakeEdge(p1, p2)
    if (edgeMaker.IsDone()) {
      profileEdges.push(edgeMaker.Edge())
    }
  }

  const profileWireMaker = oc.BRepBuilderAPI_MakeWire()
  profileEdges.forEach(e => profileWireMaker.Add(e))
  const profileWire = profileWireMaker.Wire()

  // Create path wire
  const pathPnts = pathPoints.map(p => new oc.gp_Pnt(p[0] || 0, p[1] || 0, p[2] || 0))
  const pathEdges = []
  for (let i = 0; i < pathPnts.length - 1; i++) {
    const p1 = pathPnts[i]
    const p2 = pathPnts[i + 1]
    const edgeMaker = oc.BRepBuilderAPI_MakeEdge(p1, p2)
    if (edgeMaker.IsDone()) {
      pathEdges.push(edgeMaker.Edge())
    }
  }

  const pathWireMaker = oc.BRepBuilderAPI_MakeWire()
  pathEdges.forEach(e => pathWireMaker.Add(e))
  const pathWire = pathWireMaker.Wire()

  // Create sweep
  const sweepMaker = oc.BRepOffsetAPI_MakePipe(pathWire, profileWire)
  sweepMaker.Build()
  const shape = sweepMaker.Shape()

  return { shape, color: toOCColor(material?.color) }
}

/**
 * Apply fillet to shape
 */
function applyFillet(shape, radius, edges = null) {
  if (!oc) return shape

  const filletMaker = oc.BRepFilletAPI_MakeFillet(shape)

  if (edges && edges.length > 0) {
    const explorer = oc.TopExp_Explorer(shape, oc.TopAbs_EDGE)
    let edgeIndex = 0
    while (explorer.More()) {
      const edge = explorer.Current()
      if (edges.includes(edgeIndex)) {
        filletMaker.Add(radius, edge)
      }
      explorer.Next()
      edgeIndex++
    }
  } else {
    filletMaker.Add(radius)
  }

  filletMaker.Build()
  return filletMaker.Shape()
}

/**
 * Apply chamfer to shape
 */
function applyChamfer(shape, distance, edges = null) {
  if (!oc) return shape

  const chamferMaker = oc.BRepFilletAPI_MakeChamfer(shape)

  if (edges && edges.length > 0) {
    const explorer = oc.TopExp_Explorer(shape, oc.TopAbs_EDGE)
    let edgeIndex = 0
    while (explorer.More()) {
      const edge = explorer.Current()
      if (edges.includes(edgeIndex)) {
        chamferMaker.Add(distance, distance, edge)
      }
      explorer.Next()
      edgeIndex++
    }
  } else {
    chamferMaker.Add(distance)
  }

  chamferMaker.Build()
  return chamferMaker.Shape()
}

/**
 * Convert OCCT shape to Three.js mesh data
 */
function shapeToMeshData(oc, shape, color = DEFAULT_COLOR) {
  const meshes = []

  // Mesh the shape for rendering
  const mesher = oc.BRepMesh_IncrementalMesh(shape, 0.01)
  mesher.Perform()

  // Explore faces
  const faceExplorer = oc.TopExp_Explorer(shape, oc.TopAbs_FACE)
  while (faceExplorer.More()) {
    const face = faceExplorer.Current()

    const location = oc.TopLoc_Location()

    // Get triangulation
    const triangulation = face.Triangulation(location)

    if (triangulation) {
      const nodes = triangulation.Nodes()
      const triangles = triangulation.Triangles()

      const vertices = []
      const normals = []

      // Get vertex positions
      for (let i = 1; i <= nodes.Length(); i++) {
        const p = nodes.Value(i)
        vertices.push(p.X(), p.Y(), p.Z())
      }

      // Compute normals and get triangle indices
      for (let i = 1; i <= triangles.Length(); i++) {
        const tri = triangles.Value(i)
        const indices = [tri.Value(1), tri.Value(2), tri.Value(3)]

        // Calculate face normal
        const p1 = nodes.Value(indices[0])
        const p2 = nodes.Value(indices[1])
        const p3 = nodes.Value(indices[2])

        const v1 = [p2.X() - p1.X(), p2.Y() - p1.Y(), p2.Z() - p1.Z()]
        const v2 = [p3.X() - p1.X(), p3.Y() - p1.Y(), p3.Z() - p1.Z()]

        const nx = v1[1] * v2[2] - v1[2] * v2[1]
        const ny = v1[2] * v2[0] - v1[0] * v2[2]
        const nz = v1[0] * v2[1] - v1[1] * v2[0]
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1

        const normal = [nx / len, ny / len, nz / len]
        normals.push(...normal, ...normal, ...normal)
      }

      meshes.push({
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        color: color
      })
    }

    faceExplorer.Next()
  }

  // If no triangulation, create a simple bounding box
  if (meshes.length === 0) {
    const bbox = oc.Bnd_Box()
    const bboxExplorer = oc.BRepBndLib_AddShape(bbox, shape)
    bboxExplorer.Perform()

    let xmin, ymin, zmin, xmax, ymax, zmax
    bbox.Get(xmin, ymin, zmin, xmax, ymax, zmax)

    const size = Math.max(xmax - xmin, ymax - ymin, zmax - zmin) * 0.01

    meshes.push({
      vertices: new Float32Array([
        0, 0, 0, size, 0, 0, size, size, 0,
        0, 0, 0, size, size, 0, 0, size, 0
      ]),
      normals: new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, 1, 0, 0, 1, 0, 0, 1
      ]),
      color: color
    })
  }

  return meshes
}

/**
 * Shape creators map
 */
const SHAPE_CREATORS = {
  box: createBox,
  cuboid: createBox,
  cylinder: createCylinder,
  sphere: createSphere,
  cone: createCone,
  torus: createTorus,
  extrude: createExtrude,
  sweep: createSweep
}

class CommandEngine {
  constructor() {
    this.shapes = new Map()
    this.oc = null
    this.shapeCounter = 0
  }

  async init() {
    this.oc = await initOC()
    return this
  }

  setOC(ocInstance) {
    this.oc = ocInstance
  }

  parse(command) {
    if (!command || !command.action) {
      throw new Error('Invalid command: missing action')
    }
    return command
  }

  execute(command, addToScene) {
    if (!this.oc) {
      throw new Error('OpenCASCADE.js not initialized. Call init() first.')
    }

    const parsed = this.parse(command)

    switch (parsed.action) {
      case 'create':
        return this.executeCreate(parsed, addToScene)
      case 'fillet':
        return this.executeFillet(parsed, addToScene)
      case 'chamfer':
        return this.executeChamfer(parsed, addToScene)
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

    const creator = SHAPE_CREATORS[shape]
    if (!creator) {
      throw new Error(`Unknown shape: ${shape}`)
    }

    const { shape: ocShape, color } = creator(params || {}, material || {})

    const id = command.id || `shape_${++this.shapeCounter}`

    // Apply transform if specified
    let finalShape = ocShape
    if (transform) {
      finalShape = this.applyTransform(ocShape, transform)
    }

    const meshData = shapeToMeshData(this.oc, finalShape, color)

    const mesh = {
      id,
      shape: finalShape,
      ocShape: ocShape,
      meshData,
      transform: transform || { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      material: material || { color: '#888888', opacity: 1 },
      shapeType: shape,
      params,
      description
    }

    this.shapes.set(id, mesh)

    if (addToScene) {
      addToScene(mesh)
    }

    return mesh
  }

  executeFillet(command, addToScene) {
    const { id, radius = 0.1, edges } = command
    const mesh = this.shapes.get(id)

    if (!mesh) {
      throw new Error(`Shape not found: ${id}`)
    }

    const filledShape = applyFillet(mesh.ocShape, radius, edges)
    const meshData = shapeToMeshData(this.oc, filledShape, mesh.material?.color)

    mesh.shape = filledShape
    mesh.meshData = meshData
    mesh.description = command.description || `圆角 r=${radius}`

    return mesh
  }

  executeChamfer(command, addToScene) {
    const { id, distance = 0.05, edges } = command
    const mesh = this.shapes.get(id)

    if (!mesh) {
      throw new Error(`Shape not found: ${id}`)
    }

    const chamferedShape = applyChamfer(mesh.ocShape, distance, edges)
    const meshData = shapeToMeshData(this.oc, chamferedShape, mesh.material?.color)

    mesh.shape = chamferedShape
    mesh.meshData = meshData
    mesh.description = command.description || `倒角 d=${distance}`

    return mesh
  }

  executeModify(command, addToScene) {
    const { id, params, transform, material, description } = command
    const mesh = this.shapes.get(id)

    if (!mesh) {
      throw new Error(`Shape not found: ${id}`)
    }

    if (params) {
      // Recreate shape with new params
      const creator = SHAPE_CREATORS[mesh.shapeType]
      if (creator) {
        const { shape: newOcShape, color } = creator(params, material || mesh.material)
        let finalShape = newOcShape
        if (transform) {
          finalShape = this.applyTransform(newOcShape, transform)
        }
        mesh.ocShape = newOcShape
        mesh.shape = finalShape
        mesh.meshData = shapeToMeshData(this.oc, finalShape, color)
        mesh.params = params
      }
    }

    if (transform) {
      mesh.transform = { ...mesh.transform, ...transform }
      mesh.shape = this.applyTransform(mesh.ocShape, mesh.transform)
      mesh.meshData = shapeToMeshData(this.oc, mesh.shape, mesh.material?.color)
    }

    if (material) {
      mesh.material = { ...mesh.material, ...material }
      mesh.meshData = shapeToMeshData(this.oc, mesh.shape, toOCColor(material.color))
    }

    if (description) {
      mesh.description = description
    }

    return mesh
  }

  executeDelete(command, addToScene) {
    const { id } = command
    const mesh = this.shapes.get(id)

    if (!mesh) {
      throw new Error(`Shape not found: ${id}`)
    }

    this.shapes.delete(id)
    return { deleted: id }
  }

  executeTransform(command, addToScene) {
    const { id, transform } = command
    const mesh = this.shapes.get(id)

    if (!mesh) {
      throw new Error(`Shape not found: ${id}`)
    }

    mesh.transform = { ...mesh.transform, ...transform }
    mesh.shape = this.applyTransform(mesh.ocShape, mesh.transform)
    mesh.meshData = shapeToMeshData(this.oc, mesh.shape, mesh.material?.color)

    return mesh
  }

  executeBoolean(command, addToScene) {
    const { operation, ids, params, description } = command

    if (!ids || ids.length < 2) {
      throw new Error('Boolean operation requires at least 2 shapes')
    }

    const meshes = ids.map(id => this.shapes.get(id)).filter(Boolean)

    if (meshes.length < 2) {
      throw new Error('Not enough valid shapes for boolean operation')
    }

    let result = meshes[0].shape

    for (let i = 1; i < meshes.length; i++) {
      switch (operation) {
        case 'union':
        case 'fuse':
        case 'merge': {
          const boolUnion = new oc.BRepAlgoAPI_Union(result, meshes[i].shape)
          boolUnion.Build()
          result = boolUnion.Shape()
          break
        }
        case 'subtract':
        case 'cut':
        case 'difference': {
          const boolCut = new oc.BRepAlgoAPI_Cut(result, meshes[i].shape)
          boolCut.Build()
          result = boolCut.Shape()
          break
        }
        case 'intersect':
        case 'common': {
          const boolCommon = new oc.BRepAlgoAPI_Common(result, meshes[i].shape)
          boolCommon.Build()
          result = boolCommon.Shape()
          break
        }
        default:
          throw new Error(`Unknown boolean operation: ${operation}`)
      }
    }

    const id = `shape_${++this.shapeCounter}`
    const meshData = shapeToMeshData(this.oc, result, meshes[0].material?.color)

    const mesh = {
      id,
      shape: result,
      ocShape: result,
      meshData,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      material: meshes[0].material,
      shapeType: 'boolean',
      params: { operation, ids },
      description
    }

    this.shapes.set(id, mesh)

    if (addToScene) {
      addToScene(mesh)
    }

    return mesh
  }

  executeExport(command) {
    const { format, options = {} } = command

    if (!this.oc) {
      throw new Error('OpenCASCADE.js not initialized')
    }

    const shapes = Array.from(this.shapes.values())
    if (shapes.length === 0) {
      throw new Error('No shapes to export')
    }

    // Merge all shapes into one compound for export
    const builder = new oc.BRep_Builder()
    const compound = new oc.TopoDS_Compound()
    builder.MakeCompound(compound)

    shapes.forEach(mesh => {
      builder.Add(compound, mesh.shape)
    })

    switch (format) {
      case 'step':
      case 'stp': {
        const writer = new oc.STEPControl_Writer()
        writer.Transfer(compound, oc.STEPControl_StepModel)
        // Note: In browser, we'd need to return data differently
        return { format: 'step', status: 'ready', shape: compound }
      }
      case 'stl': {
        const writer = new oc.StlAPI_Writer()
        if (options.deflection) {
          writer.SetDeflection(options.deflection)
        }
        // writer.Write(compound, 'output.stl')
        return { format: 'stl', status: 'ready', shape: compound }
      }
      case 'iges':
      case 'igs': {
        const writer = new oc.IGESControl_Writer()
        writer.Transfer(compound)
        return { format: 'iges', status: 'ready', shape: compound }
      }
      case 'brep': {
        return { format: 'brep', status: 'ready', shape: compound }
      }
      default:
        throw new Error(`Unknown export format: ${format}`)
    }
  }

  applyTransform(shape, transform) {
    if (!this.oc || !transform) return shape

    let result = shape

    // Apply position (translation)
    if (transform.position) {
      const pnt = toPnt(transform.position)
      const tr = new oc.gp_Trsf()
      tr.SetTranslation(pnt)
      const loc = new oc.TopLoc_Location(tr)
      result = new oc.TopoDS_Shape(result)
      result.Location(loc)
    }

    // Apply rotation
    if (transform.rotation) {
      const [rx, ry, rz] = transform.rotation
      const tr = new oc.gp_Trsf()

      if (rx !== 0) {
        tr.SetRotation(new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0), new oc.gp_Dir(1, 0, 0)), rx)
      }
      if (ry !== 0) {
        tr.SetRotation(new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0), new oc.gp_Dir(0, 1, 0)), ry)
      }
      if (rz !== 0) {
        tr.SetRotation(new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0), new oc.gp_Dir(0, 0, 1)), rz)
      }

      const loc = new oc.TopLoc_Location(tr)
      result = new oc.TopoDS_Shape(result)
      result.Location(loc)
    }

    return result
  }

  getMesh(id) {
    return this.shapes.get(id)
  }

  getAllMeshes() {
    return Array.from(this.shapes.values())
  }

  clear() {
    this.shapes.clear()
  }
}

export const commandEngine = new CommandEngine()
export default CommandEngine