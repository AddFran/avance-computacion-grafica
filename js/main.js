// Paso 6: Camara y proyeccion perspectiva
// Ahora dibujamos desde el punto de vista de una camara y no desde el centro del mundo
    // Paso 5: El cubo se rotaba con una matriz de transformación y se enviaba directamente al shader
    // Paso 6: El cubo existe en un mundo, una cámara observa ese mundo y una proyección perspectiva convierte la escena 3D en la imagen 2D del canvas

// Esto ya lo sabemos, consultar versiones anteriores del repositorio para hallar la explicacion mas detallada
const canvas=document.getElementById("glCanvas"); 
const gl=canvas.getContext("webgl2");

if(!gl){
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0,0,canvas.width,canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0); 
gl.enable(gl.DEPTH_TEST); 

const vertices=new Float32Array([ 
    // x,     y,     z,      r,   g,   b
    -0.5, -0.5,  0.5,    1.0, 0.2, 0.2, // 0
     0.5, -0.5,  0.5,    0.2, 1.0, 0.2, // 1
     0.5,  0.5,  0.5,    0.2, 0.4, 1.0, // 2
    -0.5,  0.5,  0.5,    1.0, 1.0, 0.2, // 3

    -0.5, -0.5, -0.5,    1.0, 0.2, 1.0, // 4
     0.5, -0.5, -0.5,    0.2, 1.0, 1.0, // 5
     0.5,  0.5, -0.5,    1.0, 0.6, 0.2, // 6
    -0.5,  0.5, -0.5,    0.7, 0.7, 0.7  // 7
]);
    
const indices = new Uint16Array([
    // Frente
    0, 1, 2,
    0, 2, 3,
    // Derecha
    1, 5, 6,
    1, 6, 2,
    // Atrás
    5, 4, 7,
    5, 7, 6,
    // Izquierda
    4, 0, 3,
    4, 3, 7,
    // Arriba
    3, 2, 6,
    3, 6, 7,
    // Abajo
    4, 5, 1,
    4, 1, 0
]);

// VextexShader cambia a comparacion de versiones anteriores
const vertexShaderSource = `#version 300 es 
in vec3 aPosition;
in vec3 aColor;

uniform mat4 uModelMatrix;

// Nuevas matrices
uniform mat4 uViewMatrix;       // Representa la cámara: desde dónde se observa el mundo
uniform mat4 uProjectionMatrix; // Convierte la escena 3D en una proyección con perspectiva

out vec3 vColor;

void main() {
    gl_Position = uProjectionMatrix         // Convierte la escena 3D en una imagen 2D
                * uViewMatrix               // Representa la camara, transforma el mundo a la vista de la camara
                * uModelMatrix              // Coloca el cubo en el mundo y aplica la rotacion
                * vec4(aPosition, 1.0);     // Posicion del vertice
    
    vColor = aColor;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 vColor;

out vec4 outColor;

void main() {
    outColor = vec4(vColor, 1.0);
}
`;

function crearShader(gl, tipo, codigoFuente) {
    const shader = gl.createShader(tipo);   
    gl.shaderSource(shader, codigoFuente);  
    gl.compileShader(shader);               
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Error al compilar shader:\n" + error);
    }
    return shader;
}

const vertexShader = crearShader(gl,gl.VERTEX_SHADER,vertexShaderSource);
const fragmentShader = crearShader(gl,gl.FRAGMENT_SHADER,fragmentShaderSource);

const program = gl.createProgram();

gl.attachShader(program, vertexShader);     
gl.attachShader(program, fragmentShader);   
gl.linkProgram(program);                   

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
        "Error al enlazar programa:\n" + gl.getProgramInfoLog(program)
    );
}

gl.useProgram(program);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);

const stride=6*Float32Array.BYTES_PER_ELEMENT;

const positionLocation = gl.getAttribLocation(program,"aPosition");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
    positionLocation,
    3,                
    gl.FLOAT,
    false,
    stride,          
    0
);

const colorLocation = gl.getAttribLocation(program, "aColor");
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(
    colorLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    3*Float32Array.BYTES_PER_ELEMENT   
);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);

// ----------------------------------------
// Agregaremos nuevas operaciones para poder trabajar con la camara y la proyeccion perspectiva

// Resta de dos vectores 3D, obtiene la direccion entre dos puntos
function restarVec3(a,b){
    return [
        a[0]-b[0],
        a[1]-b[1],
        a[2]-b[2]
    ];
}

// Longitud de un vector 3D, magnitud de un vector
function longitudVec3(v){
    return Math.hypot(v[0],v[1],v[2]);
}

// Normaliza un vector 3D, lo convierte en un vector unitario para poder usarlo como direccion
function normalizarVec3(v){
    const longitud=longitudVec3(v);
    return [
        v[0]/longitud,
        v[1]/longitud,
        v[2]/longitud
    ];
}

// Producto cruz de dos vectores 3D, obtiene un vector perpendicular a ambos
    // Se usa para obtener la direccion "arriba" de la camara
function productoCruz(a,b){
    return [
        a[1]*b[2]-a[2]*b[1],
        a[2]*b[0]-a[0]*b[2],
        a[0]*b[1]-a[1]*b[0]
    ];
}

// Matrices que ya conociamos de pasos anteriores
function matrizIdentidad4() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}
function matrizTraslacion4(tx,ty,tz){
    return new Float32Array([
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ]);
}
function matrizEscala4(sx,sy,sz){
    return new Float32Array([
        sx, 0,  0,  0,
        0,  sy, 0,  0,
        0,  0,  sz, 0,
        0,  0,  0,  1
    ]);
}
function matrizRotacionX(angulo){
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    return new Float32Array([
        1, 0,  0, 0,
        0, c,  s, 0,
        0, -s, c, 0,
        0, 0,  0, 1
    ]);
}
function matrizRotacionY(angulo){
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);

    return new Float32Array([
         c, 0, -s, 0,
         0, 1,  0, 0,
         s, 0,  c, 0,
         0, 0,  0, 1
    ]);
}
function matrizRotacionZ(angulo){

    const c=Math.cos(angulo);
    const s=Math.sin(angulo);

    return new Float32Array([
         c, s, 0, 0,
        -s, c, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1
    ]);
}
function multiplicarMat4(a,b){
    const resultado=new Float32Array(16);
    for(let columna=0;columna<4;columna++){
        for(let fila=0;fila<4;fila++){
            let suma=0;
            for(let k=0;k<4;k++){
                suma+=a[k*4+fila]*b[columna*4+k];
            }
            resultado[columna*4+fila]=suma;
        }
    }
    return resultado;
}

// OTRAS MUY IMPORTANTES PARA LA CAMARA Y LA PROYECCION PERSPECTIVA

// Matriz de proyeccion, construye la matriz de proyeccion perspectiva
function matrizPerspectiva(fovRadianes,aspect,near,far){
    // Factor basado en en campo de vision (FOV)
    const f=1.0 / Math.tan(fovRadianes / 2);
        // Mientras mas grande, mayor sera el angulo de vision, menor el valor de f y la camara abre mas el "lente"
        // Mientras mas pequeño, menor sera el angulo de vision, mayor el valor de f y la camara abre menos el "lente"

    // Factor basado en la distancia de recorte (near y far)
    const nf=1 / (near - far);

    // Matriz de proyeccion perspectiva, convierte la escena 3D en una imagen 2D
    return new Float32Array([
        f / aspect, 0, 0, 0,            // Ajusta el ancho según la proporción del canvas
        0, f, 0, 0,                     // Escala el alto según el FOV
        0, 0, (far + near) * nf, -1,    // Transforma la profundidad usando near y far                    
        0, 0, (2 * far * near) * nf, 0  // Hace posible la división perspectiva
    ]);
}

// Matriz de vista, construye la matriz de vista
function matrizLookAt(eye,target,up){
    // Eje Z de la camara: desde target hacia eye
        // Obtiene la dirección desde el punto que la cámara observa hacia la posición de la camara
    const zAxis=normalizarVec3(restarVec3(eye, target));

    // Eje X de la cámara
        // Ahora la camara sabe cual es su lado derecho
    const xAxis=normalizarVec3(productoCruz(up, zAxis));

    // Eje Y de la cámara
        // Eje vertical de la camara, perpendicular a los otros dos ejes
    const yAxis=productoCruz(zAxis,xAxis);

    // Con estos 3 ejes, la camara sabe hacia donde mirar y cual es su "arriba", ahora solo falta colocarla en el mundo

    return new Float32Array([
        xAxis[0],
        yAxis[0],
        zAxis[0],
        0,

        xAxis[1],
        yAxis[1],
        zAxis[1],
        0,

        xAxis[2],
        yAxis[2],
        zAxis[2],
        0,

        -(
            xAxis[0] * eye[0] +
            xAxis[1] * eye[1] +
            xAxis[2] * eye[2]
        ),

        -(
            yAxis[0] * eye[0] +
            yAxis[1] * eye[1] +
            yAxis[2] * eye[2]
        ),

        -(
            zAxis[0] * eye[0] +
            zAxis[1] * eye[1] +
            zAxis[2] * eye[2]
        ),

        1
    ]);
}

// Ahora no solo obtenemos la direccion de los vertices...
const modelMatrixLocation =
    gl.getUniformLocation(
        program,
        "uModelMatrix"
    );
// Sino tambien obtenemos la direccion de la camara y la proyeccion perspectiva
const viewMatrixLocation =
    gl.getUniformLocation(
        program,
        "uViewMatrix"
    );
const projectionMatrixLocation =
    gl.getUniformLocation(
        program,
        "uProjectionMatrix"
    );

// Ahora configuramos la camara y la proyeccion perspectiva
    // Solo es necesario hacerlo una vez y no en cada frame
const eye = [2.5, 1.8, 4.0];        // Posision fisica de la camara
const target = [0.0, 0.0, 0.0];     // Punto al que mira la camara
const up = [0.0, 1.0, 0.0];         // Direccion considerada "arriba" para la camara

// Creamos la viewMatrix
const viewMatrix =
    matrizLookAt(
        eye,
        target,
        up
    );

// Configuramos la proyeccion perspectiva
const fovGrados = 60;                           // Define el angulo de vision de la camara
const fovRadianes = fovGrados * Math.PI / 180;  // Convertimos a radianes, las funciones trigonométricas de JS trabajan con radianes
const aspect = canvas.width / canvas.height;    // Calcula la proporcion del canvas para que la imagen no se vea estirada

const near = 0.1;   // Plano near de recorte, todo lo que este mas cerca que este plano no se dibujara
const far = 100.0;  // Plano far de recorte, todo lo que este mas lejos que este plano no se dibujara

// Creamos la projectionMatrix
const projectionMatrix =
    matrizPerspectiva(
        fovRadianes,
        aspect,
        near,
        far
    );

// Enviamos la viewMatrix y la projectionMatrix a la GPU
gl.uniformMatrix4fv(
    viewMatrixLocation,
    false,
    viewMatrix
);
gl.uniformMatrix4fv(
    projectionMatrixLocation,
    false,
    projectionMatrix
);


let anguloX = 0;
let anguloY = 0;
let tiempoAnterior = 0;
const velocidadX = 1.0;
const velocidadY = 1.0;

function render(tiempoActual) {
    // requestAnimationFrame entrega milisegundos
    const tiempoSegundos=tiempoActual*0.001;
    const deltaTime=tiempoSegundos-tiempoAnterior;
    tiempoAnterior = tiempoSegundos;

    // Actualizamos los angulos
    anguloX+=velocidadX*deltaTime;
    anguloY+=velocidadY*deltaTime;

    // Construimos la matriz modelo
    const Rx = matrizRotacionX(anguloX);
    const Ry = matrizRotacionY(anguloY);
    const rotacion =multiplicarMat4(Ry, Rx);

    // El objeto permanece en el origen del mundo
    const T =
        matrizTraslacion4(
            0.0,
            0.0,
            0.0
        );

    // Creamos la matriz modelo 
    const modelMatrix =
        multiplicarMat4(
            T,
            rotacion
        );

    // Enviamos la matriz modelo a la GPU
    gl.uniformMatrix4fv(
        modelMatrixLocation,
        false,
        modelMatrix
    );

    gl.clear(gl.COLOR_BUFFER_BIT |gl.DEPTH_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.drawElements(
        gl.TRIANGLES,
        indices.length,
        gl.UNSIGNED_SHORT,
        0
    );
    requestAnimationFrame(render);
}
requestAnimationFrame(render);