// Render.js
// Renders our blocky turtle model with all its parts

// Define colors for the different parts of the turtle
const Colors = {
    shell: [0.2, 0.6, 0.2, 1.0],
    underside: [0.1, 0.4, 0.1, 1.0],
    neck: [0.2, 0.6, 0.2, 1.0],
    head: [0.25, 0.7, 0.25, 1.0],
    tail: [0.2, 0.6, 0.2, 1.0],
    leg: [0.15, 0.5, 0.15, 1.0],
    foot: [0.05, 0.05, 0.05, 1.0]
};

var lastPerfUpdateTime = 0;
let lastFrameTime = 0;

const map = [];
for (let x = 0; x < 32; x++) {
  map[x] = [];
  for (let z = 0; z < 32; z++) {
    map[x][z] = ( (x+z) % 5 );    // example pattern: heights 0→4 in a checker
  }
}

function sendTextToHTML(text, htmlID) {
    const elm = document.getElementById(htmlID);
    if (!elm) return;
    elm.textContent = text;
}

function updatePerformanceInfo(duration, fps) {
    const now = performance.now();
    if (now - lastPerfUpdateTime > 250) {  
      sendTextToHTML(
        `MS: ${Math.floor(duration)} │ FPS: ${Math.floor(fps)}`,
        "numdot"
      );
      lastPerfUpdateTime = now;
    }
}
function getClickRay(mouseX, mouseY, canvas, camera) {
    if (!camera || !camera.projectionMatrix || !camera.viewMatrix) return null;
    const x =  (2 * mouseX / canvas.width ) - 1;
    const y = -(2 * mouseY / canvas.height) + 1;
    
    // Create new Matrix4 instances before operations if they might be shared/modified elsewhere
    const projMat = new Matrix4(camera.projectionMatrix);
    const viewMat = new Matrix4(camera.viewMatrix);
    const invPV = projMat.multiply(viewMat).invert();

    const nearCP = new Vector4([x, y, -1, 1]); // Pass array to Vector4 constructor
    const farCP  = new Vector4([x, y,  1, 1]); // Pass array to Vector4 constructor
    
    const nearWP = invPV.multiplyVector4(nearCP);
    const farWP  = invPV.multiplyVector4(farCP);

    if (nearWP.elements[3] === 0 || farWP.elements[3] === 0) return null; // Avoid division by zero

    nearWP.div(nearWP.elements[3]); // Use .elements array for w component
    farWP.div(farWP.elements[3]);

    const origin    = new Vector3([nearWP.elements[0], nearWP.elements[1], nearWP.elements[2]]);
    const direction = new Vector3([
      farWP.elements[0] - nearWP.elements[0],
      farWP.elements[1] - nearWP.elements[1],
      farWP.elements[2] - nearWP.elements[2]
    ]).normalize();
    return { origin, direction };
}

function getCenterRay(camera) {
    if (!camera || !camera.eye || !camera.at) return null;
    const origin = new Vector3(camera.eye.elements); 
    // Create a new Vector3 for 'at' before subtracting if 'at' could be modified elsewhere
    const atVec = new Vector3(camera.at.elements); 
    const direction = atVec.sub(origin).normalize(); 
    return { origin, direction };
}
  
function intersectRaySphere(R0, Rd, C, r) {
    if(!R0 || !Rd || !C) return false;
    // Create new Vector3 for C before operations
    const L   = new Vector3(C.elements).sub(R0); 
    const tca = L.dot(Rd);
    const d2  = L.dot(L) - tca * tca;
    return d2 <= r * r;
}
  
window.g_legAngle  = 0;   
window.g_kneeAngle = 0;  

const PebbleColors = {
    pebble: [0.5, 0.5, 0.5, 1.0] // Grey color for pebbles
};

const AlgaeColors = { // Fallback color for Algae if texture fails
    algae: [0.2, 0.5, 0.1, 1.0]
};

function renderAllShapes() {
    const startTime = performance.now();

    // Set camera matrices
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  
    // Global scene rotation (e.g., for mouse drag effect or poke)
    const globalRotMat = new Matrix4()
      .setScale(0.7, 0.7, 0.7) // Your existing global scale
      .rotate(g_mouseXAngle, 0, 1, 0)
      .rotate(g_mouseYAngle, 1, 0, 0);
    if (g_pokeActive) {
        globalRotMat.rotate(g_pokeFlipAngle, 0, 1, 0);
    }
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
    
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    if (g_skyTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, g_skyTexture);
        
        gl.uniform1f(u_texColorWeight, 1.0);
    
        const groundHorizontalExtent = 32; // Your ground is 32x32 units wide/deep
        const sceneMinY = -8;  // Estimated lowest Y point of your visible scene elements
        const sceneMaxY = 20; // Estimated highest Y point + some sky headroom
    
        const skyboxEffectiveWidth = groundHorizontalExtent;
        const skyboxEffectiveDepth = groundHorizontalExtent; // Assuming square ground for skybox
        const skyboxEffectiveHeight = sceneMaxY - sceneMinY;
        const skyboxCenterY = (sceneMaxY + sceneMinY) / 2;
    
        let skyboxMatrix = new Matrix4();
        skyboxMatrix.translate(0, skyboxCenterY, 0);
        skyboxMatrix.scale(skyboxEffectiveWidth, skyboxEffectiveHeight, skyboxEffectiveDepth);
    
        drawCube(skyboxMatrix, [0,0,0,0]); // Color argument is likely ignored by textured cube
    
    } else {
        // Fallback: Solid blue if sky texture isn't loaded
        gl.uniform1f(u_texColorWeight, 0.0); // Use base color
        gl.uniform4fv(u_BaseColor, [0.53, 0.81, 0.92, 1.0]); // Set base color to blue
    
        // Optionally, size the fallback skybox similarly or keep it huge
        let fallbackSkyboxMatrix = new Matrix4();
        // To make it huge like before:
        fallbackSkyboxMatrix.scale(1000, 1000, 1000);
        drawCube(fallbackSkyboxMatrix, [0.53, 0.81, 0.92, 1.0]); // Pass blue color
    }
  
    if (g_terrainData && g_terrainData.vertexBuffer && g_terrainData.uvBuffer && g_terrainData.indexBuffer && g_terrainData.numIndices > 0) {
        // Set the model matrix for the terrain (identity, as vertices are already in world space)
        const terrainModelMatrix = new Matrix4(); // Creates an identity matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, terrainModelMatrix.elements);

        // Bind vertex buffer and set up a_Position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, g_terrainData.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0); // 3 components per vertex
        gl.enableVertexAttribArray(a_Position);

        // Bind UV buffer and set up a_TexCoord attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, g_terrainData.uvBuffer);
        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0); // 2 components per UV
        gl.enableVertexAttribArray(a_TexCoord);

        // Set texture for the terrain (g_groundTexture)
        if (g_groundTexture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, g_groundTexture);
            gl.uniform1f(u_texColorWeight, 1.0); // Use 100% texture color
        } else {
            // Fallback: Solid dark brown if ground texture isn't loaded
            gl.uniform4fv(u_BaseColor, [0.4, 0.3, 0.2, 1.0]);
            gl.uniform1f(u_texColorWeight, 0.0);
        }

        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_terrainData.indexBuffer);

        // Draw the terrain
        gl.drawElements(gl.TRIANGLES, g_terrainData.numIndices, gl.UNSIGNED_SHORT, 0);
    } else {
        const groundMat = new Matrix4().setTranslate(0, -0.5, 0).scale(32, 0.1, 32);
        if (g_groundTexture) { // Still attempt to texture flat ground
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, g_groundTexture);
            gl.uniform1f(u_texColorWeight, 1.0);
            drawCube(groundMat, [0,0,0,0]);
        } else {
            gl.uniform4fv(u_BaseColor, [0.4, 0.3, 0.2, 1.0]);
            gl.uniform1f(u_texColorWeight, 0.0);
            drawCube(groundMat, [0,0,0,0]);
        }
    }
  
    const gameAreaWorldOffsetX = -GAME_GRID_WIDTH / 2 + 0.5; // Center game area grid
    const gameAreaWorldOffsetY = -1.0; // Base Y level for the gameBlocks grid (y=0 of gameBlocks)
    const gameAreaWorldOffsetZ = -GAME_GRID_DEPTH / 2 + 0.5;

    if (typeof g_gameBlocks !== 'undefined' && g_gameBlocks.length > 0) {
        for (let x = 0; x < GAME_GRID_WIDTH; x++) {
            if (!g_gameBlocks[x]) continue;
            for (let y = 0; y < GAME_GRID_HEIGHT; y++) {
                if (!g_gameBlocks[x][y]) continue;
                for (let z = 0; z < GAME_GRID_DEPTH; z++) {
                    const blockType = g_gameBlocks[x][y][z];
                    if (blockType === 0) continue; // Skip empty blocks

                    const blockWorldX = x + gameAreaWorldOffsetX;
                    const blockWorldY = y + gameAreaWorldOffsetY; // This is the center of the 1x1x1 cube
                    const blockWorldZ = z + gameAreaWorldOffsetZ;

                    let blockMat = new Matrix4().setTranslate(blockWorldX, blockWorldY, blockWorldZ);
                    let blockColor;

                    if (blockType === PEBBLE_BLOCK_TYPE) { 
                        gl.uniform1f(u_texColorWeight, 0.0); 
                        blockColorToDraw = PebbleColors.pebble;
                        gl.uniform4fv(u_BaseColor, blockColorToDraw);
                        blockMat.scale(0.3, 0.3, 0.3); 
                        blockMat.translate(0, -0.35, 0); // Adjust pebble position slightly
                    } else if (blockType === 1) { // Regular platform/wall block
                        if (g_wallTexture) {
                            gl.activeTexture(gl.TEXTURE0); 
                            gl.bindTexture(gl.TEXTURE_2D, g_wallTexture);
                            gl.uniform1i(gl.getUniformLocation(gl.program, 'u_Sampler'), 0);
                            gl.uniform1f(u_texColorWeight, 1.0); 
                            blockColorToDraw = [0,0,0,0]; // Texture will override
                        } else {
                            gl.uniform1f(u_texColorWeight, 0.0); 
                            blockColorToDraw = [0.6, 0.4, 0.2, 1.0]; 
                            gl.uniform4fv(u_BaseColor, blockColorToDraw);
                        }
                    } else if (blockType === ALGAE_BLOCK_TYPE) { 
                        if (g_algaeTexture) {
                            gl.activeTexture(gl.TEXTURE0);
                            gl.bindTexture(gl.TEXTURE_2D, g_algaeTexture);
                            gl.uniform1i(gl.getUniformLocation(gl.program, 'u_Sampler'), 0);
                            gl.uniform1f(u_texColorWeight, 1.0); // Use 100% texture
                            blockColorToDraw = [0,0,0,0]; // Texture will override
                        } else {
                            gl.uniform1f(u_texColorWeight, 0.0); // Fallback to solid color
                            blockColorToDraw = AlgaeColors.algae; 
                            gl.uniform4fv(u_BaseColor, blockColorToDraw);
                        }
                    }
                    drawCube(blockMat, blockColorToDraw); // Pass the determined color
                }
            }
        }
    }

    gl.uniform1f(u_texColorWeight, 0.0);
    
    const turtleWorldX = g_turtleGridX + gameAreaWorldOffsetX;
    const turtleVisualY = g_turtleGridY + gameAreaWorldOffsetY;
    const turtleWorldZ = g_turtleGridZ + gameAreaWorldOffsetZ;

    const turtleYOffsetOnBlock = 2.5;

    const turtleBodyOverallTransform = new Matrix4().setTranslate(
        turtleWorldX,
        turtleVisualY + turtleYOffsetOnBlock, // Adjust so turtle appears to sit ON the block surface
        turtleWorldZ
    )
    // .scale(temporaryLargeScaleFactor, temporaryLargeScaleFactor, temporaryLargeScaleFactor); // Keep your scale
    .scale(2.0, 2.0, 2.0);

    let terrainYAtTurtle = 0;
    if (typeof simpleHeightFunction === 'function') {
        terrainYAtTurtle = simpleHeightFunction(turtleWorldX, turtleWorldZ);
    } else {
        console.warn("simpleHeightFunction is not accessible. Turtle Y position set to 0.");
    }

    // Shell
    gl.uniform4fv(u_BaseColor, Colors.shell);
    const shellMat = new Matrix4(turtleBodyOverallTransform);
    shellMat.translate(0, -0.1 + g_shellLift, 0); 
    shellMat.scale(1.3, 0.4, 0.9); 
    drawHemisphere(shellMat, Colors.shell);
    
    // Underside - body
    gl.uniform4fv(u_BaseColor, Colors.underside);
    const undersideMat = new Matrix4(shellMat); // Relative to shellMat (which includes overall transform)
    undersideMat.translate(0, -0.5, 0); 
    undersideMat.scale(1.0, 0.6, 1.0); 
    drawCube(undersideMat, Colors.underside);
    
    // Neck
    gl.uniform4fv(u_BaseColor, Colors.neck);
    const neckMat = new Matrix4(turtleBodyOverallTransform);
    neckMat.translate(0, 0, 0.7); 
    neckMat.rotate(g_neckAngle, 1, 0, 0);
    neckMat.scale(0.2, 0.24, 0.5);
    drawCube(neckMat, Colors.neck);

    // Head
    gl.uniform4fv(u_BaseColor, Colors.head);
    const headMat = new Matrix4(neckMat); // Relative to neckMat
    headMat.translate(0, 0, 0.5);
    headMat.rotate(g_headAngle, 1, 0, 0);
    headMat.scale(0.7, 0.7, 0.7); 
    drawSphere(headMat, Colors.head);
    // Tail
    gl.uniform4fv(u_BaseColor, Colors.tail);
    const tailMat = new Matrix4(turtleBodyOverallTransform);
    tailMat.translate(0, 0, -0.7); 
    tailMat.rotate(g_tailAngle, 1, 0, 0);
    tailMat.scale(0.2, 0.2, 1.2);
    drawCube(tailMat, Colors.tail);

    // Front Left Leg
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const frontLeftUpperLegMat = new Matrix4(turtleBodyOverallTransform);
    frontLeftUpperLegMat.translate(0.8, -0.3, 0.5);
    frontLeftUpperLegMat.rotate(g_legAngle, 0, 0, 1);
    frontLeftUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(frontLeftUpperLegMat, Colors.leg);
    
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const frontLeftLowerLegMat = new Matrix4(frontLeftUpperLegMat);
    frontLeftLowerLegMat.translate(0, -0.5, 0);
    frontLeftLowerLegMat.rotate(g_kneeAngle, 0, 0, 1);
    frontLeftLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(frontLeftLowerLegMat, Colors.leg);

    gl.uniform4fv(u_BaseColor, Colors.foot);
    const frontLeftFootMat = new Matrix4(frontLeftLowerLegMat);
    frontLeftFootMat.translate(0, -0.5, 0);
    frontLeftFootMat.rotate(g_footAngle, 1, 0, 0);
    frontLeftFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(frontLeftFootMat, Colors.foot);
    
    // Front Right Leg
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const frontRightUpperLegMat = new Matrix4(turtleBodyOverallTransform);
    frontRightUpperLegMat.translate(-0.8, -0.3, 0.5);
    frontRightUpperLegMat.rotate(g_legAngle, 0, 0, 1); // Consider if right legs should mirror rotation
    frontRightUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(frontRightUpperLegMat, Colors.leg);
    
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const frontRightLowerLegMat = new Matrix4(frontRightUpperLegMat);
    frontRightLowerLegMat.translate(0, -0.5, 0);
    frontRightLowerLegMat.rotate(g_kneeAngle, 0, 0, 1); // Consider mirrored rotation
    frontRightLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(frontRightLowerLegMat, Colors.leg);
    
    gl.uniform4fv(u_BaseColor, Colors.foot);
    const frontRightFootMat = new Matrix4(frontRightLowerLegMat);
    frontRightFootMat.translate(0, -0.5, 0);
    frontRightFootMat.rotate(g_footAngle, 1, 0, 0);
    frontRightFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(frontRightFootMat, Colors.foot);
    
    // Back Left Leg
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const backLeftUpperLegMat = new Matrix4(turtleBodyOverallTransform);
    backLeftUpperLegMat.translate(0.8, -0.3, -0.5);
    backLeftUpperLegMat.rotate(g_legAngle, 0, 0, 1); // Consider mirrored rotation for back legs
    backLeftUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(backLeftUpperLegMat, Colors.leg);
    
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const backLeftLowerLegMat = new Matrix4(backLeftUpperLegMat);
    backLeftLowerLegMat.translate(0, -0.5, 0);
    backLeftLowerLegMat.rotate(g_kneeAngle, 0, 0, 1); // Consider mirrored rotation
    backLeftLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(backLeftLowerLegMat, Colors.leg);

    gl.uniform4fv(u_BaseColor, Colors.foot);
    const backLeftFootMat = new Matrix4(backLeftLowerLegMat);
    backLeftFootMat.translate(0, -0.5, 0);
    backLeftFootMat.rotate(g_footAngle, 1, 0, 0);
    backLeftFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(backLeftFootMat, Colors.foot);
    
    // Back Right Leg
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const backRightUpperLegMat = new Matrix4(turtleBodyOverallTransform);
    backRightUpperLegMat.translate(-0.8, -0.3, -0.5);
    backRightUpperLegMat.rotate(g_legAngle, 0, 0, 1); // Consider mirrored rotation
    backRightUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(backRightUpperLegMat, Colors.leg);
    
    gl.uniform4fv(u_BaseColor, Colors.leg);
    const backRightLowerLegMat = new Matrix4(backRightUpperLegMat);
    backRightLowerLegMat.translate(0, -0.5, 0);
    backRightLowerLegMat.rotate(g_kneeAngle, 0, 0, 1); // Consider mirrored rotation
    backRightLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(backRightLowerLegMat, Colors.leg);
    
    gl.uniform4fv(u_BaseColor, Colors.foot);
    const backRightFootMat = new Matrix4(backRightLowerLegMat);
    backRightFootMat.translate(0, -0.5, 0);
    backRightFootMat.rotate(g_footAngle, 1, 0, 0);
    backRightFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(backRightFootMat, Colors.foot);

    const endTime = performance.now();
    const duration = endTime - startTime;    
    // Ensure updatePerformanceInfo is defined globally or passed if used
    if (typeof updatePerformanceInfo === "function") {
        updatePerformanceInfo(duration, 1000 / duration);
    } else if (typeof sendTextToHTML === "function") { // Fallback to simpler perf display
        const fps = 1000 / duration;
        const nowPerf = performance.now();
         if (typeof lastPerfUpdateTime === 'undefined') window.lastPerfUpdateTime = 0; // Ensure defined
        if (nowPerf - window.lastPerfUpdateTime > 250) {  
            sendTextToHTML(
            `MS: ${Math.floor(duration)} | FPS: ${Math.floor(fps)}`,
            "numdot"
            );
            window.lastPerfUpdateTime = nowPerf;
        }
    }
}
  window.renderAllShapes = renderAllShapes;