export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transcripcion } = req.body;
    if (!transcripcion) return res.status(400).json({ error: 'Transcripción requerida' });

    const SYSTEM_PROMPT = `Eres un evaluador experto de llamadas de ventas de créditos personales de Banco MultiMoney.

Analiza la transcripción completa y genera un análisis estructurado en formato JSON con exactamente esta estructura:

{
  "agente": "nombre del agente extraído de la transcripción",
  "cliente": "nombre del cliente extraído de la transcripción",
  "duracion": "duración estimada en formato ~X:XX min",
  "tipo": "Llamada de oferta de crédito (Power Dialer)",
  "resumen": "Párrafo directo de 2-3 oraciones enfocado en la llamada, con cita textual del cliente si aplica. Describe el patrón dominante.",
  "evaluaciones": {
    "resultado_llamada": "una de: Acepta Venta / No acepta tasa alta / No acepta monto bajo / No acepta no lo necesita / No acepta desembolso alto / No acepta tiene otras deudas / No acepta / No aplica / Seguimiento / Volver a llamar / Post venta",
    "oferta_wow": "una de: Oferta con cierre / Oferta sin cierre / Presentación incompleta / No hay oferta clara / No aplica",
    "comportamiento_negativa": "una de: Sondeo de negativa / Argumenta la negativa / presenta la oferta sin sondear la negativa / Aceptó la negativa y no hay intención de venta / No aplica",
    "sondeo_negativa": "una de: Sondeo de la negativa / evasión de la negativa / sin sondeo de la negativa / Sin negativa registrada / No aplica",
    "senales_cierre": "una de: Conexión con necesidad del cliente / Manejo de objeción que desbloqueó la conversación / Cierre solicitado explícitamente / Cliente con necesidad preexistente clara / No determinable",
    "motivo_no_acepta": "una de: Sin negociación / se maneja la objeción / Busca el recontacto"
  },
  "puntajes": {
    "introduccion": { "peso": 0.5, "puntaje": 0, "obtenido": 0 },
    "escucha_activa": { "peso": 1.0, "puntaje": 0, "obtenido": 0 },
    "sondeo": { "peso": 1.5, "puntaje": 0, "obtenido": 0 },
    "negociacion": { "peso": 1.5, "puntaje": 0, "obtenido": 0 },
    "cierre": { "peso": 0.5, "puntaje": 0, "obtenido": 0 },
    "total": 0,
    "clasificacion": "una de: No cumple expectativas / Cumple expectativas / Supera expectativas",
    "evaluacion_general": "una de: supera expectativas / cumple expectativas / No cumple expectativas / Inaceptable / No evaluable"
  },
  "tono_agente": "descripción breve",
  "tono_cliente": "descripción breve",
  "resultado_emoji": "❌ o ✅",
  "resultado_texto": "descripción del resultado",
  "fortalezas": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "oportunidades": [
    {
      "prioridad": "alta o media",
      "titulo": "Título corto",
      "descripcion": "Descripción del problema observado",
      "ejemplo_bien": "ejemplo concreto de lo que debió decir el asesor"
    }
  ],
  "plan_accion": [
    {
      "prioridad": "ALTA o MEDIA o BAJA",
      "titulo": "Título del área de mejora (puntaje/5)",
      "que_trabajar": "descripción de qué trabajar",
      "como_trabajarlo": ["acción 1", "acción 2", "acción 3", "acción 4"],
      "para_que": "explicación del impacto en resultados"
    }
  ]
}

FÓRMULA DE CÁLCULO — MUY IMPORTANTE:
El campo "obtenido" se calcula: obtenido = (puntaje / 5) × peso
Ejemplos correctos:
• introduccion: puntaje=3, peso=0.5 → obtenido = (3/5)×0.5 = 0.30
• escucha_activa: puntaje=4, peso=1.0 → obtenido = (4/5)×1.0 = 0.80
• sondeo: puntaje=2, peso=1.5 → obtenido = (2/5)×1.5 = 0.60
• negociacion: puntaje=2, peso=1.5 → obtenido = (2/5)×1.5 = 0.60
• cierre: puntaje=1, peso=0.5 → obtenido = (1/5)×0.5 = 0.10
El campo "total" es la suma de todos los "obtenido". Máximo posible: 5.0

ESCALA DE PUNTUACIÓN:
- 1.00 a 2.99 = No cumple expectativas
- 3.00 a 3.99 = Cumple expectativas
- 4.00 a 5.00 = Supera expectativas

Devuelve ÚNICAMENTE el JSON válido, sin texto adicional, sin markdown, sin backticks.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Analiza esta transcripción de llamada:\n\n${transcripcion}` }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error de Claude API');

    const texto = data.content.map(i => i.text || '').join('');
    const clean = texto.replace(/```json|```/g, '').trim();
    const analisis = JSON.parse(clean);

    return res.status(200).json(analisis);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
