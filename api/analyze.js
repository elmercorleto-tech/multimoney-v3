javascriptexport default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { transcripcion } = req.body;
    if (!transcripcion) return res.status(400).json({ error: 'Transcripcion requerida' });
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
        system: `Eres un evaluador experto de llamadas de ventas de creditos personales de Banco MultiMoney. Analiza la transcripcion completa y genera un analisis estructurado en formato JSON con exactamente esta estructura: {"agente":"nombre del agente","cliente":"nombre del cliente","duracion":"duracion estimada ~X:XX min","tipo":"Llamada de oferta de credito (Power Dialer)","resumen":"Parrafo directo 2-3 oraciones enfocado en la llamada","evaluaciones":{"resultado_llamada":"una de: Acepta Venta / No acepta tasa alta / No acepta monto bajo / No acepta no lo necesita / No acepta desembolso alto / No acepta tiene otras deudas / No acepta / No aplica / Seguimiento / Volver a llamar / Post venta","oferta_wow":"una de: Oferta con cierre / Oferta sin cierre / Presentacion incompleta / No hay oferta clara / No aplica","comportamiento_negativa":"una de: Sondeo de negativa / Argumenta la negativa / presenta la oferta sin sondear la negativa / Acepto la negativa y no hay intencion de venta / No aplica","sondeo_negativa":"una de: Sondeo de la negativa / evasion de la negativa / sin sondeo de la negativa / Sin negativa registrada / No aplica","senales_cierre":"una de: Conexion con necesidad del cliente / Manejo de objecion que desbloqueo la conversacion / Cierre solicitado explicitamente / Cliente con necesidad preexistente clara / No determinable","motivo_no_acepta":"una de: Sin negociacion / se maneja la objecion / Busca el recontacto"},"puntajes":{"introduccion":{"peso":0.5,"puntaje":0,"obtenido":0},"escucha_activa":{"peso":1.0,"puntaje":0,"obtenido":0},"sondeo":{"peso":1.5,"puntaje":0,"obtenido":0},"negociacion":{"peso":1.5,"puntaje":0,"obtenido":0},"cierre":{"peso":0.5,"puntaje":0,"obtenido":0},"total":0,"clasificacion":"una de: No cumple expectativas / Cumple expectativas / Supera expectativas","evaluacion_general":"una de: supera expectativas / cumple expectativas / No cumple expectativas / Inaceptable / No evaluable"},"tono_agente":"descripcion breve","tono_cliente":"descripcion breve","resultado_emoji":"emoji","resultado_texto":"descripcion del resultado","fortalezas":["fortaleza 1","fortaleza 2","fortaleza 3"],"oportunidades":[{"prioridad":"alta o media","titulo":"titulo corto","descripcion":"descripcion del problema","ejemplo_bien":"ejemplo de lo que debio decir"}],"plan_accion":[{"prioridad":"ALTA o MEDIA o BAJA","titulo":"titulo del area","que_trabajar":"que trabajar","como_trabajarlo":["accion 1","accion 2","accion 3","accion 4"],"para_que":"impacto en resultados"}]} FORMULA: obtenido=(puntaje/5)*peso. ESCALA: 1-2.99=No cumple, 3-3.99=Cumple, 4-5=Supera. Devuelve UNICAMENTE el JSON valido sin texto adicional.`,
        messages: [{ role: 'user', content: `Analiza esta transcripcion:\n\n${transcripcion}` }]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error Claude API');
    const texto = data.content.map(i => i.text || '').join('');
    const clean = texto.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
