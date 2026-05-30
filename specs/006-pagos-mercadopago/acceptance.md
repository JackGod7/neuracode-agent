# Acceptance — Feature 006: pagos-mercadopago

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Tests automatizados

Ubicación: `tests/006-pagos-mercadopago.test.ts`

```typescript
describe("006-pagos-mercadopago: generar_link_pago", () => {
  test("producto='cohort' → crea preference con unit_price=597 y currency_id='USD'");
  test("producto='vip' → crea preference con unit_price=1497");
  test("producto='enterprise' → { ok: false } sin llamar a MP");
  test("MP retorna error → { ok: false, message incluye 'escalar_a_jack' }");
  test("resultado exitoso se inserta en payment_links con status='pending'");
  test("external_reference de la preference = leadId");
});

describe("006-pagos-mercadopago: POST /payments/webhook", () => {
  test("payment.status='approved' → actualiza payment_links y lead a paid");
  test("payment.status='pending' → retorna 200 sin actualizar");
  test("payment_id duplicado (mp_webhook_log) → retorna 200 sin re-procesar");
  // NOTA: estos tests son para cuando el webhook esté implementado
});
```

## Validación manual

### generar_link_pago (ya implementado)
- [ ] Confirmar compra "cohort" → agente envía link MP por WhatsApp
- [ ] Link abre checkout de MP con precio USD 597
- [ ] En Supabase: fila en `payment_links` con status="pending" y el `init_point`
- [ ] Confirmar compra "enterprise" → agente dice "agendar call", no genera link MP

### Webhook de confirmación (pendiente de implementar)
- [ ] Configurar en MP Developers: Webhook URL = `https://<railway-domain>/payments/webhook`
- [ ] Completar un pago real en sandbox de MP
- [ ] En logs: "Pago confirmado" con payment_id y leadId
- [ ] En Supabase: `payment_links.status = "paid"`, `leads.status = "paid"`
- [ ] Reenviar el mismo webhook desde MP dashboard → no re-procesa (idempotente)

## Definition of done

### Fase 0 (mínimo para Cohort 1)
- [ ] `generar_link_pago` genera preference real en MP y retorna link
- [ ] Link abre checkout funcional con precio correcto
- [ ] `payment_links` table registra todos los links generados
- [ ] `MP_ACCESS_TOKEN` validado en startup
- [ ] Tests de `generar_link_pago` pasan

### Fase 0.5 (antes del Cohort 1, 13 jul 2026)
- [ ] `POST /payments/webhook` implementado y testeado
- [ ] Firma de MP verificada (`x-signature` header)
- [ ] Lead actualizado a status="paid" al confirmar pago
- [ ] `mp_webhook_log` con dedup implementado
- [ ] Prueba end-to-end con sandbox de MP

### Documentación
- [ ] `docs/runbooks/pagos.md` con instrucciones para verificar pagos manualmente en Fase 0
