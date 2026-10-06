// Paso 8: Normales e iluminacion basica
// Añadiremos informacion geometrica de orientacion mediante vectores normales
// La esfera dejara de depender de colores y respondera a una fuente de luz direccional mediente producto punto

// Esto ya lo sabemos, consultar versiones anteriores del repositorio para hallar la explicacion mas detallada
const canvas=document.getElementById("glCanvas"); 
const gl=canvas.getContext("webgl2");

if(!gl){
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0,0,canvas.width,canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0); 
gl.enable(gl.DEPTH_TEST); 

// Modificamos la funcion 
function crearEsfera(radio,segmentosLatitud,segmentosLongitud){
    const vertices = [];
    const indices = []; 

    for (let latitud=0;latitud<=segmentosLatitud;latitud++) {
        const v = latitud / segmentosLatitud;
        const phi = v * Math.PI;
        for (let longitud = 0;longitud <= segmentosLongitud;longitud++) {
            const u = longitud / segmentosLongitud;
            const theta = u * Math.PI * 2;         

            // Calculamos la normal del vertices
            const nx = Math.sin(phi) * Math.cos(theta);
            const ny = Math.cos(phi);
            const nz = Math.sin(phi) * Math.sin(theta);

            const x = radio * Math.sin(phi) * Math.cos(theta);
            const y = radio * Math.cos(phi);
            const z = radio * Math.sin(phi) * Math.sin(theta);

            vertices.push(x,y,z);

            // Normal. En una esfera centrada en el origen
            vertices.push(nx, ny, nz);
                // La dirección normal ya es (nx, ny, nz)
        }
    }

    const columnas = segmentosLongitud + 1;

    for (let latitud = 0;latitud < segmentosLatitud;latitud++) {
        for (let longitud = 0;longitud < segmentosLongitud;longitud++) {
            const actual = latitud * columnas + longitud;
            const siguiente = actual + columnas;
            
            indices.push(actual,siguiente,actual + 1);
            indices.push(siguiente,siguiente + 1,actual + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

const esfera = crearEsfera(1.0,32,48); // 1.0, 32, 48
const vertices = esfera.vertices;
const indices = esfera.indices;

const vertexShaderSource = `#version 300 es 
in vec3 aPosition;

// Dejamos atras los atributos de color por cada vertice
in vec3 aNormal;
    // Normal del vertice
    // Ahora solo consideramos la normal

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;       
uniform mat4 uProjectionMatrix;

out vec3 vNormal;

void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);     
    
    // Tambien necesitamos transformar la normal del vertice a espacio de mundo
    vNormal = normalize(mat3(uModelMatrix) * aNormal);
        // Normalizamos para que la longitud sea 1
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

// Info de vexter shader
in vec3 vNormal;

uniform vec3 uLightDirection;
uniform vec3 uObjectColor;

out vec4 outColor;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);

    float diffuse = max(dot(N, L), 0.0);

    float ambient = 0.18;

    vec3 color =
        uObjectColor *
        (ambient + diffuse * 0.82);

    outColor = vec4(color, 1.0);
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

// x, y, z, nx, ny, nz = 6 floats
const stride=6*Float32Array.BYTES_PER_ELEMENT;

const positionLocation = gl.getAttribLocation(program,"aPosition");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation,3,gl.FLOAT,false,stride,0);

// Normal
const normalLocation = gl.getAttribLocation(program, "aNormal");
gl.enableVertexAttribArray(normalLocation);
gl.vertexAttribPointer(normalLocation,3,gl.FLOAT,false,stride,3*Float32Array.BYTES_PER_ELEMENT);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);

function restarVec3(a,b){
    return [
        a[0]-b[0],
        a[1]-b[1],
        a[2]-b[2]
    ];
}
function longitudVec3(v){
    return Math.hypot(v[0],v[1],v[2]);
}
function normalizarVec3(v){
    const longitud=longitudVec3(v);
    return [
        v[0]/longitud,
        v[1]/longitud,
        v[2]/longitud
    ];
}
function productoCruz(a,b){
    return [
        a[1]*b[2]-a[2]*b[1],
        a[2]*b[0]-a[0]*b[2],
        a[0]*b[1]-a[1]*b[0]
    ];
}
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

function matrizPerspectiva(fovRadianes,aspect,near,far){
    const f=1.0 / Math.tan(fovRadianes / 2);
    const nf=1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,            
        0, f, 0, 0,                     
        0, 0, (far + near) * nf, -1,                      
        0, 0, (2 * far * near) * nf, 0  
    ]);
}

function matrizLookAt(eye,target,up){
    const zAxis=normalizarVec3(restarVec3(eye, target));
    const xAxis=normalizarVec3(productoCruz(up, zAxis));
    const yAxis=productoCruz(zAxis,xAxis);

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

const modelMatrixLocation =gl.getUniformLocation(program,"uModelMatrix");
const viewMatrixLocation =gl.getUniformLocation(program,"uViewMatrix");
const projectionMatrixLocation =gl.getUniformLocation(program,"uProjectionMatrix");

// Añadimos
const lightDirectionLocation =
    gl.getUniformLocation(program, "uLightDirection");

const objectColorLocation =
    gl.getUniformLocation(program, "uObjectColor");


const eye = [0., 1.5, 4.5];        
const target = [0.0, 0.0, 0.0];     
const up = [0.0, 1.0, 0.0];         

const viewMatrix=matrizLookAt(eye,target,up);

const fovGrados = 60;                           
const fovRadianes = fovGrados * Math.PI / 180;  
const aspect = canvas.width / canvas.height;    

const near = 0.1;  
const far = 100.0; 

const projectionMatrix =matrizPerspectiva(fovRadianes,aspect,near,far);

gl.uniformMatrix4fv(viewMatrixLocation,false,viewMatrix);
gl.uniformMatrix4fv(projectionMatrixLocation,false,projectionMatrix);


// Dirección desde la superficie hacia la luz.
const lightDirection = normalizarVec3([1.0, 0.7, 1.0]);
gl.uniform3fv(lightDirectionLocation, lightDirection);

// Color base del cuerpo celeste.
gl.uniform3fv(objectColorLocation, [0.95, 0.45, 0.08]);


let anguloX = 0;
let anguloY = 0;
let tiempoAnterior = 0;

const velocidadX = 0.08;
const velocidadY = 0.35;

function render(tiempoActual) {
    const tiempoSegundos=tiempoActual*0.001;
    const deltaTime=tiempoSegundos-tiempoAnterior;
    tiempoAnterior = tiempoSegundos;

    anguloX+=velocidadX*deltaTime;
    anguloY+=velocidadY*deltaTime;

    const Rx = matrizRotacionX(anguloX);
    const Ry = matrizRotacionY(anguloY);
    const rotacion =multiplicarMat4(Ry, Rx);

    const T=matrizTraslacion4(0.0,0.0,0.0); 
    const modelMatrix=multiplicarMat4(T,rotacion);

    gl.uniformMatrix4fv(modelMatrixLocation,false,modelMatrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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