const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Usamos la versión con promesas
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// --- CONFIGURACIÓN MYSQL ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dungeonmaster2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- LÓGICA IA (GROQ) ---
async function llamarGroq(mensajes, modelo) {
    const apiKey = process.env.GROQ_API_KEY;
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelo,
                messages: mensajes,
                temperature: 0.7,
                max_tokens: 800
            })
        });

        const data = await response.json();
        if (data.error) return `[Error Groq]: ${data.error.message}`;
        return data.choices?.[0]?.message?.content || "[Sin respuesta]";
    } catch (error) {
        console.error("Error API:", error);
        return "El DM está inconsciente (Error de Red).";
    }
}

// --- RUTAS API ---

// 1. Crear Nueva Partida
app.post('/api/nueva-partida', async (req, res) => {
    const { systemPrompt } = req.body;
    const id = Date.now().toString(); // ID simple basado en timestamp
    
    try {
        await pool.query(
            'INSERT INTO partidas (id, system_prompt, modelo_1, modelo_2) VALUES (?, ?, ?, ?)',
            [id, systemPrompt, process.env.MODEL_A, process.env.MODEL_B]
        );
        res.json({ success: true, partidaId: id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear partida en BD' });
    }
});

// 2. Listar Partidas Anteriores (NUEVO)
app.get('/api/partidas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, fecha, system_prompt FROM partidas ORDER BY fecha DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener lista' });
    }
});

// 3. Cargar Historial de una Partida (NUEVO)
app.get('/api/historial/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Obtener datos de la partida
        const [partidas] = await pool.query('SELECT * FROM partidas WHERE id = ?', [id]);
        if (partidas.length === 0) return res.status(404).json({ error: 'Partida no encontrada' });

        // Obtener turnos
        const [turnos] = await pool.query('SELECT * FROM turnos WHERE partida_id = ? ORDER BY numero_turno ASC', [id]);

        res.json({
            meta: partidas[0],
            turnos: turnos
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar historial' });
    }
});

// 4. Jugar Turno
app.post('/api/turno', async (req, res) => {
    const { partidaId, accionJugador } = req.body;

    try {
        // A. Recuperar contexto de la BD para reconstruir la memoria
        const [partidaRows] = await pool.query('SELECT system_prompt FROM partidas WHERE id = ?', [partidaId]);
        if (partidaRows.length === 0) return res.status(404).json({ error: 'Partida no existe' });
        
        const systemPrompt = partidaRows[0].system_prompt;
        const [turnosPrevios] = await pool.query('SELECT * FROM turnos WHERE partida_id = ? ORDER BY numero_turno ASC', [partidaId]);

        // B. Construir arrays de mensajes para Groq
        // Empezamos con el Prompt del Sistema
        let historialIA1 = [{ role: "system", content: systemPrompt }];
        let historialIA2 = [{ role: "system", content: systemPrompt }];

        // Reconstruimos la conversación turno a turno
        turnosPrevios.forEach(t => {
            historialIA1.push({ role: "user", content: t.accion_usuario });
            historialIA1.push({ role: "assistant", content: t.respuesta_ia1 });

            historialIA2.push({ role: "user", content: t.accion_usuario });
            historialIA2.push({ role: "assistant", content: t.respuesta_ia2 });
        });

        // Añadimos la NUEVA acción del usuario
        historialIA1.push({ role: "user", content: accionJugador });
        historialIA2.push({ role: "user", content: accionJugador });

        // C. Llamar a las IAs
        const [resp1, resp2] = await Promise.all([
            llamarGroq(historialIA1, process.env.MODEL_A),
            llamarGroq(historialIA2, process.env.MODEL_B)
        ]);

        // D. Guardar el nuevo turno en BD
        const nuevoTurnoNum = turnosPrevios.length + 1;
        await pool.query(
            'INSERT INTO turnos (partida_id, numero_turno, accion_usuario, respuesta_ia1, respuesta_ia2) VALUES (?, ?, ?, ?, ?)',
            [partidaId, nuevoTurnoNum, accionJugador, resp1, resp2]
        );

        res.json({ ia1: resp1, ia2: resp2 });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error procesando turno' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor D&D MySQL corriendo en http://localhost:${PORT}`);
});