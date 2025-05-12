// Entry point: sets up WebGL, shaders, UI actions, and animation loop for the boxy turtle

// Vertex shader: applies global rotation then model transform
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord; 

  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_ModelMatrix;

  varying vec2 v_TexCoord;

  void main() {
    gl_Position = u_ProjectionMatrix
                * u_ViewMatrix
                * u_GlobalRotateMatrix
                * u_ModelMatrix
                * a_Position;
    v_TexCoord  = a_TexCoord;
  }
`;

// Fragment shader: simple color
const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_Color;
  uniform sampler2D u_Sampler;
  uniform float u_texColorWeight; 
  uniform vec4  u_BaseColor;
  varying vec2  v_TexCoord; 
  void main() {
    vec4 texColor  = texture2D(u_Sampler, v_TexCoord);
    gl_FragColor   = mix(u_BaseColor, texColor, u_texColorWeight);
  }
`;

let gl;
let a_TexCoord; 
let a_Position;
let u_GlobalRotateMatrix, u_ModelMatrix, u_Color, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_texColorWeight;

let g_camera; // This will hold your Camera object
const CAMERA_SPEED = 0.2;     // Adjust for movement speed
const CAMERA_PAN_ANGLE = 3.0;
const MOUSE_SENSITIVITY_X = 0.1; // Adjust for horizontal rotation speed
const MOUSE_SENSITIVITY_Y = 0.1;

let g_skyTexture = null;
let g_wallTexture = null;
let g_algaeTexture = null;
let g_groundTexture = null;
let g_terrainData = null; 

// Turtle joint and mouse angles (degrees)
let g_neckAngle   = 0;
let g_headAngle   = 0;
let g_tailAngle   = 0;
let g_mouseXAngle = 0;
let g_mouseYAngle = 0;

let g_legAngle       = 0;
let g_kneeAngle      = 0;
let g_footAngle = 0;

let g_animationActive = false;

let g_pokeActive     = false;
let g_pokeStartTime  = 0;
const g_pokeDuration = 2.0; 
let g_pokeFlipAngle = 0;
let g_shellLift     = 0;  

let g_pebbleGameActive = false;
const ALGAE_BLOCK_TYPE = 3;
let g_pebblesToCollect = 0; // This will be the secret number of pebbles the user needs to guess
const PEBBLE_BLOCK_TYPE = 2; // Using 2 to represent a pebble in g_gameBlocks
const MAX_PEBBLES = 50;      // Max pebbles to spawn (Increased)
const MIN_PEBBLES = 30;      // Min pebbles to spawn (Increased)
let guessInputElement;
let submitGuessButtonElement;
let gameMessageElement;
let timeLeftDisplayElement;

// Timer Variables
const GAME_DURATION_SECONDS = 45; // ADDED: Game duration
let g_timeLeft = GAME_DURATION_SECONDS; // ADDED: Time left
let g_gameTimerInterval = null; // ADDED: Interval ID for the timer

const GAME_GRID_WIDTH  = 32;
const GAME_GRID_HEIGHT = 5;
const GAME_GRID_DEPTH  = 32;

// exactly the same offsets you use in Render.js:
const gameAreaWorldOffsetX = -GAME_GRID_WIDTH  / 2 + 0.5;
const gameAreaWorldOffsetY = -1.0;
const gameAreaWorldOffsetZ = -GAME_GRID_DEPTH  / 2 + 0.5;


// Minecraft feature constants
const INTERACTION_REACH = 3;

function setupWebGL() {
  const canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if (!gl) throw 'WebGL not supported';

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.53, 0.81, 0.92, 1.0);
}


function initShadersAndLocations() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    throw 'Shader initialization failed';
  }
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_BaseColor      = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  if (u_ViewMatrix < 0 || u_ProjectionMatrix < 0) {
    throw 'Failed to get view/proj uniform location';
  }
  u_Color              = gl.getUniformLocation(gl.program, 'u_Color');
  

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.error('Failed to get the storage location of a_Position');
    return false; // Return false on failure
  }
  gl.enableVertexAttribArray(a_Position); // Enable it once here
  
  a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord < 0) throw 'Failed to get the storage location of a_TexCoord';
  gl.enableVertexAttribArray(a_TexCoord);
}

function addUIActions() {
  // Guessing Game UI
  guessInputElement = document.getElementById('guessInput');
  submitGuessButtonElement = document.getElementById('submitGuessBtn');
  gameMessageElement = document.getElementById('gameMessage');
  timeLeftDisplayElement = document.getElementById('timeLeftDisplay'); 

  document.getElementById('startGameBtn').onclick = startPebbleGuessingGame;
  submitGuessButtonElement.onclick = handleUserGuess;
  guessInputElement.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      handleUserGuess();
    }
  });
  const canvas = document.getElementById('webgl'); // Get canvas
  let dragging = false;
  let lastX = 0;
  let lastY = 0;


  const rect = canvas.getBoundingClientRect();

  canvas.addEventListener('mousedown', ev => {
    if (ev.shiftKey) { // Your poke action
      g_pokeActive    = true;
      g_pokeStartTime = performance.now() * 0.001;
    } else if (ev.button === 0){ // Regular click starts dragging for camera view
      dragging = true;
      lastX    = ev.clientX - rect.left;
      lastY    = ev.clientY - rect.top;
    }
  });

  canvas.addEventListener('mouseup', (ev) => { // Added ev parameter
    if (ev.button === 0) { // Only stop dragging if left button was released
        dragging = false;
    }
  });

  canvas.addEventListener('mousemove', ev => {
    if (!dragging) return; 

    // Convert current viewport coordinates to canvas-relative coordinates
    const mouseX = ev.clientX - rect.left;
    const mouseY = ev.clientY - rect.top;

    const dx = mouseX - lastX;
    const dy = mouseY - lastY;

    lastX = mouseX; // Update lastX/Y with canvas-relative coordinates
    lastY = mouseY;

    if (g_camera) { 
      g_camera.panHorizontal(dx * MOUSE_SENSITIVITY_X);
      g_camera.tiltVertical(dy * MOUSE_SENSITIVITY_Y);
      renderAllShapes(); 
    }
  });
} 

function updateGameUI() {
  // Update timer display (always safe)
  if (timeLeftDisplayElement) {
    timeLeftDisplayElement.textContent = g_timeLeft >= 0 ? g_timeLeft : 0;
  }

  // Manage control enabled/disabled states
  if (!g_pebbleGameActive) {
    guessInputElement.disabled = true;
    submitGuessButtonElement.disabled = true;
    guessInputElement.disabled = false;
    submitGuessButtonElement.disabled = false;
  }
}


function spawnPebbles() {
for (let x = 0; x < GAME_GRID_WIDTH; x++) {
    if (!g_gameBlocks[x] || !g_gameBlocks[x][0]) continue;
    for (let z = 0; z < GAME_GRID_DEPTH; z++) {
        if (g_gameBlocks[x][0][z] === PEBBLE_BLOCK_TYPE) {
            g_gameBlocks[x][0][z] = 0; // Remove old pebble by setting block type to empty
        }
    }
}

g_pebblesToCollect = Math.floor(Math.random() * (MAX_PEBBLES - MIN_PEBBLES + 1)) + MIN_PEBBLES;
let pebblesSpawned = 0;
let attempts = 0; 
const maxAttempts = GAME_GRID_WIDTH * GAME_GRID_DEPTH * 2; // Give more attempts

while (pebblesSpawned < g_pebblesToCollect && attempts < maxAttempts) {
    const randX = Math.floor(Math.random() * GAME_GRID_WIDTH);
    const randZ = Math.floor(Math.random() * GAME_GRID_DEPTH);
    const spawnY = 0; // Assuming pebbles spawn on the ground layer of gameBlocks

    if (g_gameBlocks[randX] && g_gameBlocks[randX][spawnY] &&
        (g_gameBlocks[randX][spawnY][randZ] === 0 || g_gameBlocks[randX][spawnY][randZ] === 1) && // Can spawn on empty or platform
        !(randX === g_turtleGridX && randZ === g_turtleGridZ && spawnY === g_turtleGridY)) { // Don't spawn under turtle
        
        g_gameBlocks[randX][spawnY][randZ] = PEBBLE_BLOCK_TYPE; 
        pebblesSpawned++;
    }
    attempts++;
}

if (pebblesSpawned < g_pebblesToCollect) {
    console.warn(`Could only spawn ${pebblesSpawned} out of the intended ${g_pebblesToCollect} pebbles. Reducing target.`);
    g_pebblesToCollect = pebblesSpawned; // Adjust total if not all could be spawned
}

console.log(`DEBUG: Spawned ${g_pebblesToCollect} pebbles.`); 
}

function startPebbleGuessingGame() {
  console.log("Starting Pebble Guessing Game!");
  g_pebbleGameActive = true;
  gameMessageElement.textContent = "Guess how many pebbles are hidden in the world!";
  gameMessageElement.style.color = "blue"; 
  guessInputElement.value = ""; 
  guessInputElement.focus();

  g_timeLeft = GAME_DURATION_SECONDS; 

  if (g_gameTimerInterval) clearInterval(g_gameTimerInterval); 

  g_gameTimerInterval = setInterval(() => {
      g_timeLeft--;
      updateGameUI(); // Update the displayed time

      if (g_timeLeft <= 0) {
          clearInterval(g_gameTimerInterval);
          g_gameTimerInterval = null;
          if (g_pebbleGameActive) { // Check if game hasn't already ended
              gameMessageElement.textContent = "Time's up! Turtle is still hungry.";
              gameMessageElement.style.color = "red";
              endPebbleGuessingGame(false); // Player loses
          }
      }
  }, 1000);

  spawnPebbles(); 
  updateGameUI(); 
  renderAllShapes(); 
}

function endPebbleGuessingGame(won) {
  if (g_gameTimerInterval) clearInterval(g_gameTimerInterval); 
  g_gameTimerInterval = null;                                 

  g_pebbleGameActive = false; // Game is no longer active
  if (won) {
      gameMessageElement.textContent = `Correct! You found all ${g_pebblesToCollect} pebbles! You WON! Play again?`; // Enhanced win message
      gameMessageElement.style.color = "green";
  } else {
      // Handle loss (e.g., time up)
      if (g_timeLeft <= 0) { 
          gameMessageElement.textContent = `Time's up! The correct number was ${g_pebblesToCollect}. Try again?`;
      } else {
          // Fallback for other potential 'loss' scenarios if they were ever added
          // This case should ideally not be reached if loss is only by time up or specific event.
          gameMessageElement.textContent = `The correct number was ${g_pebblesToCollect}. Try again?`;
      }
      gameMessageElement.style.color = "red";
  }
  // Call updateGameUI to disable controls AFTER setting the message
  updateGameUI(); 
}

function handleUserGuess() {
  if (!g_pebbleGameActive) return;

  const guessText = guessInputElement.value;
  if (guessText.trim() === "") {
      gameMessageElement.textContent = "Please enter a number.";
      gameMessageElement.style.color = "orange";
      return;
  }

  const userGuess = parseInt(guessText);

  if (isNaN(userGuess)) {
      gameMessageElement.textContent = "That's not a valid number. Try again.";
      gameMessageElement.style.color = "orange";
      guessInputElement.value = "";
      return;
  }

  if (userGuess === g_pebblesToCollect) {
    endPebbleGuessingGame(true); // Call with 'true' indicating a win
    return; 
  }  

  const difference = Math.abs(userGuess - g_pebblesToCollect);
  let feedbackMessage = "";

  if (difference <= 2) {
      feedbackMessage = "Extremely Hot! 🔥🔥";
  } else if (difference <= 5) {
      feedbackMessage = "Hot! 🔥";
  } else if (difference <= 10) {
      feedbackMessage = "Warm. 😊";
  } else if (difference <= 15) {
      feedbackMessage = "Cold. 🥶";
  } else {
      feedbackMessage = "Freezing! 🧊";
  }
  
  feedbackMessage += (userGuess < g_pebblesToCollect) ? " (Too low)" : " (Too high)";
  gameMessageElement.textContent = feedbackMessage;
  gameMessageElement.style.color = "purple";
  guessInputElement.value = ""; 
  guessInputElement.focus();
}

function updateAnimationAngles() {
  if (g_pokeActive) {
    const now     = performance.now() * 0.001;
    const elapsed = now - g_pokeStartTime;
    const t       = Math.min(elapsed / g_pokeDuration, 1.0);

    g_pokeFlipAngle = 720 * t;
    g_shellLift     = Math.sin(Math.PI * t) * 0.8;

    if (t >= 1.0) {
      g_pokeActive   = false;
      g_pokeFlipAngle = 0;
      g_shellLift    = 0;
    }
  }
  if (!g_animationActive && !(typeof window.animating !== 'undefined' && window.animating)) return; // Check both local and potential global

  const now = performance.now() * 0.001; // Time in seconds
  window.g_tailAngle = 20 * Math.sin(now * 5);
  g_legAngle  = 30 * Math.sin(now * 3); // Assuming g_legAngle, etc. are still component-specific
  g_kneeAngle = 20 * Math.sin(now * 4 + Math.PI/2);
  window.g_neckAngle = 10 * Math.sin(now * 2 * Math.PI); 
  // g_headAngle is also in SharedState, ensure consistency or choose one source
}

// Helper for texture loading
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadSpecificTexture(gl, src) {
  const texture = gl.createTexture();
  if (!texture) {
    console.error('Failed to create texture object for image:', src);
    return null;
  }

  const image = new Image();
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 
    gl.activeTexture(gl.TEXTURE0); // Or cycle through texture units if using more than one simultaneously
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // Default min filter

    if (!isPowerOf2(image.width) || !isPowerOf2(image.height)) {
      console.warn("Warning: Texture " + src + " is not a power of 2. Using CLAMP_TO_EDGE wrapping.");
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); 
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); 
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    console.log("Texture loaded successfully:", src);
    if (typeof renderAllShapes === "function") {
        renderAllShapes(); 
    }
  };
  image.onerror = function() {
    console.error('Failed to load image:', src);
    // Potentially unbind texture or handle error state
    gl.bindTexture(gl.TEXTURE_2D, null);
  };
  image.src = src; 

  return texture;
}

function initAllTextures(gl) {
  g_skyTexture = loadSpecificTexture(gl, 'sky.png');
  g_wallTexture = loadSpecificTexture(gl, 'wall.png');    
  g_groundTexture = loadSpecificTexture(gl, 'ground.png'); 
  g_algaeTexture =  loadSpecificTexture(gl, 'algae.png');

  if (!g_skyTexture || !g_wallTexture || !g_groundTexture || !g_algaeTexture) {
    console.error("One or more textures failed to initiate loading. Check console for details.");
    return false; 
  }

  const u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (u_Sampler < 0) {
    console.error('Failed to get the storage location of u_Sampler in initAllTextures');
    return false; 
  }
  gl.uniform1i(u_Sampler, 0); // Tell the shader's u_Sampler to always use texture unit 0

  return true; 
}

/**
 * Initializes WebGL buffers for the terrain mesh.
 * @param {WebGLRenderingContext} gl The WebGL rendering context.
 * @param {object} terrainData An object containing vertices, uvs, and indices for the terrain.
 * This function will add buffer objects and numIndices to this object.
 * @returns {boolean} True if buffers were created successfully, false otherwise.
 */
function initTerrainBuffers(gl, terrainData) {
  if (!terrainData || !terrainData.vertices || !terrainData.uvs || !terrainData.indices) {
      console.error('Invalid terrainData provided to initTerrainBuffers');
      return false;
  }

  // 1. Create and buffer vertex positions
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.error('Failed to create the buffer object for terrain vertices');
      return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrainData.vertices, gl.STATIC_DRAW);
  terrainData.vertexBuffer = vertexBuffer; // Store for later use in rendering

  // 2. Create and buffer texture coordinates (UVs)
  const uvBuffer = gl.createBuffer();
  if (!uvBuffer) {
      console.error('Failed to create the buffer object for terrain UVs');
      gl.deleteBuffer(vertexBuffer); // Clean up previously created buffer
      return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrainData.uvs, gl.STATIC_DRAW);
  terrainData.uvBuffer = uvBuffer; // Store for later use

  // 3. Create and buffer indices
  const indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
      console.error('Failed to create the buffer object for terrain indices');
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(uvBuffer);
      return false;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrainData.indices, gl.STATIC_DRAW);
  terrainData.indexBuffer = indexBuffer; // Store for later use

  // Store the number of indices for the draw call
  terrainData.numIndices = terrainData.indices.length;

  // Unbind buffers (good practice, though not strictly necessary here)
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  console.log('Terrain buffers initialized successfully.');
  return true;
}

// --- Block Interaction (Minecraft-like) ---
function getTargetBlockInfo() {
  if (!g_camera) return null;

  // Camera's current position in world coordinates
  const camX = g_camera.eye.elements[0];
  const camY = g_camera.eye.elements[1]; // We might use this for targeting blocks at different heights later
  const camZ = g_camera.eye.elements[2];

  // Forward vector
  let f = new Vector3();
  f.set(g_camera.at);
  f.sub(g_camera.eye);
  f.normalize();

  let targetGridX, targetGridZ;
  let bestReach = INTERACTION_REACH + 1; // Start with a value greater than max reach

  for (let reach = 1; reach <= INTERACTION_REACH; reach++) {
      const potentialTargetX_world = camX + f.elements[0] * reach;
      const potentialTargetZ_world = camZ + f.elements[2] * reach;
      
      // Convert potential world target to grid coordinates
      const gridX = Math.round(potentialTargetX_world - gameAreaWorldOffsetX);
      const gridZ = Math.round(potentialTargetZ_world - gameAreaWorldOffsetZ);

      if (gridX >= 0 && gridX < GAME_GRID_WIDTH && gridZ >= 0 && gridZ < GAME_GRID_DEPTH) {
           // Check if this is the closest valid grid cell found so far
          const distToCellCenterWorldX = gridX + gameAreaWorldOffsetX;
          const distToCellCenterWorldZ = gridZ + gameAreaWorldOffsetZ;
          const actualDist = Math.sqrt(
              Math.pow(potentialTargetX_world - distToCellCenterWorldX, 2) +
              Math.pow(potentialTargetZ_world - distToCellCenterWorldZ, 2)
          );
      }
  }
  
  let dx = 0, dz = 0;
  if (Math.abs(f.elements[0]) > Math.abs(f.elements[2])) { // Moving more along X
      dx = Math.sign(f.elements[0]);
  } else { // Moving more along Z
      dz = Math.sign(f.elements[2]);
  }

  const playerGridX = Math.round(camX - gameAreaWorldOffsetX);
  const playerGridZ = Math.round(camZ - gameAreaWorldOffsetZ);

  targetGridX = playerGridX + dx; // One step in the dominant direction
  targetGridZ = playerGridZ + dz;

  // Ensure target is within bounds
  if (targetGridX < 0 || targetGridX >= GAME_GRID_WIDTH || targetGridZ < 0 || targetGridZ >= GAME_GRID_DEPTH) {
      return null; // Target is outside map
  }
  let targetGridY = Math.round(camY - gameAreaWorldOffsetY); // Approximate Y grid level of camera
  
  // Clamp targetGridY to be within game grid height
  targetGridY = Math.max(0, Math.min(targetGridY, GAME_GRID_HEIGHT -1));


  return { x: targetGridX, y: targetGridY, z: targetGridZ };
}


function addBlockInFront() {
  const target = getTargetBlockInfo();
  if (!target) {
      console.log("Cannot add block: Target out of range or invalid.");
      return;
  }

  // Find the highest solid block in the target column (x, z) to place the new block on top
  let placeY = -1;
  for (let y = GAME_GRID_HEIGHT - 1; y >= 0; y--) {
      if (g_gameBlocks[target.x] && g_gameBlocks[target.x][y] && g_gameBlocks[target.x][y][target.z] !== 0) {
          placeY = y + 1; // Place on top of this block
          break;
      }
  }
  if (placeY === -1) { // No blocks in this column, place on ground
      placeY = 0;
  }

  // Check if placing the block would exceed the world height
  if (placeY >= GAME_GRID_HEIGHT) {
      console.log("Cannot add block: Column is full.");
      return;
  }

  // Ensure the g_gameBlocks structure is initialized for this cell
  if (!g_gameBlocks[target.x]) g_gameBlocks[target.x] = [];
  if (!g_gameBlocks[target.x][placeY]) g_gameBlocks[target.x][placeY] = [];
  
  if (g_gameBlocks[target.x][placeY][target.z] === 0) { // If the spot is empty
      g_gameBlocks[target.x][placeY][target.z] = ALGAE_BLOCK_TYPE;
      console.log(`Added Algae block at (${target.x}, ${placeY}, ${target.z})`);
      renderAllShapes();
  } else {
      console.log("Cannot add block: Space is already occupied at target Y.");
  }
}

function deleteBlockInFront() {
  const target = getTargetBlockInfo();
  if (!target) {
      console.log("Cannot delete block: Target out of range or invalid.");
      return;
  }

  // Find the topmost block in the target column (x,z) to delete
  let deleteY = -1;
  for (let y = GAME_GRID_HEIGHT - 1; y >= 0; y--) {
      if (g_gameBlocks[target.x] && g_gameBlocks[target.x][y] && g_gameBlocks[target.x][y][target.z] !== 0) {
          deleteY = y;
          break;
      }
  }

  if (deleteY !== -1) { // If a block was found
      console.log(`Deleted block of type ${g_gameBlocks[target.x][deleteY][target.z]} at (${target.x}, ${deleteY}, ${target.z})`);
      g_gameBlocks[target.x][deleteY][target.z] = 0; // Set to empty
      renderAllShapes();
  } else {
      console.log("Cannot delete block: No block found in target column.");
  }
}

function initKeydownListeners() {
  document.addEventListener('keydown', function(event) {

    if (document.activeElement === guessInputElement && event.key !== 'Enter') {
      return; // Don't move camera if typing in guess input (unless it's Enter)
    }
    let viewChanged = false; 
    let actionTaken = false;// Flag to check if we need to re-render

    switch (event.key.toUpperCase()) { 
      case 'W':
        g_camera.moveForward(CAMERA_SPEED);
        viewChanged = true;
        break;
      case 'S':
        g_camera.moveBackwards(CAMERA_SPEED);
        viewChanged = true;
        break;
      case 'A':
        g_camera.moveLeft(CAMERA_SPEED);
        viewChanged = true;
        break;
      case 'D':
        g_camera.moveRight(CAMERA_SPEED);
        viewChanged = true;
        break;
      case 'Q':
        g_camera.panLeft(CAMERA_PAN_ANGLE);
        viewChanged = true;
        break;
      case 'E':
        g_camera.panRight(CAMERA_PAN_ANGLE);
        viewChanged = true;
        break;
      case 'F': 
        addBlockInFront();
        actionTaken = true; 
        break;
      case 'G': 
        deleteBlockInFront();
        actionTaken = true;
        break;
    }
    if (viewChanged || actionTaken) { // Re-render if camera moved OR block action taken
      renderAllShapes(); 
    }
  });
}

let g_gameBlocks = [];        // 3D array to store block states (0 = empty, 1 = block)

// Turtle's logical position on the game grid
let g_turtleGridX = 1;
let g_turtleGridY = 0; // Assuming Y=0 is the first walkable layer of gameBlocks
let g_turtleGridZ = 1;
let g_turtleFacing = 0; // 0: +Z, 1: +X, 2: -Z, 3: -X (for later interaction)

function initGameBlocks() {
    for (let x = 0; x < GAME_GRID_WIDTH; x++) {
        g_gameBlocks[x] = [];
        for (let y = 0; y < GAME_GRID_HEIGHT; y++) {
            g_gameBlocks[x][y] = [];
            for (let z = 0; z < GAME_GRID_DEPTH; z++) {
                g_gameBlocks[x][y][z] = 0; // Initialize all as empty
            }
        }
    }

    const platformSizeX = 4;
    const platformSizeZ = 4;
    const platformStartX = Math.floor(GAME_GRID_WIDTH / 2) - Math.floor(platformSizeX / 2); // e.g., 16 - 2 = 14
    const platformStartZ = Math.floor(GAME_GRID_DEPTH / 2) - Math.floor(platformSizeZ / 2); // e.g., 16 - 2 = 14

    for (let x = 0; x < platformSizeX; x++) {
        for (let z = 0; z < platformSizeZ; z++) {
            const currentX = platformStartX + x;
            const currentZ = platformStartZ + z;
            // Ensure we are within the main grid boundaries, though with these calculations, we should be.
            if (g_gameBlocks[currentX] && g_gameBlocks[currentX][0]) {
               g_gameBlocks[currentX][0][currentZ] = 1; // Place a block at y=0 of the game grid
            }
        }
    }

    const blockOnPlatformX = platformStartX + 1;
    const blockOnPlatformZ = platformStartZ + 1;

    if (g_gameBlocks[blockOnPlatformX] && g_gameBlocks[blockOnPlatformX][1]) {
        g_gameBlocks[blockOnPlatformX][1][blockOnPlatformZ] = 1; // A block on top of the platform
    }
    if (g_gameBlocks[blockOnPlatformX + 1] && g_gameBlocks[blockOnPlatformX + 1][1]) {
        g_gameBlocks[blockOnPlatformX + 1][1][blockOnPlatformZ] = 1; // Another one
    }

    g_turtleGridX = platformStartX + Math.floor(platformSizeX / 2); // Center of the platform
    g_turtleGridY = 0; // Turtle's base is on layer 0 of gameBlocks
    g_turtleGridZ = platformStartZ + Math.floor(platformSizeZ / 2); // Center of the platform
}



function main() {
  setupWebGL();
  initShadersAndLocations();

  const canvas = document.getElementById('webgl'); 
  g_camera = new Camera(canvas);
  
  if (!initAllTextures(gl)) {
    throw 'Failed to initialize textures';
  }
  
  g_terrainData = generateTerrain(32, 32, 20, 20, simpleHeightFunction);

  if (!initTerrainBuffers(gl, g_terrainData)) {
    console.error("Failed to initialize terrain buffers. Ground will not be rendered.");
}
  
  initCubeBuffer();            
  addUIActions();
  initKeydownListeners(); 
  initSphereBuffer();
  initHemisphereBuffer();
  initGameBlocks();

 let lastFrameTime = 0;
  function tick(now) {
    if (lastFrameTime > 0) {
      const duration = now - lastFrameTime;      
      const fps      = 1000 / duration;          
      updatePerformanceInfo(duration, fps);
    }
    lastFrameTime = now;

    updateAnimationAngles();
    renderAllShapes();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
window.onload = main;