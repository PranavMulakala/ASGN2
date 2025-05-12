// terrain.js

/**
 * Generates terrain mesh data.
 * @param {number} width - The width of the terrain in the X direction.
 * @param {number} depth - The depth of the terrain in the Z direction.
 * @param {number} widthSegments - The number of segments along the width.
 * @param {number} depthSegments - The number of segments along the depth.
 * @param {function} heightFunction - A function that takes (x, z) and returns y (height).
 * @returns {object} An object containing vertices, uvs, and indices arrays.
 */
function generateTerrain(width, depth, widthSegments, depthSegments, heightFunction) {
    const vertices = [];
    const uvs = [];
    const indices = [];

    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    const segmentWidth = width / widthSegments;
    const segmentDepth = depth / depthSegments;

    for (let i = 0; i <= depthSegments; i++) { // Iterate over Z direction (rows)
        const z = (i * segmentDepth) - halfDepth;
        for (let j = 0; j <= widthSegments; j++) { // Iterate over X direction (columns)
            const x = (j * segmentWidth) - halfWidth;

            // Calculate height using the provided function
            const y = heightFunction(x, z);

            vertices.push(x, y, z); // Add vertex position
            uvs.push(j / widthSegments, i / depthSegments); // Add UV coordinate (maps 0-1 across the terrain)

            // Add indices to form triangles (for all but the last row and column of quads)
            if (i < depthSegments && j < widthSegments) {
                const currentRowStartVertexIndex = i * (widthSegments + 1);
                const nextRowStartVertexIndex = (i + 1) * (widthSegments + 1);

                const topLeft = currentRowStartVertexIndex + j;
                const topRight = topLeft + 1;
                const bottomLeft = nextRowStartVertexIndex + j;
                const bottomRight = bottomLeft + 1;

                // First triangle of the quad
                indices.push(topLeft);
                indices.push(bottomLeft);
                indices.push(topRight);

                // Second triangle of the quad
                indices.push(topRight);
                indices.push(bottomLeft);
                indices.push(bottomRight);
            }
        }
    }

    return {
        vertices: new Float32Array(vertices),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices) // Use Uint16Array if num vertices < 65536, else Uint32Array
    };
}

/**
 * Example height function for terrain generation.
 * Creates a simple sine/cosine wave pattern.
 * @param {number} x - The x-coordinate.
 * @param {number} z - The z-coordinate.
 * @returns {number} The calculated y-coordinate (height).
 */
function simpleHeightFunction(x, z) {
    // Adjust multipliers for frequency and amplitude of waves
    const amplitude = 1.5; // How high/low the waves go
    const xFrequency = 0.2;
    const zFrequency = 0.15;
    return -2.0
}