// Paso 10: Texturas Reales - Primer sol y tierra
// Dejamos la textura procedural y usamos imagenes reales, ademas de reutilizar la geometria de la esfera para generar dos cuerpos celestes

// Esto ya lo sabemos, consultar versiones anteriores del repositorio para hallar la explicacion mas detallada
const canvas=document.getElementById("glCanvas"); 
const gl=canvas.getContext("webgl2");

if(!gl){
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0,0,canvas.width,canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0); 
gl.enable(gl.DEPTH_TEST); 

function crearEsfera(radio,segmentosLatitud,segmentosLongitud){
    const vertices = [];
    const indices = []; 

    for (let latitud=0;latitud<=segmentosLatitud;latitud++){
        const v=latitud/segmentosLatitud;
        const phi=v*Math.PI;
        for (let longitud=0;longitud<=segmentosLongitud;longitud++) {
            const u=longitud/segmentosLongitud;
            const theta=u*Math.PI*2;         

            const nx=Math.sin(phi)*Math.cos(theta);
            const ny=Math.cos(phi);
            const nz=Math.sin(phi)*Math.sin(theta);

            const x=radio*Math.sin(phi)*Math.cos(theta);
            const y=radio*Math.cos(phi);
            const z=radio*Math.sin(phi)*Math.sin(theta);

            vertices.push(x,y,z);
            vertices.push(nx,ny,nz);
            vertices.push(u,1.0-v);
        }
    }

    const columnas=segmentosLongitud+1;

    for(let latitud=0;latitud<segmentosLatitud;latitud++){
        for(let longitud=0;longitud<segmentosLongitud;longitud++){
            const actual=latitud*columnas+longitud;
            const siguiente=actual+columnas;
            indices.push(actual,siguiente,actual+1);
            indices.push(siguiente,siguiente+1,actual+1);
        }
    }

    return{
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

// Aqui estamos creando la geometria de la esfera
const esfera=crearEsfera(1.0,32,48);                        // 1.0, 32, 48
    // Solo UNA geometria
    // La geometria y el objeto no son lo mismo
    // El objeto se forma con la geometria + transformacion + textura + propiedades

const vertexShaderSource = `#version 300 es 
in vec3 aPosition; 
in vec3 aNormal;   
in vec2 aTexCoord; 

uniform mat4 uModelMatrix;      
uniform mat4 uViewMatrix;       
uniform mat4 uProjectionMatrix; 

out vec3 vNormal;   
out vec2 vTexCoord; 

void main() {
    // Ahora dividimos el trabajo porque vamos a trabajar con varios objetos
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
        // uModelMatrix contiene varias transformaciones (escala, rotacion y traslacion)
        // Transforma el vértice desde las coordenadas locales de la esfera hasta las coordenadas del mundo
    
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
    
    // Actualizamos las normales del vertice
    vNormal = normalize(mat3(uModelMatrix) * aNormal);

    vTexCoord = aTexCoord;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float; 

in vec3 vNormal;
in vec2 vTexCoord;

uniform sampler2D uTexture;      
uniform vec3 uLightDirection;   
uniform bool uEmissive;

out vec4 outColor;

void main() {
    // Obtenemos el color respectivo segun la coordenada UV en formato RGB
    vec3 colorTextura = texture(uTexture, vTexCoord).rgb;
    
    // Verifica si el objeto es "emissive", osea si emite luz
        // Si lo hace, entonces la textura se aplica de forma limpia sin cambios ni aplicando sombreado
        // Si no, se calcula el sombreado como siempre
    if (uEmissive) {
        outColor = vec4(colorTextura, 1.0);
        return;
    }

    vec3 N = normalize(vNormal);            
    vec3 L = normalize(-uLightDirection);  

    float diffuse = max(dot(N, L), 0.0);
    float ambiente = 0.15;

    // Modifica el color final en base a todo lo anterior
    vec3 colorFinal = colorTextura * (ambiente + diffuse);

    outColor = vec4(colorFinal, 1.0);
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
gl.bufferData(gl.ARRAY_BUFFER,esfera.vertices,gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,esfera.indices,gl.STATIC_DRAW);

const stride=8*Float32Array.BYTES_PER_ELEMENT;

// Posicion
const positionLocation = gl.getAttribLocation(program,"aPosition");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation,3,gl.FLOAT,false,stride,0);

// Normal
const normalLocation = gl.getAttribLocation(program, "aNormal");
gl.enableVertexAttribArray(normalLocation);
gl.vertexAttribPointer(normalLocation,3,gl.FLOAT,false,stride,3*Float32Array.BYTES_PER_ELEMENT);

// UV
const texCoordLocation = gl.getAttribLocation(program, "aTexCoord");
gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(texCoordLocation,2,gl.FLOAT,false,stride,6*Float32Array.BYTES_PER_ELEMENT);

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
function normalizar(v){
    const l=Math.hypot(v[0],v[1],v[2]);
    return [v[0]/l,v[1]/l,v[2]/l];
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

// Reemplazamos la funcion que genera la textura por una que cargue una textura
function cargarTextura(url){ // Recibe la direccion de la textura
    // Definimos un objeto de textura
    const textura=gl.createTexture();
    // Vinculamos la textura
    gl.bindTexture(gl.TEXTURE_2D, textura);
        // Indicamos que "textura" es un TEXTURE_2D
        // Las operaciones que trabajen con TEXTURE_2D trabajaran con "textura"

    // Pixel temporal mientras carga la imagen
    gl.texImage2D(
        gl.TEXTURE_2D,                          // Tipo de textura 
        0,                                      // Nivel de la textura, 0 es nivel base
        gl.RGBA,                                // Formato interno con cuatro canales (red,green,blue,alfa)
        1,                                      // Ancho
        1,                                      // Alto
        0,                                      // Borde
        gl.RGBA,                                // Formato de los datos que proporcionaresmo
        gl.UNSIGNED_BYTE,                       // Cada canal se representa mediante un entero sin signo de 8 bits
        new Uint8Array([255, 255, 255, 255])    // Color temporal blanco (r,g,b,a)
    );

    // Creamos una imagen de JS
    const imagen=new Image();   

    // Cargamos la imagen, este proceso es asincrono
    imagen.onload = () => { // Solo se ejecutar cuando la imagen este lista
        // Volvemos a vincular la textura
        gl.bindTexture(gl.TEXTURE_2D, textura);
            // Esto es porque durante la creacion de la textura y la carga de onload pudo haber pasado algo de tiempo
            // Otras partes del programa podrian haber vinculado otras texturas
            // Es solo por si acaso

        // Invertimos la imagen
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            // Las coordenadas UV no pueden coincidir, si no hacemos esto la textura se carga al reves
        
        // Lo mismo que arriba, solo que ahora en lugar de cargar un fondo en blanco cargamos la textura
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            gl.RGBA, gl.UNSIGNED_BYTE,
            imagen
        );

        // Generamos los mipmaps
        gl.generateMipmap(gl.TEXTURE_2D);

        // Establecemos algunos ajustes
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.LINEAR
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.REPEAT
        );

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.CLAMP_TO_EDGE
        );
    };

    imagen.src = url;
    return textura;
}

const texturaSol = cargarTextura("texture/sol.jpg");
const texturaTierra = cargarTextura("texture/tierra.jpg");


const modelMatrixLocation = gl.getUniformLocation(program,"uModelMatrix");
const viewMatrixLocation = gl.getUniformLocation(program,"uViewMatrix");
const projectionMatrixLocation = gl.getUniformLocation(program,"uProjectionMatrix");
const lightDirectionLocation = gl.getUniformLocation(program,"uLightDirection");
const textureLoc = gl.getUniformLocation(program, "uTexture");
const emissiveLoc = gl.getUniformLocation(program, "uEmissive");


const eye = [0.0, 3.0, 9.0];        
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

const lightDirection = normalizarVec3([-1.0, -0.5, -1.0]);
gl.uniform3fv(lightDirectionLocation, lightDirection);

gl.uniform1i(textureLoc, 0);

// Funcion para dibujar un cuerpo celeste
function dibujarCuerpo(textura, modelMatrix, emisivo) {
    // ¿Recuerdas lo que haciamos al final de la funcion render() en pasos anteriores?
    // Esto es exactamente lo mismo

    // Activamos la textura
    gl.activeTexture(gl.TEXTURE0);
    // Volvemos a vinvular la textura
    gl.bindTexture(gl.TEXTURE_2D, textura);

    gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);
    gl.uniform1i(emissiveLoc, emisivo ? 1 : 0);

    gl.drawElements(
        gl.TRIANGLES,
        esfera.indices.length,
        gl.UNSIGNED_SHORT,
        0
    );
}


let tiempoAnterior = 0;
let giroSol = 0;
let giroTierra = 0;

function render(ms) {
    const tiempo = ms * 0.001;
    const dt = tiempo - tiempoAnterior;
    tiempoAnterior = tiempo;

    giroSol += 0.10 * dt;
    giroTierra += 0.45 * dt;

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    gl.bindVertexArray(vao);

    const modelSol =
        multiplicarMat4(
            matrizRotacionY(giroSol),
            matrizEscala4(1.35, 1.35, 1.35)
        );

    dibujarCuerpo(
        texturaSol,
        modelSol,
        true
    );

    const modelTierra =
        multiplicarMat4(
            matrizTraslacion4(3.0, 0.0, 0.0),
            multiplicarMat4(
                matrizRotacionY(giroTierra),
                matrizEscala4(0.55, 0.55, 0.55)
            )
        );

    dibujarCuerpo(
        texturaTierra,
        modelTierra,
        false
    );

    requestAnimationFrame(render);
}

requestAnimationFrame(render);