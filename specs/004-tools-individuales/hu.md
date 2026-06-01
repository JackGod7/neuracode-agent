# Historias de usuario — Feature 004: tools-individuales

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## HU-004-01: consultar_bootcamp

**Como** agente  
**Quiero** buscar información actualizada del bootcamp en la base de conocimiento  
**Para** responder con datos reales al lead sin inventar

```gherkin
Scenario: Query con resultados
  Given knowledge tiene chunks del bootcamp
  When Claude invoca consultar_bootcamp({ query: "precio VIP" })
  Then retorna { context: "[Fuente 1: ...]...", matches: 4 }
    And Claude usa ese contexto en su respuesta

Scenario: Sin resultados relevantes
  Given knowledge no tiene info sobre "certificación GCP"
  When Claude invoca consultar_bootcamp({ query: "certificación GCP" })
  Then retorna { context: "(sin información en la base de conocimiento)", matches: 0 }
    And Claude no inventa información
```

## HU-004-02: inscribir_webinar

**Como** lead que quiere asistir a un webinar  
**Quiero** que el agente registre mi email y nombre  
**Para** recibir el link de Zoom 24h antes

```gherkin
Scenario: Inscripción exitosa
  Given lead proporciona nombre="Ana Ramos", email="ana@banco.pe", webinar="W1"
  When Claude invoca inscribir_webinar con esos datos
  Then se inserta en webinar_signups (upsert, no duplica)
    And se actualiza lead con name="Ana Ramos", email="ana@banco.pe", status="qualified"
    And retorna { ok: true, message: "Inscripción confirmada para W1..." }

Scenario: Email inválido
  When Claude invoca inscribir_webinar con email="noesunEmail"
  Then retorna { ok: false, message: "El email no parece válido..." }
    And NO se toca la DB

Scenario: Lead ya inscrito al mismo webinar (idempotente)
  Given lead ya tiene fila en webinar_signups para W2
  When Claude invoca inscribir_webinar para W2 de nuevo
  Then upsert no crea duplicado
    And retorna { ok: true }
```

## HU-004-03: agendar_call

**Como** lead que quiere hablar con Jack  
**Quiero** recibir un link de Cal.com para agendar  
**Para** coordinar sin depender de que Jack esté disponible ahora mismo

```gherkin
Scenario: Urgencia alta — lead caliente
  When Claude invoca agendar_call({ motivo: "quiere comprar VIP", urgencia: "alta" })
  Then actualiza lead status = "hot"
    And retorna { link: "https://cal.com/...", message: "Agenda directamente..." }

Scenario: Urgencia media/baja
  When Claude invoca agendar_call({ motivo: "duda técnica", urgencia: "media" })
  Then actualiza lead status = "qualified"
    And retorna link de Cal.com

Scenario: CAL_LINK no configurado
  Given CAL_LINK no está en env
  When Claude invoca agendar_call
  Then usa default "https://cal.com/jack-aguilar"
```

## HU-004-04: escalar_a_jack

**Como** agente que detecta una situación que requiere intervención humana  
**Quiero** notificar a Jack por WhatsApp y marcar el lead  
**Para** que Jack pueda retomar la conversación

```gherkin
Scenario: Escalamiento exitoso con JACK_WHATSAPP configurado
  Given JACK_WHATSAPP está en env
  When Claude invoca escalar_a_jack({ razon: "lead agresivo", contexto: "...", prioridad: "urgente" })
  Then updateLead status = "escalated"
    And sendWhatsAppMessage(jackNumber, alerta)
    And retorna { ok: true, message: "Listo, ya avisé a Jack..." }

Scenario: JACK_WHATSAPP no configurado
  Given JACK_WHATSAPP no está en env
  When Claude invoca escalar_a_jack
  Then updateLead status = "escalated"
    And NO llama a sendWhatsAppMessage (jackNumber es undefined)
    And retorna { ok: true } igualmente

Scenario: updateLead falla por error de DB
  Given Supabase retorna error en update
  When Claude invoca escalar_a_jack
  Then updateLead lanza excepción
    And executeTool la captura y retorna { error: "..." } a Claude
    And NO se llama a sendWhatsAppMessage (Jack no se entera)
```

## HU-004-05: generar_link_pago

**Como** lead que confirmó querer comprar el bootcamp  
**Quiero** recibir un link de Mercado Pago para pagar  
**Para** completar la inscripción sin salir de WhatsApp

```gherkin
Scenario: Link generado para tier cohort
  When Claude invoca generar_link_pago({ producto: "cohort", nombre: "Carlos" })
  Then crea preference en MP con items[0].unit_price = 597
    And inserta en payment_links
    And retorna { ok: true, link: "https://mpago.la/...", message: "Link generado..." }

Scenario: Tier enterprise — no genera link
  When Claude invoca generar_link_pago({ producto: "enterprise", nombre: "..." })
  Then retorna { ok: false, message: "Enterprise se cotiza caso por caso. Usa agendar_call..." }
    And NO llama a Mercado Pago

Scenario: MP_ACCESS_TOKEN inválido o expirado
  Given MP retorna 401
  When Claude invoca generar_link_pago
  Then captura el error
    And retorna { ok: false, message: "Error generando el link. Usa escalar_a_jack..." }
```
