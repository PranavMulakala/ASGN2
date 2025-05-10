// Cube.js
// A lightweight VBO-based cube primitive for our boxy turtle

let cubeBuffer = null;
let texCoordBuffer   = null;

/**
 * Initializes a single buffer containing all 36 vertices for a unit cube.
 * Should be called once before any drawCube calls.
 */
function initCubeBuffer() {
  if (!cubeBuffer) {
    const vertices = new Float32Array([
      -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
      -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
      -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
      -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
      -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
      -0.5, -0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
       0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
       0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
      -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,
      -0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
      -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,
      -0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5
    ]);
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const texCoords = new Float32Array([
      // front
       0,0,  1,0,  1,1,  0,1,
      // right
       0,0,  1,0,  1,1,  0,1,
      // back
       0,0,  1,0,  1,1,  0,1,
      // left
       0,0,  1,0,  1,1,  0,1,
      // top
       0,0,  1,0,  1,1,  0,1,
      // bottom
       0,0,  1,0,  1,1,  0,1,
    ]);
    texCoordBuffer = gl.createBuffer();                          // ← UV
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);              // ← UV
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }
}

function drawCube(M, color) {
  initCubeBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);               // ← UV
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0); // ← UV

  const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  const u_Color       = gl.getUniformLocation(gl.program, 'u_Color');
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_Color, color);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}
window.initCubeBuffer = initCubeBuffer;
window.drawCube       = drawCube;
