// Sphere.js
// Build a single VBO of triangles approximating a unit sphere


let sphereBuffer = null;
let sphereVertexCount = 0;

function initSphereBuffer() {
  if (sphereBuffer) return;
  const SPHERE_DIV = 26;  
  const vertices = [];
  const indices  = [];

  for (let j = 0; j <= SPHERE_DIV; j++) {
    const aj = Math.PI * j / SPHERE_DIV;
    const sj = Math.sin(aj), cj = Math.cos(aj);
    for (let i = 0; i <= SPHERE_DIV; i++) {
      const ai = 2 * Math.PI * i / SPHERE_DIV;
      const si = Math.sin(ai), ci = Math.cos(ai);
      vertices.push(si * sj, cj, ci * sj);
    }
  }
  for (let j = 0; j < SPHERE_DIV; j++) {
    for (let i = 0; i < SPHERE_DIV; i++) {
      const p1 = j*(SPHERE_DIV+1) + i;
      const p2 = p1 + (SPHERE_DIV+1);
      indices.push(p1, p2, p1+1, p1+1, p2, p2+1);
    }
  }
  sphereVertexCount = indices.length;

  const sphVerts = new Float32Array(indices.flatMap(idx => [
    vertices[3*idx],
    vertices[3*idx+1],
    vertices[3*idx+2]
  ]));

  sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sphVerts, gl.STATIC_DRAW);
}

/**
 * Draws the sphere primitive using the current shaders.
 * @param {Matrix4} M  model matrix
 * @param {[r,g,b,a]} color RGBA
 */
function drawSphere(M, color) {
  initSphereBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_Color, color);

  gl.drawArrays(gl.TRIANGLES, 0, sphereVertexCount);
}
window.initSphereBuffer = initSphereBuffer;
window.drawSphere      = drawSphere;
