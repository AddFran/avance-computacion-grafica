// Paso 3: Transformaciones matriciales en 2D 
// Ahora dejamos de dibujar nuestro triangulo fijo y le damos el poder de moverse o transformase matematicamente

// Esto ya lo sabemos, consultar versiones anteriores del repositorio para hallar la explicacion mas detallada
const canvas = document.getElementById("glCanvas"); 2
const gl = canvas.getContext("webgl2");

if (!gl){
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// gl.clear(gl.COLOR_BUFFER_BIT); Por ahora solo definimos el color con el que se limpiara el buffer color, mas o aplicamos el cambio 

const vertices = new Float32Array([
    0.0,  0.7,   
    -0.7, -0.7,  
    0.7, -0.7  
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


// Hacemos un cambio importante en el vertexShader, osea, cada vez que procesemos un vertice...
const vertexShaderSource = `#version 300 es

// Aparte de recibir la posición de cada vértice...
in vec2 aPosition;

// Ahora recibimos una matriz de transformacion
uniform mat3 uModelMatrix;
    // uniform es una variable que tiene el mismo valor para cada vertice 

// Ya no pasamos directamente los vertices recibidos a un vector 4d para webgl, debemos transformarlo primero...
void main() {

    // Convierte el vertice recibido (x,y) en coordenadas homogeneas (x,y,1)    
    vec3 posicionLocal = vec3(aPosition, 1.0);
        // Esto nos permite aplicar las transformaciones usando multiplicacion matricial

    // Aplicamos la transformacion correspondiente
    vec3 posicionTransformada = uModelMatrix * posicionLocal;
        // Lo hacemos a traves de una multiplicacion

    // Una vez aplicada la transformacion podemos enviar el resultado
    gl_Position = vec4(posicionTransformada.xy,0.0,1.0);
}
`;

// Nuestro fragmentShader se mantiene igual
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 outColor;

void main() {
    outColor = vec4(1.0, 0.75, 0.1, 1.0);
}
`;

// La compilacion de shaders se mantiene igual
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

// VAO se mantiene igual
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

// Aqui aparece la magia, las transformaciones, cada una permite realizar una transformacion sobre nuestro objeto

// Identidad, no hace ningun cambio (xd)
function matrizIdentidad() {
    return new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
}

// Traslacion, mueve todo objeto (todos los vertices)
    // Si tx = 0.3, el triangulo se desplaza a la derecha
    // Si ty = 0.1, el triangulo se desplaza hacia arriba
function matrizTraslacion(tx, ty) {
    return new Float32Array([
        1,  0, 0,
        0,  1, 0,
        tx, ty, 1
    ]);
}
    
// Rotacion, gira alrededor del origen
    // Ojo, rota alrededor del 0,0, no alrededor del centro del canvas
function matrizRotacion(anguloRadianes) {
    const c=Math.cos(anguloRadianes);
    const s=Math.sin(anguloRadianes);

    return new Float32Array([
         c, s, 0,
        -s, c, 0,
         0, 0, 1
    ]);
}

// Escala, cambia el tamanio
    // sx para controlar el ancho
    // sy para controlar el alto
function matrizEscala(sx, sy) { // 
    return new Float32Array([
        sx, 0,  0,
        0,  sy, 0,
        0,  0,  1
    ]);
}

// Multipllicacion, para combinar transformaciones en una sola matriz
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

// Aplicamos las transformaciones

// Desplazamiento
const tx = 0.30;
const ty = 0.10;
// Giro
const anguloGrados = 35;
const anguloRadianes = anguloGrados * Math.PI / 180;
// Escala
const sx = 1.20;
const sy = 0.80;

const T = matrizTraslacion(tx, ty);
const R = matrizRotacion(anguloRadianes);
const S = matrizEscala(sx, sy);
const RS = multiplicarMat3(R, S);
// Todas las transformaciones juntas en una matriz
const modelMatrix = multiplicarMat3(T, RS);

// Creamos el programa
gl.useProgram(program);     

// Busca dentro de shader donde vive el uniform y obtiene su "direccion"
const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");

// Luego lo envia
gl.uniformMatrix3fv(
    modelMatrixLocation,    // Uniform que recibira los datos
    false,                  // No transpone la matriz
    modelMatrix             // Matriz con todas las transformaciones que preparamos
);

gl.clear(gl.COLOR_BUFFER_BIT);      // Limpiamos el canvas
gl.bindVertexArray(vao);            // Activamos la configuracion VAO
gl.drawArrays(gl.TRIANGLES,0,3);    // Dibujamos el triangulo