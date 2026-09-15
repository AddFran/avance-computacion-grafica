// En el HTML:
//  <canvas> se trata de un elemento que permite dibujar graficos mediante JS 
//  Es el lienzo en blanco donde se renderizaran los graficos 3D usando WebGL


// Obtiene del documento HTML el elemento <canvas> cuyo id es "glCanvas"
const canvas = document.getElementById("glCanvas"); 
    // La variable "canvas" es una referencia al elemento con el id "glCanvas"
    // Buscamos en todo el documento la variable con el id "glCanvas"
    // "canvas" contiene el lienzo donde dibujaremos las graficos usando WebGL 2

// Solicita al navegador un contexto de renderizado WebGL 2 para poder dibujar gráficos 3D.
const gl = canvas.getContext("webgl2");
    // Un contexto es un conjunto de funciones y propiedades que nos permiten dibujar en el canvas
    // Aqui solicitamos un contexto preparado para trabajar con WebGL 2
    // Con getContext("webgl2") le decimos al navegador que usaremos WebGL 2 para renderizar graficos en el canvas
        // Aparte de webgl2 podemos usar otros tipos de contexto como 2d, webgl, 3d, etc
    // Basicamente, "gl" es el objeto que nos permitira interactuar con WebGL 2 y dibujar en el canvas

// Verifica si el navegador soporta WebGL2 y si el contexto fue creado correctamente
if (!gl) {
    // Si no hay soporte para WebGL2, "gl" almacena null, por ende se detiene la ejecución mostrando un error
    throw new Error("WebGL2 no está disponible en este navegador.");
}

// Define el área del canvas donde WebGL dibujara
// Los parámetros son: x, y, ancho y alto del viewport
gl.viewport(0, 0, canvas.width, canvas.height);
    // El viewport es el area rectangular del canvas donde se rederizaran los graficos

// Aqui entramos en territorio del framebuffer (color buffer, depth buffer y stencil buffer)
gl.clearColor(0.0, 0.0, 0.0, 1.0); // Indicamos el color con el cual limpiaremos el color buffer (ojo que todavia no se limpia)
gl.clear(gl.COLOR_BUFFER_BIT); // Limpia el color buffer con el color previamente definido en clearColor



// En este punto, el canvas se ha limpiado y ahora esta listo para dibujar graficos usando WebGL 2


// Definimos los vertices (x,y) de nuestra figura (un triangulo) en un arreglo del tipo Float32Array
// Estos vectores estan normalizados, cada valor esta en un valor entre -1 (limite izquierdo e inferior) y 1 (limite derecho y superior)
// Este sistema de vectores NDC (Normalized Device Coordinates) es el usado por Vertex Shader
const vertices = new Float32Array([
    0.0,  0.7,   
    -0.7, -0.7,  
    0.7, -0.7  
]);
// Extra, estos datos deben ser flotantes de 32 bits porque la GPU trabaja con este tipo de datos

// Creamos el vertex buffer (buffer de vertices) y lo llenamos con los datos de los vertices que definimos antes
const vertexBuffer = gl.createBuffer();
    // No hay datos, solo es un buffer vacio, solo reservamos espacio en la GPU
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Con bindBuffer le decimos a WebGL que cuando trqabajemos con ARRAY_BUFFER usaremos el buffer que acabamos de crear (vertexBuffer)
    // Toda operacion que hagamos con ARRAY_BUFFER afectara a vertexBuffer
    // ARRAY_BUFFER es un tipo de buffer que almacena datos de vertices (posiciones, colores, normales, etc)
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    // Aqui llenamos nuestro ARRAY_BUFFER (vertexBuffer) con los datos del array que definimos antes (vertices)
    // STATIC_DRAW indica que los datos (vertices en este caso) nunca cambiaran
        // DYNAMIC_DRAW indica que los datos cambiaran ocasionalmente
        // STREAM_DRAW indica que los datos cambiaran constantemente


// IMPORTANTE: Los shaders son programas que se ejecutan en la GPU, no en la CPU. Por eso se escriben en GLSL y no en JS
    // Su trabajo es procesar datos graficos de forma masiva y en paralelo

// Aqui ya aparece GLSL (OpenGL Shading Language), el lenguaje de shaders que usaremos para programar la GPU
// Es aqui, basicamente pasamos de tener vectores en 2D a tener vectores en 4D que es lo que la GPU necesita para trabajar
const vertexShaderSource = `#version 300 es
// Recibe la posición de cada vértice desde el programa JavaScript.
in vec2 aPosition;
    // Como estamos trabajando con tres vertices, aPosition recibira 3 veces los valores de los vertice que definimos antes (0.0, 0.7), (-0.7, -0.7) y (0.7, -0.7)

void main() {
    // Convierte la posición 2D en un vector 4D requerido por WebGL.
    gl_Position = vec4(aPosition, 0.0, 1.0);
        // gl_Position es una variable especial que indica la posición final del vértice en el espacio de recorte (clip space)
        // El espacio de recorte es un sistema de coordenadas normalizado donde los valores van de -1 a 1 en x, y, y z
        // Es un vector de 4 dimensiones donde x, y y z son las coordenadas y w es un valor de homogeneización que normalmente se establece en 1.0
}
`;

// Con los vectices ya definimos, ahora definimos el fragment shader que nos permitira darle color a nuestro triangulo
// A diferencia del otro, este se ejecuta por cada pixel (fragmento... fragment xd) que se renderiza en la pantalla
const fragmentShaderSource = `#version 300 es
// Define la precisión de los cálculos en punto flotante
precision highp float;

// Variable de salida con el color final del fragmento
out vec4 outColor;

void main() {
    // Asigna un color amarillo/anaranjado opaco.
    outColor = vec4(1.0, 0.75, 0.1, 1.0);
}
`;


// Funcion que crea un shader (vertex o fragment) a partir del código fuente proporcionado
// Basicamente, JS le pasa a la GPU el codigo fuente del shader y la GPU lo compila para poder usarlo
function crearShader(gl, tipo, codigoFuente) {
    const shader = gl.createShader(tipo);   // Crea un shader vacio del tipo especificado (vertex o fragment)
    gl.shaderSource(shader, codigoFuente);  // Le asigna el codigo fuente al shader
    gl.compileShader(shader);               // La GPU compila el shader, convierte el codigo en un programa ejecutable que la GPU puede usar

    // Verifica si la compilacion fue exitosa
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Error al compilar shader:\n" + error); // Bastante util para depurar
    }
    return shader;
}

// Usamos la funcion crearShader para crear tanto el vertex shader como el fragment shader a partir del codigo fuente que definimos antes
const vertexShader = crearShader(gl,gl.VERTEX_SHADER,vertexShaderSource);
const fragmentShader = crearShader(gl,gl.FRAGMENT_SHADER,fragmentShaderSource);

// Creamos el programa de shaders
const program = gl.createProgram();
gl.attachShader(program, vertexShader);     // Enlazamos el vertex shader al programa
gl.attachShader(program, fragmentShader);   // Enlazamos el fragment shader al programa
gl.linkProgram(program);                    // La GPU enlaza los shaders en un programa ejecutable que puede ser usado para renderizar

// Verificamos si el programa se enlaza correctamente
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
        "Error al enlazar programa:\n" + gl.getProgramInfoLog(program)
    );
}



// VAO (Verfex Array Object) es un objeto que almacena el estado de los atributos de los vertices
const vao = gl.createVertexArray();
    // No guarda vertices (como el vertex buffer), guarda la configuracion de como deben ser interpretados los vertices

gl.bindVertexArray(vao);
    // Con bindVertexArray le decimos a WebGL que cuando trabajemos con VAO usaremos el VAO que acabamos de crear (vao)
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Con bindBuffer le decimos a WebGL que cuando trabajemos con ARRAY_BUFFER usaremos el buffer que acabamos de crear (vertexBuffer)

const positionLocation = gl.getAttribLocation(program, "aPosition");
    // Buscamos la variable "aPosition" en el vertex shader y obtenemos su ubicacion para poder pasarle los datos de los vertices desde JS
    // getAttribLocation() traduce el nombre "aPosition" al índice interno que usa la GPU

gl.enableVertexAttribArray(positionLocation); // Habilitamos el atributo de posicion para que la GPU pueda usarlo

// Indicamos a la GPU como debe interpretar los datos del buffer de vertices para el atributo de posicion
gl.vertexAttribPointer(
    positionLocation, // Indicamos el atributo de posicion que estamos configurando (la variable aPosition leera estos datos)
    2,                // Tamanio del atributo, cada vertice tiene 2 componentes (x,y)
    gl.FLOAT,         // Cada componente es un float de 32 bits
    false,            // Normalizacion
    0,                // Stride (espaciado entre vertices), 0 significa que los vertices estan contiguos
    0                 // Offset (desplazamiento desde el inicio del buffer), 0 significa que empezamos desde el primer vertice
);

gl.useProgram(program);     // Le decimos a WebGL que use el programa de shaders que acabamos de crear para renderizar
gl.bindVertexArray(vao);    // Le decimos a WebGL que use el VAO que acabamos de crear para renderizar
    // Porque aparece dos veces
    // Antes lo configuramos, ahora le decimos que lo use para renderizar

// Finalmente, dibujamos el triangulo usando los datos de los vertices y el programa de shaders
gl.drawArrays(
    gl.TRIANGLES, // Modo de dibujo, en este caso dibujaremos triangulos
    0,            // Indice inicial, empezamos desde el primer vertice
    3             // Numero de vertices a dibujar, en este caso 3 vertices forman un triangulo
);