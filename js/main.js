// Obtiene del documento HTML el elemento <canvas> cuyo id es "glCanvas"
const canvas = document.getElementById("glCanvas"); 
    // La variable "canvas" es una referencia al elemento con el id "glCanvas"
    // Buscamos en todo el documento la variable con el id "glCanvas"
    // "canvas" contiene el documento HTML completo

// Solicita al navegador un contexto de renderizado WebGL 2 para poder dibujar gráficos 3D.
const gl = canvas.getContext("webgl2");
    // Un contexto es un conjunto de funciones y propiedades que nos permiten dibujar en el canvas (tmb podemos)
    // Aqui solicitamos un contexto preparado para trabajar con WebGL 2
    

// Verifica si el navegador soporta WebGL2 y si el contexto fue creado correctamente
if (!gl) {
    // Si no hay soporte para WebGL2, detiene la ejecución mostrando un error
    throw new Error("WebGL2 no está disponible en este navegador.");
}

// Define el área del canvas donde WebGL dibujará
// Los parámetros son: x, y, ancho y alto del viewport
gl.viewport(0, 0, canvas.width, canvas.height);

// Establece el color con el que se limpiará el canvas.
// Formato RGBA: rojo, verde, azul y alfa (transparencia).
// Aquí se usa negro completamente opaco.
gl.clearColor(0.7, 0.0, 0.0, 1.0);

// Limpia el buffer de color del canvas usando el color definido anteriormente.
// Como el color es negro, el canvas se pinta completamente de negro.
gl.clear(gl.COLOR_BUFFER_BIT);