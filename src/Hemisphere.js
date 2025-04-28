// Add these to your Sphere.js file

let hemisphereBuffer = null;
let hemisphereVertexCount = 0;

function initHemisphereBuffer() {
  if (hemisphereBuffer) return;
  const SPHERE_DIV = 26;  
  const vertices = [];
  const indices  = [];

  for (let j = 0; j <= SPHERE_DIV/2; j++) {
    const aj = Math.PI * j / SPHERE_DIV;
    const sj = Math.sin(aj), cj = Math.cos(aj);
    for (let i = 0; i <= SPHERE_DIV; i++) {
      const ai = 2 * Math.PI * i / SPHERE_DIV;
      const si = Math.sin(ai), ci = Math.cos(ai);
      vertices.push(si * sj, cj, ci * sj);
    }
  }
  
  for (let j = 0; j < SPHERE_DIV/2; j++) {
    for (let i = 0; i < SPHERE_DIV; i++) {
      const p1 = j*(SPHERE_DIV+1) + i;
      const p2 = p1 + (SPHERE_DIV+1);
      indices.push(p1, p2, p1+1, p1+1, p2, p2+1);
    }
  }
  hemisphereVertexCount = indices.length;

  const hemiVerts = new Float32Array(indices.flatMap(idx => [
    vertices[3*idx],
    vertices[3*idx+1],
    vertices[3*idx+2]
  ]));

  hemisphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, hemisphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, hemiVerts, gl.STATIC_DRAW);
}

/**
 * Draws the hemisphere primitive using the current shaders.
 * @param {Matrix4} M  model matrix
 * @param {[r,g,b,a]} color RGBA
 */
function drawHemisphere(M, color) {
  initHemisphereBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, hemisphereBuffer);
  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_Color, color);

  gl.drawArrays(gl.TRIANGLES, 0, hemisphereVertexCount);
}
window.initHemisphereBuffer = initHemisphereBuffer;
window.drawHemisphere = drawHemisphere;