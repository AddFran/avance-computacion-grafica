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
    // Un contexto es un conjunto de funciones y propiedades que nos permiten dibujar en el canvas (tmb podemos)
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