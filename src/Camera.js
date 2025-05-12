
class Camera {
    constructor(canvas) { 
      this.eye = new Vector3([0, 2, 6]); // Where the camera is
      this.at  = new Vector3([0, 0, 0]); // What the camera is looking at
      this.up  = new Vector3([0, 1, 0]); // Which direction is "up" for the camera
  
      this.fov = 60.0; // Field of View in degrees
  
      // Matrices
      this.viewMatrix = new Matrix4();
      this.projectionMatrix = new Matrix4();
  
      // Initialize matrices based on the initial settings
      this.updateViewMatrix();
      if (canvas && canvas.width && canvas.height) {
        this.updateProjectionMatrix(canvas.width / canvas.height);
      } else {
        this.updateProjectionMatrix(1.0); // Default aspect if canvas isn't fully ready
      }
    }
  
    // Call this method to update the view matrix, usually after eye/at/up changes
    updateViewMatrix() {
      this.viewMatrix.setLookAt(
        this.eye.elements[0], this.eye.elements[1], this.eye.elements[2], // Eye position
        this.at.elements[0],  this.at.elements[1],  this.at.elements[2],  // Look-at point
        this.up.elements[0],  this.up.elements[1],  this.up.elements[2]   // Up direction
      );
    }
  
    // Call this to update the projection matrix, e.g., if FOV or aspect ratio changes
    updateProjectionMatrix(aspect) {
      this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 1000); // fov, aspect, near, far
    }
  
    // Move the camera forward (W key)
    moveForward(speed) {
      let f = new Vector3();
      f.set(this.at);    // Get a copy of the 'at' vector
      f.sub(this.eye);   // Calculate direction vector: f = at - eye
      
      f.normalize();     // Make it a unit vector
      f.mul(speed);      // Scale by speed
  
      this.eye.add(f);   // Move eye forward
      this.at.add(f);    // Move look-at point forward as well
  
      this.updateViewMatrix(); // Important: Update the view matrix after moving
      // console.log("Camera moved forward. Eye:", this.eye.elements, "At:", this.at.elements);
    }
  
    // Move the camera backward (S key)
    moveBackwards(speed) {
      let b = new Vector3();
      b.set(this.eye);   // Get a copy of the 'eye' vector
      b.sub(this.at);    // Calculate backward direction: b = eye - at
  
      b.normalize();
      b.mul(speed);
  
      this.eye.add(b);
      this.at.add(b);
  
      this.updateViewMatrix();
      // console.log("Camera moved backwards. Eye:", this.eye.elements, "At:", this.at.elements);
    }
  
    // Strafe the camera to the left (A key)
    moveLeft(speed) {
      let f = new Vector3();
      f.set(this.at);
      f.sub(this.eye);   // Direction vector f = at - eye (forward)
  
      // Calculate side vector s = up x f (cross product)
      // Vector3.cross returns a new Vector3
      let s = Vector3.cross(this.up, f); 
      s.normalize();
      s.mul(speed);
  
      this.eye.add(s);
      this.at.add(s);
  
      this.updateViewMatrix();
      // console.log("Camera moved left. Eye:", this.eye.elements, "At:", this.at.elements);
    }
  
    // Strafe the camera to the right (D key)
    moveRight(speed) {
      let f = new Vector3();
      f.set(this.at);
      f.sub(this.eye);   // Direction vector f = at - eye (forward)
  
      // Calculate side vector s = f x up
      let s = Vector3.cross(f, this.up);
      s.normalize();
      s.mul(speed);
  
      this.eye.add(s);
      this.at.add(s);
  
      this.updateViewMatrix();
      // console.log("Camera moved right. Eye:", this.eye.elements, "At:", this.at.elements);
    }
  
    // Rotate the camera's view to the left (Q key)
    panLeft(angleDegrees) {
      let f = new Vector3();
      f.set(this.at);
      f.sub(this.eye); // Get the current view direction vector: f = at - eye
  
      // Create a rotation matrix to rotate around the camera's 'up' vector
      let rotationMatrix = new Matrix4();
      rotationMatrix.setRotate(angleDegrees, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
      
      // Rotate the direction vector
      let f_prime = rotationMatrix.multiplyVector3(f); // multiplyVector3 usually returns a new Vector3
  
      // Update the 'at' point: new_at = eye + rotated_direction
      let new_at = new Vector3(this.eye.elements); // Start from current eye position
      new_at.add(f_prime);
      this.at.set(new_at); // Set 'at' to the new calculated point
  
      this.updateViewMatrix();
      // console.log("Camera panned left. At:", this.at.elements);
    }
  
    // Rotate the camera's view to the right (E key)
    panRight(angleDegrees) {
      let f = new Vector3();
      f.set(this.at);
      f.sub(this.eye); // Get the current view direction vector: f = at - eye
  
      let rotationMatrix = new Matrix4();
      // Rotate by -angleDegrees for panning right
      rotationMatrix.setRotate(-angleDegrees, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
      
      let f_prime = rotationMatrix.multiplyVector3(f);
  
      let new_at = new Vector3(this.eye.elements);
      new_at.add(f_prime);
      this.at.set(new_at);
  
      this.updateViewMatrix();
      // console.log("Camera panned right. At:", this.at.elements);
    }

    panHorizontal(angleDegrees) { // Positive angle pans right, negative pans left
        this.panRight(angleDegrees); // Or panLeft(-angleDegrees)
        // The panRight/panLeft methods already call updateViewMatrix()
    }

    tiltVertical(angleDegrees) {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye); // f = at - eye (current forward direction)
    
        // Calculate the camera's right vector: cross(forward, up)
        // Note: Order matters for cross product. If f is at-eye, and up is world up,
        // then cross(f, this.up) gives the right vector.
        let right_vector = Vector3.cross(f, this.up);
        right_vector.normalize(); // Ensure it's a unit vector for the axis
    
        let rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(angleDegrees, right_vector.elements[0], right_vector.elements[1], right_vector.elements[2]);
    
        let f_prime = rotationMatrix.multiplyVector3(f);
    
        let new_at = new Vector3(this.eye.elements);
        new_at.add(f_prime);
        this.at.set(new_at);
    
        this.updateViewMatrix();
        // console.log("Camera tilted. At:", this.at.elements);
    }
  }