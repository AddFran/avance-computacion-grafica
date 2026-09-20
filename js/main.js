// Paso 4: Animacion y Render Loop 
// En el anterior paso vimos como podemos traslador y mover un objeto,
// ahora aplicaremos esas transforamaciones de forma continua para formar una animacion hecha y derecha.

// Esto ya lo sabemos, consultar versiones anteriores del repositorio para hallar la explicacion mas detallada
const canvas=document.getElementById("glCanvas"); 
const gl=canvas.getContext("webgl2");

if(!gl){
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0,0,canvas.width,canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0); 

const vertices = new Float32Array([
    0.0,  0.7,   
    -0.7, -0.7,  
    0.7, -0.7  
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 uModelMatrix;

void main() {   
    vec3 posicionLocal = vec3(aPosition, 1.0);
    vec3 posicionTransformada = uModelMatrix * posicionLocal;
    gl_Position = vec4(posicionTransformada.xy,0.0,1.0);
}
`;
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 outColor;

void main() {
    outColor = vec4(1.0, 0.75, 0.1, 1.0);
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

const vao = gl.createVertexArray();

gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
const positionLocation = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(positionLocation); 

gl.vertexAttribPointer(
    positionLocation,
    2,              
    gl.FLOAT,      
    false,          
    0,            
    0              
);

function matrizIdentidad() {
    return new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
}
function matrizTraslacion(tx, ty) {
    return new Float32Array([
        1,  0,  0,
        0,  1,  0,
        tx, ty, 1
    ]);
}
function matrizRotacion(anguloRadianes) {
    const c=Math.cos(anguloRadianes);
    const s=Math.sin(anguloRadianes);

    return new Float32Array([
         c, s, 0,
        -s, c, 0,
         0, 0, 1
    ]);
}
function matrizEscala(sx, sy) { 
    return new Float32Array([
        sx, 0,  0,
        0,  sy, 0,
        0,  0,  1
    ]);
}
function multiplicarMat3(a,b){
    const resultado=new Float32Array(9);
    for(let columna=0;columna<3;columna++){
        for(let fila=0;fila<3;fila++){
            let suma=0;
            for(let k=0;k<3;k++){
                suma+=a[k*3+fila]*b[columna*3+k];
            }
            resultado[columna*3+fila]=suma;
        }
    }
    return resultado;
}

// Ya no aplicaremos las transformaciones una sola vez, ahora se aplicaran en cada frame

// Obtener la ubicación del uniform
    // El Vertex Shader tiene: uniform mat3 uModelMatrix;
    // Necesitamos saber dónde está almacenado para enviarle una matriz en cada frame
    
gl.useProgram(program);     
    // Busca la ubicacion del uniform "uModelMatrix" en el programa
const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");
    // Guarda la ubicación en la variable modelMatrixLocation

// Variables que cambian durante la ejecución.
let angulo = 0.0;          // rotación acumulada
let tiempoAnterior = 0.0;  // tiempo del frame anterior

// Velocidad angular
const velocidadAngular = 60 * Math.PI / 180; // 60 grados por segundo convertidos a radianes

// Transformaciones constantes, no cambian entre frames
const T = matrizTraslacion(
    0.30,
    0.10
);
const S = matrizEscala(
    1.20,
    0.80
);


// ------------------------------------------------------------
// Render Loop
// ------------------------------------------------------------
// Esta funcion es el corazon de la aplicacion
// El navegador la ejecuta aproximadamente una vez por cada actualizacion de pantalla
function render(tiempoActual){
    // Convertir milisegundos a segundos.
    const tiempoSegundos=tiempoActual*0.001;

    // deltaTime: Tiempo transcurrido desde el frame anterior.
    let deltaTime=tiempoSegundos-tiempoAnterior;
    tiempoAnterior=tiempoSegundos;

    // Evitamos un salto muy grande cuando la pestaña estuvo pausada.
    if(deltaTime>0.1){
        deltaTime=0.0;
    }

    // Actualizar el estado de la escena
    angulo+=velocidadAngular*deltaTime;
        // Ángulo = ángulo + velocidad * tiempo

    // Crear la nueva matriz de rotacion
    const R=matrizRotacion(angulo);

    // Combinar transformaciones
    const RS = multiplicarMat3(R, S);
    const modelMatrix = multiplicarMat3(T, RS);
        // Primero escala
        // Luego rota
        // Finalmente traslada
        // M = T * R * S
    
    // Limpiar la pantalla
    gl.clear(gl.COLOR_BUFFER_BIT);
        // Igual que en el Paso 2, borra el contenido del frame anterior


    // Enviar la matriz al Vertex Shader.
    gl.useProgram(program);
    gl.uniformMatrix3fv(
        modelMatrixLocation,
        false,               // no transponer
        modelMatrix          // matriz enviada a la GPU
    );

    // Dibuja el triangulo
    gl.bindVertexArray(vao);
    gl.drawArrays(
        gl.TRIANGLES,
        0,   // primer vertice
        3    // cantidad de vértices
    );

    // Solicitar el siguiente frame
    requestAnimationFrame(render);
        // El navegador volverá a llamar render() antes del próximo refresco de pantalla.
}

// Solo llamamos requestAnimationFrame una vez
// A partir de aquí el propio render loop se encargará de llamarse continuamente
requestAnimationFrame(render);