D&D: Batalla de IAs (Groq + MySQL)

Este proyecto es una aplicación web de Master de Mazmorras (Dungeon Master o DM) que utiliza dos modelos de lenguaje grandes (LLMs) de Groq para gestionar una partida de rol en tiempo real. La característica clave es la persistencia: todas las partidas y turnos se guardan en una base de datos MySQL, permitiendo al usuario retomar cualquier aventura donde la dejó.

Tecnologías Utilizadas

Frontend: HTML, Tailwind CSS y JavaScript.

Backend: Node.js (Express).

Base de Datos: MySQL (gestionada a través de XAMPP o similar).

Integración de IA: API de Groq para la generación de texto.

Librerías de Node.js: express, cors, dotenv, mysql2.

Características

Doble DM: Cada acción del jugador es respondida por dos IAs (Model A y Model B) simultáneamente para comparar sus estilos, velocidad y profundidad.

Persistencia de Datos: El historial completo de la conversación se guarda en MySQL.

Recuperación de Partidas: Los LLMs son capaces de recuperar el contexto completo de una partida guardada y continuar la historia.

Configuración Simple: Uso de un archivo .env para gestionar claves y configuración de modelos.

 Configuración del Entorno

1. Instalación de Node.js y Librerías

Asegúrate de tener Node.js instalado. Luego, instala las dependencias necesarias en la carpeta de tu proyecto:

npm install express cors dotenv mysql2


2. Configuración de la Base de Datos (MySQL)

Este proyecto asume que estás utilizando XAMPP y que tienes una base de datos llamada dungeonmaster2.

Inicia XAMPP: Asegúrate de que los módulos Apache y MySQL estén corriendo.

Accede a phpMyAdmin: (Normalmente http://localhost/phpmyadmin).

Crea la Base de Datos: Si aún no existe, crea una base de datos llamada dungeonmaster2.

Crea las Tablas: Ejecuta el siguiente script SQL para crear las tablas partidas y turnos:

USE dungeonmaster2;

-- Tabla para guardar la configuración de la partida
CREATE TABLE IF NOT EXISTS partidas (
    id VARCHAR(50) PRIMARY KEY,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    system_prompt TEXT NOT NULL,
    modelo_1 VARCHAR(50),
    modelo_2 VARCHAR(50)
);

-- Tabla para guardar cada interacción (Turno)
CREATE TABLE IF NOT EXISTS turnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id VARCHAR(50),
    numero_turno INT,
    accion_usuario TEXT,
    respuesta_ia1 TEXT,
    respuesta_ia2 TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
);


3. Archivo de Variables de Entorno (.env)

Crea un archivo llamado .env en la raíz de tu proyecto y complétalo con tus claves y configuraciones.

# Configuración del Servidor
PORT=3000

# API Key de Groq
GROQ_API_KEY=gsk_...

# Modelos a comparar
MODEL_A=llama-3.1-8b-instant
MODEL_B=llama-3.3-70b-versatile

# Configuración MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=dungeonmaster2


Ejecución del Proyecto

Ejecuta el Backend: Abre tu terminal en la carpeta del proyecto y ejecuta el servidor Node.js:

node server.js


Deberías ver el mensaje: Servidor D&D MySQL corriendo en http://localhost:3000.

Accede al Frontend: Abre tu navegador y navega a:

http://localhost:3000


Aquí podrás iniciar nuevas partidas o cargar aventuras guardadas previamente desde la base de datos.