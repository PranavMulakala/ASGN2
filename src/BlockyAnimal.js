// BlockyAnimal.js
// Entry point: sets up WebGL, shaders, UI actions, and animation loop for the boxy turtle

// Vertex shader: applies global rotation then model transform
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord; 
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ModelMatrix;
  varying   vec2 v_TexCoord;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_TexCoord  = a_TexCoord;
  }
`;

// Fragment shader: simple color
const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_Color;
  varying vec2  v_TexCoord; 
  void main() {
    gl_FragColor = u_Color;
  }
`;

let gl;
let a_TexCoord; 
let u_GlobalRotateMatrix, u_ModelMatrix, u_Color;

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
  u_Color              = gl.getUniformLocation(gl.program, 'u_Color');

  a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord < 0) throw 'Failed to get the storage location of a_TexCoord';
  gl.enableVertexAttribArray(a_TexCoord);
}

function addUIActions() {
  // Neck slider
  document.getElementById('neckSlider').oninput = e => {
    g_neckAngle = +e.target.value;
    renderAllShapes();
  };
  // Tail slider
  document.getElementById('tailSlider').oninput = e => {
    g_tailAngle = +e.target.value;
    renderAllShapes();
  };

  // All legs (upper segment) at once
  document.getElementById('legSlider').oninput = e => {
    g_legAngle = +e.target.value;
    renderAllShapes();
  };

  // All knees (lower segment) at once
  document.getElementById('kneeSlider').oninput = e => {
    g_kneeAngle = +e.target.value;
    renderAllShapes();
  };

  document.getElementById('footSlider').oninput = e => {
    g_footAngle = +e.target.value;
    renderAllShapes();
  };


 // Turn animation ON
  document.getElementById('animOnBtn').onclick = () => {
    g_animationActive = true;
  };

  // Turn animation OFF
  document.getElementById('animOffBtn').onclick = () => {
    g_animationActive = false;
  };

  // Mouse drag for rotation
  const canvas = gl.canvas;
  let dragging = false, lastX = 0, lastY = 0;

  // End drag on mouseup
  canvas.addEventListener('mouseup', () => {
    dragging = false;
  });

  // Single mousedown handler for both poke and drag
  canvas.addEventListener('mousedown', ev => {
    if (ev.shiftKey) {
      g_pokeActive    = true;
      g_pokeStartTime = performance.now() * 0.001;
    } else {
      dragging = true;
      lastX    = ev.clientX;
      lastY    = ev.clientY;
    }
  });

  canvas.addEventListener('mouseup', () => {
    dragging = false;
  });
  canvas.addEventListener('mousemove', ev => {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    g_mouseXAngle += dx * 0.5;
    g_mouseYAngle += dy * 0.5;
    lastX = ev.clientX;
    lastY = ev.clientY;
    renderAllShapes();
  });
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
  if (!g_animationActive) return;

  const now = performance.now() * 0.001;
  g_tailAngle = 20 * Math.sin(now * 5);
  g_legAngle  = 30 * Math.sin(now * 3);
  g_kneeAngle = 20 * Math.sin(now * 4 + Math.PI/2);
  g_neckAngle = 10 * Math.sin(now * 2 * Math.PI);
}



function main() {
  setupWebGL();
  initShadersAndLocations();
  initCubeBuffer();            
  addUIActions();
  initSphereBuffer();
  initHemisphereBuffer();

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
