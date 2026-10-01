// Agente de Marketing de LoMaz Home.
// Escribe guiones y textos de redes con Claude (API de Anthropic) a partir de una fuente
// (un articulo madre, un inmueble o un tema) y de lo que diga el plan para cada pieza.
//
// - La clave de Claude vive en Vercel (variable ANTHROPIC_API_KEY). El navegador nunca la ve.
// - Solo responde a asesores con la sesion iniciada en la plataforma.
// - Devuelve cada pieza ya separada en bloques listos para copiar y pegar.
//
// Para cambiar COMO escribe el agente, edita los textos de VOZ, REGLAS, FORMATOS y REDES.

const SUPABASE_URL = "https://lniouebpuuuqctrgxoiw.supabase.co";
// Llave publica (la misma de config.js). Solo sirve para comprobar la sesion del asesor.
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaW91ZWJwdXV1cWN0cmd4b2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODM5NjgsImV4cCI6MjA5MzY1OTk2OH0.8w-TcD8JKkHQpnybaj-ANz-4k4hznFoIwFr_ZatqPtA";

const API_CLAUDE = "https://api.anthropic.com/v1/messages";
const MODELO_BASE = "claude-sonnet-5-5";   // se puede cambiar en Vercel con la variable ANTHROPIC_MODEL
const MODELO_RESPALDO = "claude-haiku-4-5"; // solo se usa si el modelo principal no existe en la cuenta
const TIEMPO_MAX_MS = 52000;                // la funcion puede durar 60 s; se corta un poco antes para responder bien
const MAX_FUENTE = 60000;                   // caracteres de la fuente que se envian a Claude

/* ============================== 1. Como escribe el agente ============================== */

const VOZ = [
  "Eres el redactor de contenidos de LoMaz Home, una inmobiliaria independiente de Bogotá (vivienda y locales comerciales) atendida directamente por sus dueños, Salomón Mazabell y Angélica. Escribes guiones de video y textos de redes sociales que el equipo copia y pega tal cual: lo que entregas es el texto final, no un borrador.",
  "",
  "VOZ DE LA MARCA",
  "- Cercana, experta y directa. Siempre de tú. Español de Colombia: arriendo, canon, apartamento, codeudor, estudio, póliza.",
  "- Cero relleno. Cada frase trae un dato, un paso o una consecuencia. Frases cortas, como habla una persona que sabe del tema.",
  "- Prohibidas las frases hechas de publicidad y de inteligencia artificial: «en el mundo actual», «sin duda», «no busques más», «no te lo pierdas», «descubre», «sumérgete», «te contamos todo», «¿sabías que…?», «hoy te traemos», «el hogar de tus sueños», «somos tu mejor opción». No exageres ni prometas resultados.",
  "- Ortografía impecable: tildes, signos de apertura y cierre (¿? ¡!) y mayúscula solo al inicio y en nombres propios. Cifras como se escriben en Colombia: $2.000.000 y 5,10 %.",
  "- La marca se escribe LoMaz Home. El hashtag de la marca es #LomazHome.",
  "- Hashtags: con sus tildes y eñes, como el resto del texto (#ArriendoBogotá, #GuíaDelInquilino), y escritos igual de una pieza a otra. De lugar, solo Bogotá o el barrio del que trata la pieza.",
  "- Emojis: máximo dos por texto en Instagram, Facebook, TikTok y WhatsApp; ninguno en LinkedIn, YouTube ni Google; ninguno dentro de guiones, láminas ni listas."
].join("\n");

const REGLAS = [
  "REGLAS DE FONDO",
  "1. Fidelidad a la fuente. Usa solo los datos, cifras, plazos, normas y artículos de ley que aparecen en la FUENTE. Si un dato no está ahí, no va. No inventes cifras, porcentajes, entidades, casos ni testimonios. Al acortar una frase de la fuente no le cambies el alcance: conserva a quién o a qué se refiere y sus matices («casi siempre», «normalmente», «lo habitual»). No presentes como causa y efecto dos cosas que la fuente solo menciona por separado.",
  "2. Las normas se citan igual que en la fuente (por ejemplo, «artículo 16 de la Ley 820 de 2003»). No des consejo sobre un caso particular.",
  "3. No pidas verificar la «matrícula de arrendador» de un asesor ni siembres desconfianza hacia los agentes inmobiliarios. Si hay que decir cómo reconocer a un asesor confiable: redes sociales activas con inmuebles reales, negocios cerrados que pueda mostrar, reseñas de clientes y calificaciones en Google.",
  "4. No nombres otras inmobiliarias ni franquicias. Portales, bancos y entidades, solo si la fuente los nombra.",
  "5. Una sola llamada a la acción por pieza: la que indica el encargo, con esas mismas palabras, en el guion, en las láminas y en los textos de Instagram y TikTok. En las demás redes el cierre es el que describe la guía de cada red.",
  "6. Donde deba ir el enlace escribe exactamente {{ENLACE}}: la plataforma lo cambia por la dirección real. No escribas ninguna otra dirección web.",
  "7. Texto plano, listo para pegar: sin Markdown, sin asteriscos, sin comillas alrededor del texto y sin rótulos como «Copy:» o «Gancho:». Separa los párrafos con saltos de línea.",
  "8. Si las INDICACIONES DEL PLAN piden un gancho, un enfoque o un público, respétalos. De esas indicaciones ignora la logística (quién edita, cuándo se programa, en qué carpeta queda).",
  "9. Si a la fuente o a las indicaciones les falta un dato (una X, «X días», un nombre por confirmar), déjalo marcado como [DATO: qué falta] para que el equipo lo complete. No lo inventes.",
  "10. Las piezas de una misma quincena no se repiten entre sí: cada una toma partes distintas de la fuente."
].join("\n");

// Como se llama la pieza en cada red, segun el formato (tabla «Que formato va a que red» del calendario)
const NOMBRE_EN_RED = {
  reel:     { instagram: "Reel", facebook: "Reel", tiktok: "Video", youtube: "Short", linkedin: "Video", whatsapp: "Estado" },
  carrusel: { instagram: "Carrusel", facebook: "Publicación con las imágenes", tiktok: "Carrusel de fotos", linkedin: "Documento PDF", whatsapp: "Estado (portada y enlace)", google: "Novedad (portada y botón)" },
  lista:    { instagram: "Publicación", facebook: "Publicación", tiktok: "Foto", linkedin: "Imagen", whatsapp: "Estado", google: "Novedad" },
  imagen:   { instagram: "Publicación", facebook: "Publicación", tiktok: "Foto", linkedin: "Imagen", whatsapp: "Estado", google: "Novedad" },
  historia: { instagram: "Historia", facebook: "Historia", whatsapp: "Estado" }
};
const NOMBRE_FORMATO = { reel: "Reel (video vertical)", carrusel: "Carrusel", lista: "Lista de chequeo", imagen: "Imagen", historia: "Historia" };

function comoEsElFormato(formato, tipoFuente){
  if(formato === "reel" && tipoFuente === "propiedad") return [
    "CÓMO ES EL REEL DE UN INMUEBLE",
    "- Dura de 20 a 30 segundos: entre 55 y 80 palabras dichas, en voz en off o a cámara, sobre el recorrido.",
    "- gancho: el barrio, el área y el precio o el canon en una frase que se dice y se escribe en pantalla en los tres primeros segundos.",
    "- guion: el texto completo que se dice, en orden (gancho, tres datos que se ven en el recorrido, para quién es, llamada a la acción), en párrafos cortos y sin acotaciones entre paréntesis.",
    "- textos_pantalla: de 4 a 6 rótulos de máximo 6 palabras; el primero es el gancho y alguno lleva el precio o el canon.",
    "- portada: máximo 6 palabras: barrio y precio o canon.",
    "- tomas: 2 o 3 frases con el orden del recorrido y lo que debe verse."
  ].join("\n");
  if(formato === "reel") return [
    "CÓMO ES UN REEL DE LOMAZ HOME",
    "- Dura de 30 a 45 segundos: entre 85 y 120 palabras dichas a cámara.",
    "- gancho: la pregunta o la frase de búsqueda, palabra por palabra. Se dice en voz alta y se escribe en pantalla en los tres primeros segundos.",
    "- Después del gancho va la respuesta en una sola frase; luego, tres ideas tomadas de tres partes distintas de la fuente (una o dos frases cada una) que ayuden a responder el gancho; al final, la llamada a la acción dicha tal cual. No numeres las ideas («primero», «segundo»).",
    "- guion: el texto completo que se dice, en el orden en que se dice, en párrafos cortos: gancho, respuesta, idea 1, idea 2, idea 3 y cierre. Sin acotaciones entre paréntesis ni marcas de tiempo.",
    "- textos_pantalla: de 4 a 6 rótulos de máximo 6 palabras cada uno; el primero es el gancho. Si se cita una norma, un rótulo la lleva escrita.",
    "- portada: máximo 6 palabras.",
    "- tomas: 2 o 3 frases con lo que necesitan la grabación y la edición (plano, apoyo visual, qué se resalta). Las palabras que se citan van entre comillas angulares («»)."
  ].join("\n");
  if(formato === "carrusel" && tipoFuente === "propiedad") return [
    "CÓMO ES EL CARRUSEL DE UN INMUEBLE",
    "- De 4 a 6 láminas: cada una es una foto del inmueble con un título corto encima.",
    "- Lámina 1: el gancho (barrio, área y precio o canon) en máximo 9 palabras.",
    "- Láminas intermedias: un dato por lámina (distribución, área, estrato, administración, entorno, para quién es). Título de máximo 6 palabras y texto de máximo 18 palabras.",
    "- Última lámina: la llamada a la acción.",
    "- En cada lámina, «titulo» y «texto». Si una lámina no necesita texto, deja «texto» vacío."
  ].join("\n");
  if(formato === "carrusel") return [
    "CÓMO ES UN CARRUSEL DE LOMAZ HOME",
    "- De 6 a 8 láminas verticales (1080 × 1350).",
    "- Lámina 1 (portada): el título es la frase de búsqueda en máximo 8 palabras; el texto es un subtítulo de una línea.",
    "- Láminas intermedias: una idea por lámina, en el orden de los subtítulos de la fuente. Título de máximo 7 palabras y texto de máximo 30 palabras.",
    "- Última lámina: la llamada a la acción como título y «Guarda y comparte» en el texto."
  ].join("\n");
  if(formato === "lista") return [
    "CÓMO ES UNA LISTA DE CHEQUEO DE LOMAZ HOME",
    "- Una sola imagen vertical (1080 × 1350), hecha para guardar y compartir.",
    "- titulo_pieza: máximo 9 palabras.",
    "- puntos: de 6 a 9 puntos, uno por línea, de máximo 14 palabras, que empiecen por lo que hay que revisar o hacer. Solo lo que dice la fuente.",
    "- cierre: la llamada a la acción en una línea."
  ].join("\n");
  if(formato === "imagen") return [
    "CÓMO ES UNA IMAGEN DE LOMAZ HOME",
    "- Una sola imagen con una foto real y poco texto encima.",
    "- titulo_pieza: máximo 8 palabras.",
    "- puntos: de 2 a 4 líneas de apoyo de máximo 12 palabras cada una.",
    "- cierre: la llamada a la acción en una línea."
  ].join("\n");
  return [
    "CÓMO SON LAS HISTORIAS DE LOMAZ HOME",
    "- De 1 a 3 historias verticales. Cada una lleva un texto de máximo 25 palabras y el texto de su sticker (enlace, pregunta o encuesta) de máximo 5 palabras."
  ].join("\n");
}

function comoEsCadaRed(redes, formato, tipoFuente){
  const guia = tipoFuente === "propiedad" ? "la ficha del inmueble" : "la guía completa";
  const t = {
    instagram: "- instagram: la primera línea es el gancho o la frase de búsqueda. Después, de 3 a 5 líneas cortas con lo más útil de la pieza. Termina con la llamada a la acción. Sin hashtags dentro del texto.\n- instagram_hashtags: de 6 a 8 hashtags en una sola línea: #LomazHome, los del tema y los de Bogotá o el barrio.",
    facebook: "- facebook: tono de conversación y de tú, de 3 a 5 líneas y máximo 3 hashtags. No es una copia del texto de LinkedIn. En Facebook el enlace va en la publicación, así que aquí no se pide el comentario: la última línea es «La " + (tipoFuente === "propiedad" ? "ficha" : "guía") + " completa: {{ENLACE}}».",
    tiktok: "- tiktok: 1 o 2 líneas con la frase de búsqueda (máximo 150 caracteres) y, en otra línea, 4 o 5 hashtags.",
    youtube: "- youtube_titulo: máximo 70 caracteres, con la frase de búsqueda al comienzo.\n- youtube_descripcion: 2 o 3 líneas. Incluye una línea con «" + (tipoFuente === "propiedad" ? "Ficha completa" : "Guía completa") + ": {{ENLACE}}» y otra con «WhatsApp de LoMaz Home: 300 330 0343».",
    linkedin: "- linkedin: tono profesional (puede ir en impersonal), de 4 a 6 líneas, sin emojis. Cierra con la frase «El enlace a " + guia + " está en el primer comentario.» y deja en la última línea máximo 3 hashtags.\n- linkedin_comentario: el primer comentario, en una línea, con {{ENLACE}}.",
    whatsapp: "- whatsapp: estado de WhatsApp: 1 o 2 líneas y, debajo, {{ENLACE}}.",
    google: "- google: novedad del Perfil de Negocio de Google: 2 o 3 frases, de tú, con un dato concreto de la fuente, sin hashtags ni emojis y sin escribir el enlace (va en el botón «Más información»).",
    marketplace: "- marketplace_titulo: título del aviso en Marketplace: tipo de inmueble, barrio y canon, en máximo 60 caracteres.\n- marketplace: descripción del aviso: de 4 a 6 líneas con área, distribución, canon, administración si se conoce y cómo agendar la visita por WhatsApp (300 330 0343)."
  };
  const lineas = redes.filter(function(r){ return t[r]; }).map(function(r){ return t[r]; });
  return ["TEXTOS PARA PUBLICAR", "Cada red recibe un texto propio, escrito para esa red: no repitas el mismo en todas."].concat(lineas).join("\n");
}

/* ============================== 2. Que se le pide a Claude ============================== */

const S = { type: "string" };
function objeto(props){ return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false }; }
function lista(item){ return { type: "array", items: item }; }

function camposDeRedes(redes){
  const p = {};
  redes.forEach(function(r){
    if(r === "instagram"){ p.instagram = S; p.instagram_hashtags = S; }
    else if(r === "youtube"){ p.youtube_titulo = S; p.youtube_descripcion = S; }
    else if(r === "linkedin"){ p.linkedin = S; p.linkedin_comentario = S; }
    else if(r === "marketplace"){ p.marketplace_titulo = S; p.marketplace = S; }
    else p[r] = S;
  });
  return p;
}

function esquemaDePieza(formato, redes){
  let propios;
  if(formato === "reel") propios = { gancho: S, guion: S, textos_pantalla: lista(S), portada: S, tomas: S };
  else if(formato === "carrusel") propios = { laminas: lista(objeto({ titulo: S, texto: S })) };
  else if(formato === "historia") propios = { historias: lista(objeto({ texto: S, sticker: S })) };
  else propios = { titulo_pieza: S, puntos: lista(S), cierre: S };
  return objeto(Object.assign(propios, camposDeRedes(redes)));
}

const ESQUEMA_RUTINAS = objeto({
  historias: lista(objeto({ pregunta: S, respuesta: S, sticker: S })),
  ideas_historias: lista(S),
  grupos: lista(objeto({ texto: S, primer_comentario: S })),
  respuesta_guia: S,
  respuesta_whatsapp: S,
  enlace_bio: S
});

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fechaLarga(f){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f || "");
  if(!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return DIAS[d.getUTCDay()] + " " + (+m[3]) + " de " + MESES[+m[2] - 1];
}
function limpio(v, max){ return String(v === null || v === undefined ? "" : v).replace(/\u0000/g, "").trim().slice(0, max || 4000); }

function bloqueFuente(fuente){
  const tipo = fuente.tipo;
  if(tipo === "articulo") return [
    "FUENTE: artículo madre del blog de LoMaz Home",
    "Título: " + limpio(fuente.titulo, 300),
    "Texto aprobado del artículo:",
    '"""',
    limpio(fuente.texto, MAX_FUENTE),
    '"""'
  ].join("\n");
  if(tipo === "propiedad") return [
    "FUENTE: inmueble del portafolio de LoMaz Home (estos son todos los datos que hay; no agregues otros)",
    limpio(fuente.texto, 6000),
    "Ficha del inmueble en la web: {{ENLACE}}"
  ].join("\n");
  return [
    "FUENTE: tema escrito por el equipo de LoMaz Home",
    "Tema: " + limpio(fuente.titulo, 400),
    fuente.texto ? "Datos e indicaciones del equipo:\n" + limpio(fuente.texto, 8000) : "No hay más datos que el tema.",
    "Como no hay un artículo detrás, no afirmes cifras, plazos ni normas que no estén escritos arriba: donde haga falta uno, deja [DATO: qué falta]."
  ].join("\n");
}

function llamadaALaAccion(fuente, pieza){
  if(limpio(pieza.cta, 300)) return limpio(pieza.cta, 300);
  if(fuente.tipo === "articulo") return "«Comenta GUÍA y te envío la guía completa». Quien comenta recibe por mensaje directo el enlace del artículo.";
  if(fuente.tipo === "propiedad") return "«Escríbenos por WhatsApp y agenda tu visita: el enlace está en el perfil».";
  return "«Escríbenos por WhatsApp: el enlace está en el perfil», salvo que las indicaciones pidan otra.";
}

// Las piezas de la quincena que ya estan escritas llegan con su texto resumido, para no repetir sus ideas
function loQueYaDicen(hermanas){
  const escritas = hermanas.filter(function(h){ return limpio(h.resumen); });
  if(!escritas.length) return "";
  return "LO QUE YA DICEN LAS OTRAS PIEZAS DE LA QUINCENA (no repitas sus ideas ni sus frases: toma otras partes de la fuente)\n" + escritas.map(function(h){
    return "[" + limpio(h.titulo, 200) + "]\n" + limpio(h.resumen, 1500);
  }).join("\n\n");
}

function encargoDePieza(cuerpo, formato, redes){
  const fuente = cuerpo.fuente || {}, pieza = cuerpo.pieza || {}, marca = cuerpo.marca || {};
  const partes = [bloqueFuente(fuente)];
  const hermanas = Array.isArray(cuerpo.quincena) ? cuerpo.quincena.slice(0, 12) : [];
  if(hermanas.length){
    partes.push("LA QUINCENA DE ESTA FUENTE (para que las piezas no se repitan entre sí)\n" + hermanas.map(function(h){
      return "- " + [fechaLarga(h.fecha), limpio(h.titulo, 200)].filter(Boolean).join(": ");
    }).join("\n"));
  }
  const yaDicho = loQueYaDicen(hermanas);
  if(yaDicho) partes.push(yaDicho);
  const datos = [
    "PIEZA QUE VAS A ESCRIBIR AHORA",
    "Formato: " + NOMBRE_FORMATO[formato],
    "Título en el plan: " + limpio(pieza.titulo, 300)
  ];
  if(limpio(pieza.gancho)) datos.push("Gancho del plan: " + limpio(pieza.gancho, 400));
  if(fechaLarga(pieza.fecha)) datos.push("Se publica el " + fechaLarga(pieza.fecha) + ".");
  if(limpio(pieza.responsable)) datos.push("La presenta o la publica: " + limpio(pieza.responsable, 80) + ".");
  if(limpio(marca.enfoque)) datos.push("Enfoque de marca: " + limpio(marca.enfoque, 60) + (/personal/i.test(marca.enfoque) ? " (habla Salomón en primera persona)." : /fusi/i.test(marca.enfoque) ? " (habla Salomón en nombre de LoMaz Home)." : " (habla la marca: nosotros)."));
  if(limpio(marca.pilar)) datos.push("Pilar de contenido: " + limpio(marca.pilar, 60) + ".");
  if(limpio(pieza.indicaciones)) datos.push("Indicaciones del plan: " + limpio(pieza.indicaciones, 3000));
  datos.push("Llamada a la acción de esta pieza: " + llamadaALaAccion(fuente, pieza));
  partes.push(datos.join("\n"));
  partes.push(comoEsElFormato(formato, fuente.tipo));
  if(redes.length) partes.push(comoEsCadaRed(redes, formato, fuente.tipo));
  partes.push("Entrega solo el objeto JSON con esos campos, todos llenos y en español.");
  return partes.join("\n\n");
}

function encargoDeRutinas(cuerpo){
  const fuente = cuerpo.fuente || {};
  const hermanas = Array.isArray(cuerpo.quincena) ? cuerpo.quincena.slice(0, 12) : [];
  return [
    bloqueFuente(fuente),
    hermanas.length ? "LAS PIEZAS DE LA QUINCENA (se escriben aparte: no repitas sus preguntas)\n" + hermanas.map(function(h){ return "- " + limpio(h.titulo, 200); }).join("\n") : "",
    loQueYaDicen(hermanas),
    [
      "LO QUE VAS A ESCRIBIR AHORA: LAS RUTINAS DE LA QUINCENA",
      "Son los textos que acompañan al artículo durante sus quince días. Todos salen de la fuente.",
      "- historias: 2 historias de Instagram, Facebook y WhatsApp. Cada una responde una pregunta frecuente distinta de la fuente: «pregunta» (máximo 12 palabras), «respuesta» (máximo 30 palabras) y «sticker», el texto del sticker de enlace (máximo 4 palabras).",
      "- ideas_historias: 4 ideas más para historias de proceso o de pregunta (caja de preguntas, encuesta o dato del artículo), una línea cada una.",
      "- grupos: 2 publicaciones para grupos de barrio de Facebook, una por cada martes. «texto»: un dato útil y concreto de la fuente en 3 a 5 líneas, con tono de vecino que ayuda y sin vender. «primer_comentario»: una línea que ofrece la guía completa con {{ENLACE}}.",
      "- respuesta_guia: la respuesta guardada «GUÍA» para los mensajes directos de Instagram y Facebook: dos líneas, el enlace {{ENLACE}} y, al final, una pregunta por el nombre y el barrio de la persona.",
      "- respuesta_whatsapp: la respuesta guardada de WhatsApp para este tema: dos líneas y {{ENLACE}}.",
      "- enlace_bio: el título del segundo enlace de la bio de Instagram: máximo 6 palabras."
    ].join("\n"),
    "Entrega solo el objeto JSON con esos campos, todos llenos y en español."
  ].filter(Boolean).join("\n\n");
}

/* ============================== 3. De la respuesta a los bloques ============================== */

function texto(v){ return String(v === null || v === undefined ? "" : v).replace(/\r\n/g, "\n").replace(/^\s+|\s+$/g, ""); }
function numerada(arr){ return (Array.isArray(arr) ? arr : []).map(function(t, i){ return (i + 1) + ". " + texto(t); }).join("\n"); }

function bloquesDeRedes(d, formato, redes){
  const nombre = NOMBRE_EN_RED[formato] || {};
  const b = [];
  function add(id, etiqueta, valor){ if(texto(valor)) b.push({ id: id, etiqueta: etiqueta, texto: texto(valor) }); }
  redes.forEach(function(r){
    if(r === "instagram") add("instagram", "Instagram · " + (nombre.instagram || "Publicación"), [texto(d.instagram), texto(d.instagram_hashtags)].filter(Boolean).join("\n\n"));
    else if(r === "facebook") add("facebook", "Facebook · " + (nombre.facebook || "Publicación"), d.facebook);
    else if(r === "tiktok") add("tiktok", "TikTok · " + (nombre.tiktok || "Video"), d.tiktok);
    else if(r === "youtube"){ add("youtube_titulo", "YouTube Shorts · Título", d.youtube_titulo); add("youtube_descripcion", "YouTube Shorts · Descripción", d.youtube_descripcion); }
    else if(r === "linkedin"){ add("linkedin", "LinkedIn · " + (nombre.linkedin || "Publicación"), d.linkedin); add("linkedin_comentario", "LinkedIn · Primer comentario", d.linkedin_comentario); }
    else if(r === "whatsapp") add("whatsapp", "WhatsApp · " + (nombre.whatsapp || "Estado"), d.whatsapp);
    else if(r === "google") add("google", "Google · " + (nombre.google || "Novedad"), d.google);
    else if(r === "marketplace"){ add("marketplace_titulo", "Marketplace · Título", d.marketplace_titulo); add("marketplace", "Marketplace · Descripción", d.marketplace); }
  });
  return b;
}

function aSecciones(formato, d, redes){
  const secciones = [];
  const hacer = [];
  function add(id, etiqueta, valor){ if(texto(valor)) hacer.push({ id: id, etiqueta: etiqueta, texto: texto(valor) }); }
  if(formato === "reel"){
    add("gancho", "Gancho · primeros 3 segundos", d.gancho);
    add("guion", "Guion · lo que se dice", d.guion);
    add("pantalla", "Textos en pantalla", numerada(d.textos_pantalla));
    add("portada", "Portada", d.portada);
    add("tomas", "Tomas y edición", d.tomas);
    secciones.push({ titulo: "Para grabar y editar", bloques: hacer, notas: ["El gancho se dice en voz alta y se escribe en pantalla en los tres primeros segundos."] });
  }else if(formato === "carrusel"){
    const laminas = Array.isArray(d.laminas) ? d.laminas : [];
    add("laminas", "Láminas · " + laminas.length + " en total", laminas.map(function(l, i){
      return "LÁMINA " + (i + 1) + (i === 0 ? " (portada)" : "") + "\n" + [texto(l && l.titulo), texto(l && l.texto)].filter(Boolean).join("\n");
    }).join("\n\n"));
    secciones.push({ titulo: "Para diseñar", bloques: hacer });
  }else if(formato === "historia"){
    (Array.isArray(d.historias) ? d.historias : []).forEach(function(h, i){
      add("historia" + (i + 1), "Historia " + (i + 1), [texto(h && h.texto), texto(h && h.sticker) ? "Sticker: " + texto(h.sticker) : ""].filter(Boolean).join("\n"));
    });
    secciones.push({ titulo: "Para publicar en historias", bloques: hacer, notas: ["Sale en historias de Instagram y Facebook y en el estado de WhatsApp."] });
    return secciones;
  }else{
    const puntos = (Array.isArray(d.puntos) ? d.puntos : []).map(function(p){ return (formato === "lista" ? "☐ " : "") + texto(p); }).join("\n");
    add("pieza", formato === "lista" ? "Texto de la lista de chequeo" : "Texto de la imagen", [texto(d.titulo_pieza), puntos, texto(d.cierre)].filter(Boolean).join("\n\n"));
    secciones.push({ titulo: "Para diseñar", bloques: hacer });
  }
  const publicar = { titulo: "Para publicar", bloques: bloquesDeRedes(d, formato, redes) };
  if(redes.indexOf("instagram") >= 0) publicar.notas = ["Threads: se comparte desde Instagram al publicar; no hay que escribir nada."];
  secciones.push(publicar);
  return secciones;
}

function rutinasASecciones(d){
  const historias = [], grupos = [], respuestas = [];
  (Array.isArray(d.historias) ? d.historias : []).forEach(function(h, i){
    historias.push({ id: "historia" + (i + 1), etiqueta: "Historia " + (i + 1) + " · pregunta del artículo", texto: [texto(h && h.pregunta), texto(h && h.respuesta), texto(h && h.sticker) ? "Sticker de enlace: " + texto(h.sticker) + " → {{ENLACE}}" : ""].filter(Boolean).join("\n\n") });
  });
  if(Array.isArray(d.ideas_historias) && d.ideas_historias.length) historias.push({ id: "ideas", etiqueta: "Más ideas de historias", texto: numerada(d.ideas_historias) });
  (Array.isArray(d.grupos) ? d.grupos : []).forEach(function(g, i){
    grupos.push({ id: "grupo" + (i + 1), etiqueta: "Grupos · martes " + (i + 1), texto: texto(g && g.texto) });
    if(texto(g && g.primer_comentario)) grupos.push({ id: "grupo" + (i + 1) + "_comentario", etiqueta: "Grupos · martes " + (i + 1) + " · primer comentario", texto: texto(g.primer_comentario) });
  });
  if(texto(d.respuesta_guia)) respuestas.push({ id: "respuesta_guia", etiqueta: "Respuesta «GUÍA» · Instagram y Facebook", texto: texto(d.respuesta_guia) });
  if(texto(d.respuesta_whatsapp)) respuestas.push({ id: "respuesta_whatsapp", etiqueta: "Respuesta guardada · WhatsApp", texto: texto(d.respuesta_whatsapp) });
  if(texto(d.enlace_bio)) respuestas.push({ id: "enlace_bio", etiqueta: "Segundo enlace de la bio · título", texto: texto(d.enlace_bio) });
  return [
    { titulo: "Historias de la quincena", bloques: historias, notas: ["Salen en Instagram, Facebook y el estado de WhatsApp, cada una con el sticker de enlace al artículo."] },
    { titulo: "Martes de grupos de Facebook", bloques: grupos, notas: ["Si el grupo no admite enlaces, se ofrece la guía por mensaje."] },
    { titulo: "El día que sale el artículo", bloques: respuestas, notas: ["Son las respuestas guardadas para quien comenta GUÍA o escribe por el tema, y el título del segundo enlace de la bio."] }
  ].filter(function(s){ return s.bloques.length; });
}

/* ============================== 4. Hablar con Claude ============================== */

// Formas de pedirle la pieza a cada modelo, de la mas ajustada a la mas simple.
// Si Claude rechaza una (error 400), se prueba la siguiente.
function variantesDe(modelo){
  const v = [];
  // Sonnet 5.5 piensa antes de responder si no se le dice lo contrario; para estos textos no hace falta.
  if(/sonnet-5-5/.test(modelo)) v.push({ thinking: { type: "between_tools" } }, { effort: "low" });
  else if(!/haiku/.test(modelo)) v.push({ effort: "low" });
  v.push({});                     // solo con el esquema de la respuesta
  v.push({ sinEsquema: true });   // sin esquema: el JSON se pide por escrito
  return v;
}

async function pedirAClaude(clave, modelo, sistema, encargo, esquema, variante, msRestantes){
  const cuerpo = { model: modelo, max_tokens: 8000, system: sistema, messages: [{ role: "user", content: encargo }] };
  if(variante.thinking) cuerpo.thinking = variante.thinking;
  const salida = {};
  if(!variante.sinEsquema) salida.format = { type: "json_schema", schema: esquema };
  if(variante.effort) salida.effort = variante.effort;
  if(Object.keys(salida).length) cuerpo.output_config = salida;
  if(variante.sinEsquema) cuerpo.messages[0].content += "\n\nResponde solo con el objeto JSON, sin texto antes ni después. Su forma es este esquema JSON:\n" + JSON.stringify(esquema);

  const corte = new AbortController();
  const reloj = setTimeout(function(){ corte.abort(); }, Math.max(1000, msRestantes));
  try{
    const r = await fetch(API_CLAUDE, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(cuerpo),
      signal: corte.signal
    });
    let datos = null;
    try{ datos = await r.json(); }catch(e){ datos = null; }
    return { estado: r.status, datos: datos, esperar: parseInt(r.headers.get("retry-after") || "0", 10) || 0 };
  }catch(e){
    return { estado: 0, datos: null, tiempo: e && e.name === "AbortError" };
  }finally{
    clearTimeout(reloj);
  }
}

function sacarJson(datos){
  const partes = (datos && Array.isArray(datos.content) ? datos.content : []).filter(function(b){ return b && b.type === "text" && typeof b.text === "string"; });
  let t = partes.map(function(b){ return b.text; }).join("").trim();
  if(!t) return null;
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try{ return JSON.parse(t); }catch(e){}
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if(a >= 0 && z > a){ try{ return JSON.parse(t.slice(a, z + 1)); }catch(e){} }
  return null;
}

function fallo(http, codigo, mensaje, extra){
  return Object.assign({ http: http, cuerpo: Object.assign({ ok: false, codigo: codigo, mensaje: mensaje }, extra || {}) });
}

async function escribir(clave, sistema, encargo, esquema){
  const modelos = [process.env.ANTHROPIC_MODEL, MODELO_BASE, MODELO_RESPALDO].filter(function(m, i, a){ return m && a.indexOf(m) === i; });
  const limite = Date.now() + TIEMPO_MAX_MS;   // todo el intento cabe en lo que dura la funcion
  let ultimo = null;
  for(let i = 0; i < modelos.length; i++){
    const modelo = modelos[i], variantes = variantesDe(modelo);
    for(let n = 0; n < variantes.length; n++){
      if(limite - Date.now() < 3000) return fallo(504, "tiempo", "Claude tardó más de lo esperado. Vuelve a intentarlo.", { reintentar: true });
      const r = await pedirAClaude(clave, modelo, sistema, encargo, esquema, variantes[n], limite - Date.now());
      ultimo = r;
      const err = (r.datos && r.datos.error) || {};
      const msj = String(err.message || "");
      if(r.estado === 200){
        if(r.datos && r.datos.stop_reason === "max_tokens") return fallo(502, "incompleta", "La respuesta quedó cortada. Vuelve a intentarlo.", { reintentar: true });
        if(r.datos && r.datos.stop_reason === "refusal") return fallo(502, "rechazada", "Claude no escribió esta pieza. Revisa el tema o las indicaciones e inténtalo de nuevo.");
        const json = sacarJson(r.datos);
        if(!json) return fallo(502, "respuesta_invalida", "La respuesta no llegó en el formato esperado. Vuelve a intentarlo.", { reintentar: true });
        const u = r.datos.usage || {};
        return { ok: true, json: json, modelo: r.datos.model || modelo, uso: { entrada: u.input_tokens || 0, salida: u.output_tokens || 0 } };
      }
      if(r.estado === 0) return fallo(504, "tiempo", r.tiempo ? "Claude tardó más de lo esperado. Vuelve a intentarlo." : "No se pudo conectar con Claude. Vuelve a intentarlo.", { reintentar: true });
      if(r.estado === 401 || r.estado === 403) return fallo(502, "clave_invalida", "La clave de Claude guardada en Vercel no es válida o fue desactivada. Crea una nueva en platform.claude.com y reemplázala en Vercel.");
      if(r.estado === 402 || /credit balance|billing|purchase credits/i.test(msj)) return fallo(502, "sin_saldo", "La cuenta de la API de Claude no tiene saldo. Recarga créditos en platform.claude.com (Settings > Billing).");
      if(r.estado === 429){
        if(/usage limits|spend/i.test(msj)) return fallo(502, "tope_mensual", "La cuenta de la API de Claude llegó a su tope de gasto del mes.");
        return fallo(429, "limite", "Claude está recibiendo muchas solicitudes. Se reintenta en unos segundos.", { reintentar: true, esperar: Math.min(r.esperar || 8, 30) });
      }
      if(r.estado === 404) break;                       // ese modelo no existe en la cuenta: se prueba el siguiente
      if(r.estado === 400 && n < variantes.length - 1) continue;   // se repite con una solicitud mas simple
      if(r.estado >= 500) return fallo(503, "saturado", "Claude está saturado en este momento. Se reintenta en unos segundos.", { reintentar: true, esperar: 6 });
      return fallo(502, "error_ia", "Claude respondió con un error (" + r.estado + (err.type ? ", " + err.type : "") + "): " + (msj || "sin detalle").slice(0, 300));
    }
  }
  const e = (ultimo && ultimo.datos && ultimo.datos.error) || {};
  return fallo(502, "error_ia", "No se pudo usar el modelo de Claude configurado (" + (ultimo ? ultimo.estado : "sin respuesta") + "): " + String(e.message || "revisa la variable ANTHROPIC_MODEL en Vercel").slice(0, 300));
}

/* ============================== 5. La puerta de entrada ============================== */

async function sesionValida(token){
  if(!token || token.length < 20) return false;
  try{
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + token } });
    if(!r.ok) return false;
    const u = await r.json();
    return !!(u && u.id);
  }catch(e){ return false; }
}

async function leerCuerpo(req){
  if(req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  let crudo = "";
  if(typeof req.body === "string") crudo = req.body;
  else if(Buffer.isBuffer(req.body)) crudo = req.body.toString("utf8");
  else{
    crudo = await new Promise(function(resolver){
      let t = "";
      req.on("data", function(c){ t += c; if(t.length > 400000) req.destroy(); });
      req.on("end", function(){ resolver(t); });
      req.on("error", function(){ resolver(""); });
    });
  }
  try{ return JSON.parse(crudo || "{}"); }catch(e){ return null; }
}

function responder(res, http, cuerpo){
  res.statusCode = http;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(cuerpo));
}

const FORMATOS = ["reel", "carrusel", "lista", "imagen", "historia"];
const REDES = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "whatsapp", "google", "marketplace"];

async function atender(req, res){
  if(req.method !== "POST") return responder(res, 405, { ok: false, codigo: "metodo", mensaje: "Esta dirección solo recibe solicitudes de la plataforma." });
  const cuerpo = await leerCuerpo(req);
  if(!cuerpo) return responder(res, 400, { ok: false, codigo: "solicitud", mensaje: "La solicitud no se pudo leer." });

  const token = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || "").replace(/^Bearer\s+/i, "");
  if(!(await sesionValida(token))) return responder(res, 401, { ok: false, codigo: "sesion", mensaje: "Tu sesión venció. Vuelve a entrar a la plataforma e inténtalo de nuevo." });

  const clave = process.env.ANTHROPIC_API_KEY;
  if(cuerpo.modo === "estado") return responder(res, 200, { ok: true, listo: !!clave });
  if(!clave) return responder(res, 503, { ok: false, codigo: "sin_clave", mensaje: "Falta conectar la clave de Claude en Vercel (variable ANTHROPIC_API_KEY)." });

  const fuente = cuerpo.fuente || {};
  if(["articulo", "propiedad", "tema"].indexOf(fuente.tipo) < 0) return responder(res, 400, { ok: false, codigo: "solicitud", mensaje: "Falta la fuente del contenido." });
  if(fuente.tipo === "articulo" && limpio(fuente.texto, MAX_FUENTE).length < 300) return responder(res, 400, { ok: false, codigo: "sin_fuente", mensaje: "Falta el texto aprobado del artículo. Pégalo en el agente y guarda." });
  if(fuente.tipo !== "articulo" && !limpio(fuente.titulo) && !limpio(fuente.texto)) return responder(res, 400, { ok: false, codigo: "sin_fuente", mensaje: "Escribe el tema o elige un inmueble." });

  const sistema = VOZ + "\n\n" + REGLAS;

  if(cuerpo.modo === "rutinas"){
    const r = await escribir(clave, sistema, encargoDeRutinas(cuerpo), ESQUEMA_RUTINAS);
    if(!r.ok) return responder(res, r.http, r.cuerpo);
    return responder(res, 200, { ok: true, pieza: { formato: "rutinas", secciones: rutinasASecciones(r.json) }, modelo: r.modelo, uso: r.uso });
  }

  const pieza = cuerpo.pieza || {};
  const formato = FORMATOS.indexOf(pieza.formato) >= 0 ? pieza.formato : "";
  if(!formato) return responder(res, 400, { ok: false, codigo: "solicitud", mensaje: "Falta el formato de la pieza." });
  const permitidas = Object.keys(NOMBRE_EN_RED[formato]).concat(fuente.tipo === "propiedad" ? ["marketplace"] : []);
  let redes = (Array.isArray(pieza.redes) ? pieza.redes : []).filter(function(r, i, a){ return REDES.indexOf(r) >= 0 && permitidas.indexOf(r) >= 0 && a.indexOf(r) === i; });
  if(!redes.length) redes = Object.keys(NOMBRE_EN_RED[formato]);
  if(formato === "historia") redes = [];

  const r = await escribir(clave, sistema, encargoDePieza(cuerpo, formato, redes), esquemaDePieza(formato, redes));
  if(!r.ok) return responder(res, r.http, r.cuerpo);
  return responder(res, 200, { ok: true, pieza: { formato: formato, secciones: aSecciones(formato, r.json, redes) }, modelo: r.modelo, uso: r.uso });
}

module.exports = async function handler(req, res){
  try{ await atender(req, res); }
  catch(e){
    console.error("agente-marketing:", e && e.message);
    try{ responder(res, 500, { ok: false, codigo: "interno", mensaje: "Algo falló al escribir la pieza. Vuelve a intentarlo.", reintentar: true }); }catch(_){}
  }
};

// Se exportan para las pruebas y para reutilizar el mismo armado fuera de Vercel
module.exports.interno = { encargoDePieza: encargoDePieza, encargoDeRutinas: encargoDeRutinas, esquemaDePieza: esquemaDePieza, ESQUEMA_RUTINAS: ESQUEMA_RUTINAS, aSecciones: aSecciones, rutinasASecciones: rutinasASecciones, VOZ: VOZ, REGLAS: REGLAS, NOMBRE_EN_RED: NOMBRE_EN_RED };
