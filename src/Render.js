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
  
window.g_legAngle  = 0;   
window.g_kneeAngle = 0;  

function renderAllShapes() {
    const startTime = performance.now();
    
    const globalRotMat = new Matrix4();
    
    globalRotMat.setScale(0.7, 0.7, 0.7); 
    
    globalRotMat.rotate(g_mouseXAngle, 0, 1, 0);
    globalRotMat.rotate(g_mouseYAngle, 1, 0, 0);

    if (g_pokeActive) {
        globalRotMat.rotate(g_pokeFlipAngle, 0,1,0);
    }
    
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 3) Shell (carapace)
    const shellMat = new Matrix4();
    shellMat.setTranslate(0, -0.1 + g_shellLift, 0); 
    shellMat.scale(1.3, 0.4, 0.9); 
    drawHemisphere(shellMat, Colors.shell);
    
    // 4) Underside - body
    const undersideMat = new Matrix4(shellMat);
    undersideMat.translate(0, -0.5, 0);
    undersideMat.scale(1.0, 0.6, 1.0);
    drawCube(undersideMat, Colors.underside);
    
    const neckMat = new Matrix4();
    // Position the neck at the front of the shell
    neckMat.setTranslate(0, 0, 0.7); 
    neckMat.rotate(g_neckAngle, 1, 0, 0);
    neckMat.scale(0.2, 0.24, 0.5);
    drawCube(neckMat, Colors.neck);

    // Head - make it larger and more expressive like in the image
    const headMat = new Matrix4(neckMat);
    headMat.translate(0, 0, 0.5);
    headMat.rotate(g_headAngle, 1, 0, 0);
    headMat.scale(0.7, 0.7, 0.7); 
    drawSphere(headMat, Colors.head);

    // 6) Tail
    const tailMat = new Matrix4();
    tailMat.setTranslate(0, 0, -0.7); 
    tailMat.rotate(g_tailAngle, 1, 0, 0);
    tailMat.scale(0.2, 0.2, 1.2);
    drawCube(tailMat, Colors.tail);
    
    // 7) Front Left Leg (with upper and lower segments)
    const frontLeftUpperLegMat = new Matrix4();
    frontLeftUpperLegMat.setTranslate(0.8, -0.3, 0.5);
    frontLeftUpperLegMat.rotate(g_legAngle, 0, 0, 1);
    frontLeftUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(frontLeftUpperLegMat, Colors.leg);
    
    const frontLeftLowerLegMat = new Matrix4(frontLeftUpperLegMat);
    frontLeftLowerLegMat.translate(0, -0.5, 0);
    frontLeftLowerLegMat.rotate(g_kneeAngle, 0, 0, 1);
    frontLeftLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(frontLeftLowerLegMat, Colors.leg);

    // Front Left Foot
    const frontLeftFootMat = new Matrix4();
    frontLeftFootMat.set(frontLeftLowerLegMat);
    frontLeftFootMat.translate(0, -0.5, 0);
    frontLeftFootMat.rotate(g_footAngle, 1, 0, 0);
    frontLeftFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(frontLeftFootMat, Colors.foot);
    
    // 8) Front Right Leg (with upper and lower segments)
    const frontRightUpperLegMat = new Matrix4();
    frontRightUpperLegMat.setTranslate(-0.8, -0.3, 0.5);
    frontRightUpperLegMat.rotate(g_legAngle, 0, 0, 1);
    frontRightUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(frontRightUpperLegMat, Colors.leg);
    
    const frontRightLowerLegMat = new Matrix4(frontRightUpperLegMat);
    frontRightLowerLegMat.translate(0, -0.5, 0);
    frontRightLowerLegMat.rotate(g_kneeAngle, 0, 0, 1);
    frontRightLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(frontRightLowerLegMat, Colors.leg);
    
    // Front Right Foot
    const frontRightFootMat = new Matrix4();
    frontRightFootMat.set(frontRightLowerLegMat);
    frontRightFootMat.translate(0, -0.5, 0);
    frontRightFootMat.rotate(g_footAngle, 1, 0, 0);
    frontRightFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(frontRightFootMat, Colors.foot);
    
    // 9) Back Left Leg (with upper and lower segments)
    const backLeftUpperLegMat = new Matrix4();
    backLeftUpperLegMat.setTranslate(0.8, -0.3, -0.5);
    backLeftUpperLegMat.rotate(g_legAngle, 0, 0, 1);
    backLeftUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(backLeftUpperLegMat, Colors.leg);
    
    const backLeftLowerLegMat = new Matrix4(backLeftUpperLegMat);
    backLeftLowerLegMat.translate(0, -0.5, 0);
    backLeftLowerLegMat.rotate(g_kneeAngle, 0, 0, 1);
    backLeftLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(backLeftLowerLegMat, Colors.leg);
    
    // Back Left Foot
    const backLeftFootMat = new Matrix4();
    backLeftFootMat.set(backLeftLowerLegMat);
    backLeftFootMat.translate(0, -0.5, 0);
    backLeftFootMat.rotate(g_footAngle, 1, 0, 0);
    backLeftFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(backLeftFootMat, Colors.foot);
    
    // 10) Back Right Leg (with upper and lower segments)
    const backRightUpperLegMat = new Matrix4();
    backRightUpperLegMat.setTranslate(-0.8, -0.3, -0.5);
    backRightUpperLegMat.rotate(g_legAngle, 0, 0, 1);
    backRightUpperLegMat.scale(0.2, 0.5, 0.2);
    drawCube(backRightUpperLegMat, Colors.leg);
    
    const backRightLowerLegMat = new Matrix4(backRightUpperLegMat);
    backRightLowerLegMat.translate(0, -0.5, 0);
    backRightLowerLegMat.rotate(g_kneeAngle, 0, 0, 1);
    backRightLowerLegMat.scale(0.8, 0.8, 0.8);
    drawCube(backRightLowerLegMat, Colors.leg);
    
    // Back Right Foot
    const backRightFootMat = new Matrix4();
    backRightFootMat.set(backRightLowerLegMat);
    backRightFootMat.translate(0, -0.5, 0);
    backRightFootMat.rotate(g_footAngle, 1, 0, 0);
    backRightFootMat.scale(0.15, 0.1, 0.25);
    drawSphere(backRightFootMat, Colors.foot);

    const endTime = performance.now();
    const duration = endTime - startTime;    
    const fps      = 1000 / duration;        

    updatePerformanceInfo(duration, fps);

}
window.renderAllShapes = renderAllShapes;