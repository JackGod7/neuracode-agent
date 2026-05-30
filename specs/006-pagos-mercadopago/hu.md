# Historias de usuario — Feature 006: pagos-mercadopago

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## HU-006-01: Generación de link de pago

**Como** lead que confirmó querer comprar el bootcamp  
**Quiero** recibir un link de Mercado Pago por WhatsApp  
**Para** completar el pago sin salir de la conversación

```gherkin
Scenario: Link generado para tier cohort
  Given lead confirmó "quiero el cohort" y dio su nombre
  When Claude invoca generar_link_pago({ producto: "cohort", nombre: "Carlos López" })
  Then se crea preference en MP con:
    items[0].unit_price = 597
    items[0].currency_id = "USD"
    external_reference = leadId
    notification_url = BASE_URL + "/payments/webhook"
  And se inserta en payment_links con status="pending"
  And retorna { ok: true, link: "https://mpago.la/...", message: "Link generado..." }

Scenario: Link generado para tier VIP
  When Claude invoca generar_link_pago({ producto: "vip", nombre: "..." })
  Then se crea preference con unit_price = 1497

Scenario: Tier enterprise rechazado
  When Claude invoca generar_link_pago({ producto: "enterprise", nombre: "..." })
  Then retorna { ok: false, message: "Enterprise se cotiza caso por caso. Usa agendar_call..." }
    And NO llama a Mercado Pago

Scenario: MP_ACCESS_TOKEN inválido
  Given MP retorna 401 Unauthorized
  When Claude invoca generar_link_pago
  Then captura excepción
    And retorna { ok: false, message: "Error generando el link. Usa escalar_a_jack..." }
    And Jack puede enviar el link manualmente
```

## HU-006-02: Confirmación de pago vía webhook de MP

**Como** sistema  
**Quiero** recibir la notificación de pago de Mercado Pago  
**Para** actualizar el lead a status="paid" automáticamente

```gherkin
Scenario: Pago completado — primer webhook de MP
  Given MP envía POST /payments/webhook con payment_id y external_reference=leadId
    And mp_webhook_log no tiene ese payment_id
  When el handler procesa la notificación
  Then se consulta el payment a MP API para verificar status="approved"
    And se actualiza payment_links con status="paid", paid_at=now()
    And se actualiza leads con status="paid"
    And se inserta en mp_webhook_log con el payment_id (dedup)
    And retorna 200

Scenario: Webhook duplicado (MP retry)
  Given mp_webhook_log ya tiene el payment_id
  When MP envía el mismo webhook por segunda vez
  Then el handler retorna 200 inmediatamente
    And NO actualiza DB de nuevo

Scenario: Payment status != "approved" (pending, rejected)
  When MP envía webhook con payment.status = "pending"
  Then retorna 200 sin actualizar leads ni payment_links
    And loggea info con el status recibido
```

## HU-006-03: Idempotencia de links generados

**Como** sistema  
**Quiero** que el mismo lead no reciba dos links de pago distintos para el mismo producto  
**Para** evitar confusión y potencial doble cobro

```gherkin
Scenario: Claude llama generar_link_pago dos veces dentro de 60s
  Given tool_call_cache tiene el resultado de la primera llamada
  When Claude invoca generar_link_pago por segunda vez (retry)
  Then retorna el init_point cacheado
    And NO crea segunda preference en MP

Scenario: Claude llama generar_link_pago dos veces con >60s de diferencia
  Given tool_call_cache TTL expiró
  When Claude invoca generar_link_pago de nuevo
  Then se crea nueva preference en MP
    And se inserta segunda fila en payment_links
    And lead tiene dos links: solo el último está vigente
```
