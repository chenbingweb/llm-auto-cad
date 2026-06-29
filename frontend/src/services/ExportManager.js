class ExportManager {
  constructor() {
    this.exporter = null
  }

  setScene(scene) {
    this.scene = scene
  }

  async exportSTL(mesh, options = {}) {
    const { binary = true, precision = 0.01 } = options

    if (!mesh || !mesh.geometry) {
      throw new Error('Invalid mesh for STL export')
    }

    const triangulation = mesh.geometry.triangulate(precision)

    if (binary) {
      return this.exportBinarySTL(triangulation)
    } else {
      return this.exportASCIISTL(triangulation)
    }
  }

  exportASCIISTL(triangulation) {
    const { vertices } = triangulation
    let stl = 'solid mesh\n'

    for (let i = 0; i < vertices.length; i += 9) {
      const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]]
      const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]]
      const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]]

      const normal = this.calculateNormal(v1, v2, v3)

      stl += `  facet normal ${normal.join(' ')}\n`
      stl += '    outer loop\n'
      stl += `      vertex ${v1.join(' ')}\n`
      stl += `      vertex ${v2.join(' ')}\n`
      stl += `      vertex ${v3.join(' ')}\n`
      stl += '    endloop\n'
      stl += '  endfacet\n'
    }

    stl += 'endsolid mesh\n'
    return stl
  }

  exportBinarySTL(triangulation) {
    const { vertices } = triangulation
    const triangleCount = vertices.length / 9

    const buffer = new ArrayBuffer(84 + triangleCount * 50)
    const view = new DataView(buffer)

    view.setUint32(80, triangleCount, true)

    let offset = 84
    for (let i = 0; i < vertices.length; i += 9) {
      const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]]
      const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]]
      const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]]

      const normal = this.calculateNormal(v1, v2, v3)

      view.setFloat32(offset, normal[0], true); offset += 4
      view.setFloat32(offset, normal[1], true); offset += 4
      view.setFloat32(offset, normal[2], true); offset += 4

      for (const v of [v1, v2, v3]) {
        view.setFloat32(offset, v[0], true); offset += 4
        view.setFloat32(offset, v[1], true); offset += 4
        view.setFloat32(offset, v[2], true); offset += 4
      }

      view.setUint16(offset, 0, true); offset += 2
    }

    return new Uint8Array(buffer)
  }

  calculateNormal(v1, v2, v3) {
    const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
    const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]

    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ]

    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2)

    if (length === 0) return [0, 0, 1]

    return normal.map(n => n / length)
  }

  async exportSTEP(mesh, options = {}) {
    if (!mesh || !mesh.geometry) {
      throw new Error('Invalid mesh for STEP export')
    }

    const triangulation = mesh.geometry.triangulate(0.01)

    let step = 'ISO-10303-21;\n'
    step += 'HEADER;\n'
    step += 'FILE_DESCRIPTION((\'OpenGeometry Export\'),\'2;1\');\n'
    step += 'FILE_NAME(\'export.step\',\'2026-06-29\',(\'\'),(\'\'),\'OpenGeometry\',\'\',\'\');\n'
    step += 'FILE_SCHEMA((\'AUTOMOTIVE_DESIGN\'));\n'
    step += 'ENDSEC;\n'
    step += 'DATA;\n'

    step += this.STEPFaceMesh(triangulation)

    step += 'ENDSEC;\n'
    step += 'END-ISO-10303-21;\n'

    return step
  }

  STEPFaceMesh(triangulation) {
    const { vertices } = triangulation
    let section = ''

    for (let i = 0; i < vertices.length; i += 9) {
      const v1 = `${vertices[i]},${vertices[i + 1]},${vertices[i + 2]}`
      const v2 = `${vertices[i + 3]},${vertices[i + 4]},${vertices[i + 5]}`
      const v3 = `${vertices[i + 6]},${vertices[i + 7]},${vertices[i + 8]}`

      section += `FACE_BOUND('','.T.');\n`
    }

    return section
  }

  async exportIFC(mesh, options = {}) {
    if (!mesh || !mesh.geometry) {
      throw new Error('Invalid mesh for IFC export')
    }

    const triangulation = mesh.geometry.triangulate(0.01)

    let ifc = 'ISO-10303-21;\n'
    ifc += 'HEADER;\n'
    ifc += 'FILE_DESCRIPTION(\'ViewDefinition [CoordinationView]\',\'2;1\');\n'
    ifc += 'FILE_NAME(\'export.ifc\',\'2026-06-29\',(\'\'),(\'\'),\'OpenGeometry\',\'\',\'\');\n'
    ifc += 'FILE_SCHEMA((\'IFC4\'));\n'
    ifc += 'ENDSEC;\n'
    ifc += 'DATA;\n'

    ifc += this.IFCMesh(triangulation)

    ifc += 'ENDSEC;\n'
    ifc += 'END-ISO-10303-21;\n'

    return ifc
  }

  IFCMesh(triangulation) {
    const { vertices } = triangulation
    let section = ''

    section += '#1=IFCPROJECT(\'3N8K2$2n8UQHikC0X8S$2k\',$,$,$,$,$,$,$,$,$);\n'

    return section
  }

  downloadFile(content, filename, mimeType) {
    const blob = content instanceof Uint8Array
      ? new Blob([content], { type: mimeType })
      : new Blob([content], { type: mimeType })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const exportManager = new ExportManager()
export default ExportManager