// Paso 9: Texturas y Coordenadas UV
// Dejamos de usar un color base y pasamos a usar una textura a traves de coordenadas UV

// ¿Que son las coordenadas UV?
// Son un sistema de coordenadas bidimensional que se utiliza para mapear texturas en superficies tridimensionales
// Cada vertice viene acompañado de un par de coordenadas (u,v) que indican en que parte de una textura 2D se encuentra el vertice 
    // u -> posicion horizontal
    // v -> posicion vertical

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
            vertices.push(nx, ny, nz);

            // Coordenadas UV
            // Invertimos V para que la textura se lea de arriba hacia abajo.
            vertices.push(u, 1.0 - v);
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

// "in": Datos que entran fuera del shader, desde el buffer de vertices
in vec3 aPosition; // Posicion del vertice (x,y,z)
in vec3 aNormal;   // Normal del vertice (nx,ny,nz)
in vec2 aTexCoord; // Coordenadas UV del vertice (u,v)

// "uniform": Datos que entran al shader desde la CPU, pero que son constantes para todos los vertices
uniform mat4 uModelMatrix;      // Matriz de transformacion del modelo
uniform mat4 uViewMatrix;       // Matriz de transformacion de la camara
uniform mat4 uProjectionMatrix; // Matriz de proyeccion de la camara

// "out": Datos que salen del shader y entran al siguiente shader (fragment shader)
out vec3 vNormal;   // Normal interpolada para el fragment shader
out vec2 vTexCoord; // Coordenadas UV interpoladas para el fragment shader

void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        // gl_Position: Contiene la posicion que usara WebGL para dibujar el verticce en la pantalla 
    
    // Para este paso usamos solamente rotaciones y traslaciones
    vNormal = mat3(uModelMatrix) * aNormal;
        // Por ello transformamos la normal con la parte 3x3 de Model

    // Coordenadas UV permanece sin cambios
    vTexCoord = aTexCoord;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float; // Establece la precision de los floats a alta

// Recibe la normal y las coordenadas UV interpoladas desde el vertex shader
in vec3 vNormal;
in vec2 vTexCoord;

uniform vec3 uLightDirection;   // Direccion de la luz (normalizada)
uniform float uAmbientStrength; // Nivel de iluminacion ambiental
uniform sampler2D uTexture;     // Referencia a la textura que se aplicara al modelo

// Salida final del shader
out vec4 outColor;
    // Este es el color que tendra el fragmento (pixel) que se esta dibujando en la pantalla

void main() {
    // Normalizamos ya que solo queremos la direccion
    vec3 N = normalize(vNormal);            // Normal del vertice
    vec3 L = normalize(-uLightDirection);   // Normal de la luz (invertida para que apunte hacia la superficie)

    // Iluminacion difusa
    float diffuse = max(dot(N, L), 0.0);
        // dot(N,L): Producto punto
        // max(): Valor minimo sera 0, evitamos valores negativos

    // Combinamos las luces para determinar la intensidad de la iluminacion
    float illumination =
        uAmbientStrength +
        (1.0 - uAmbientStrength) * diffuse;

    // Aqui consultamos a la textura asignada

    // texture() hace la consulta...
    vec4 texel = texture(uTexture, vTexCoord);
        // uTexture: Representa nuestra textura
        // vTexCoord: Corrdenadas UV
        // Basicamente estamoss preguntando "que color de la textura corresponde a esta coordenada UV"
        // El resultado es un vec4 (r,g,b,a)

    // Obtenemos el color final junto a la iluminacion (combinamos iluminacion + textura)
    vec3 finalColor = texel.rgb * illumination;

    // Color final del fragmento
    outColor = vec4(finalColor, texel.a);
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

// x y z | nx ny nz | u v = 8 floats
const stride=8*Float32Array.BYTES_PER_ELEMENT;

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
gl.vertexAttribPointer(
    texCoordLocation,
    2,
    gl.FLOAT,
    false,
    stride,
    6*Float32Array.BYTES_PER_ELEMENT
);

// Indices
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);


// Crear textura procedural
function crearTexturaProcedural(gl){
    // Tamaño de la textura
    const ancho = 8;
    const alto = 4;

    // Reservamos espacio donde guardaremos los colores de la textura
    const datos = new Uint8Array(ancho * alto * 4);
        // Aparte del ancho y largo, x4 debido a (r,g,b,a)

    // Formamos la textura
    for(let y=0;y<alto;y++){
        for(let x=0;x<ancho;x++){
            // Convierte (x,y) en el indice dentro del array
            const i=(y*ancho+x)*4;

            // Genera el patron tipo ajedrez
            const bloque = (x+y)%2;
                // Bloque tendra solo dos valor, 1 y 0

            if(bloque===0){
                // Amarillo / naranja
                datos[i+0]=255;
                datos[i+1]=150;
                datos[i+2]=20;
                datos[i+3]=255;
            } else {
                // Azul oscuro
                datos[i+0]=20;
                datos[i+1]=70;
                datos[i+2]=180;
                datos[i+3]=255;
            }
        }
    }

    // Hasta ahora solo tenemos un array de 128 valores RGBA, no una textura

    // Creamos la textura
    const textura = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textura);
        // Cuando trabajemos con "TEXTURE_2D", trabajamos con "textura"

    // Crea y define el contenido de la textura
    gl.texImage2D(
        gl.TEXTURE_2D,      // Trabajamos con una textura en 2D 
        0,                  // Nivel del mipmap, no esatmos trabajando con esto
        gl.RGBA,            // Formato interno a usar (RGBA)
        ancho,              // Ancho 
        alto,               // Alto
        0,                  // border, en WebGL debe ser 0
        gl.RGBA,            // Formato de datos que entregamos
        gl.UNSIGNED_BYTE,   // Como estan representados esos datos
        datos               // Arreglo que construimos
    );

    // Configuraciones:

    // Filtrado cuando la textura se hace más pequeña
        // ¿Cómo calculamos el color cuando la textura aparece más pequeña que su tamaño original?
    gl.texParameteri(
        gl.TEXTURE_2D,          // Nuestra textura
        gl.TEXTURE_MIN_FILTER,  // Caso, osea minimo
        gl.LINEAR               // Solucion, interpola los colores vecinos
    );

    // Filtrado cuando la textura se hace más grande
        // ¿Cómo calculamos el color cuando la textura aparece más grande que su tamaño original?
        // Misma solucion que arriba
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        gl.LINEAR
    );

    // Que pasas si nuestras coordenadas UV estan fuera de 0 y 1
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_S,  // Direccion horizontal (u)
        gl.REPEAT           // Textura se repite 
    );

    // Lo mismo que arriba
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_T,  // Direccion horizontal (v)
        gl.CLAMP_TO_EDGE    // Usamos el color del borde en lugar de repetir
    );

    // Regresamos la textura
    return textura;
}

const texturaPlaneta = crearTexturaProcedural(gl);



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
const lightDirectionLocation = gl.getUniformLocation(program, "uLightDirection");

// Añadimos
const ambientStrengthLocation = gl.getUniformLocation(program, "uAmbientStrength");
const textureLocation = gl.getUniformLocation(program, "uTexture");


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


// Dirección desde la superficie hacia la luz
const lightDirection = normalizarVec3([-1.0, -0.5, -1.0]);
gl.uniform3fv(lightDirectionLocation, lightDirection);

gl.uniform1f(
    ambientStrengthLocation,
    0.20
);

// Asociamos la textura al sampler2D en el shader
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texturaPlaneta);

// uTexture utilizará la unidad 0.
gl.uniform1i(textureLocation, 0);


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