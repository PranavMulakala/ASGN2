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
      // Front face UVs
       0,0,  1,0,  1,1,   0,0,  1,1,  0,1,
      // Back face UVs
       0,0,  1,0,  1,1,   0,0,  1,1,  0,1,
      // Left face UVs
       0,0,  1,0,  1,1,   0,0,  1,1,  0,1,
      // Right face UVs
       0,0,  1,0,  1,1,   0,0,  1,1,  0,1,
      // Top face UVs
       0,0,  1,0,  1,1,   0,0,  1,1,  0,1,
      // Bottom face UVs
       0,0,  1,0,  1,1,   0,0,  1,1,  0,1
    ]);
    texCoordBuffer = gl.createBuffer();                          // ← UV
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);              // ← UV
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }
}

function drawCube(M, color) {
  initCubeBuffer();

  // Fetch locations locally
  const a_Position_loc = gl.getAttribLocation(gl.program, 'a_Position');
  const a_TexCoord_loc = gl.getAttribLocation(gl.program, 'a_TexCoord');
  const u_ModelMatrix_loc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  // u_Color is part of the original drawCube, though Render.js mostly uses u_BaseColor for turtle
  const u_Color_loc = gl.getUniformLocation(gl.program, 'u_Color');

  // Basic check for attribute locations
  if (a_Position_loc === -1) {
    console.error("Cube.js: Failed to get attribute location for a_Position.");
    return;
  }
  // For textured cubes, a_TexCoord_loc is essential.
  // If it might sometimes be called for non-textured cubes where a_TexCoord isn't in the shader,
  // you might need more sophisticated handling, but for skybox it's needed.
  if (a_TexCoord_loc === -1) {
      console.warn("Cube.js: Failed to get attribute location for a_TexCoord. Texturing may fail.");
      // Proceeding, but texture won't work. Or you could return if texture is mandatory.
  }

  // Setup a_Position
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.vertexAttribPointer(a_Position_loc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position_loc);

  // Setup a_TexCoord if its location is valid
  if (a_TexCoord_loc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(a_TexCoord_loc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_TexCoord_loc);
  } else {
    // If a_TexCoord is not available (e.g., shader doesn't use it),
    // ensure it's disabled if it might have been enabled globally.
    // This case is less likely for the skybox which needs texturing.
    // The global a_TexCoord might still be enabled from initShadersAndLocations.
    // To be absolutely safe, one could disable an attribute if its location is -1.
    // However, the main shaders DO use a_TexCoord.
  }

  gl.uniformMatrix4fv(u_ModelMatrix_loc, false, M.elements);
  gl.uniform4fv(u_Color_loc, color); // Sets the u_Color (often superseded by u_BaseColor / u_texColorWeight)

  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // Optional: If you want to be super clean and this cube might be the last thing
  // using a_TexCoord before something that *doesn't* want it, you could disable it.
  // But typically, the next draw call will manage its own attributes.
  // if (a_TexCoord_loc !== -1) {
  //   gl.disableVertexAttribArray(a_TexCoord_loc);
  // }
}
window.initCubeBuffer = initCubeBuffer; // Assuming these are intended to be global
window.drawCube       = drawCube;
