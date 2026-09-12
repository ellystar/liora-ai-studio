const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const TO = Deno.env.get('CONTACT_TO') ?? 'info@lioralabs.io'
const FROM = Deno.env.get('CONTACT_FROM') ?? 'Liora <onboarding@resend.dev>'

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const name = (body.name ?? '').toString().trim()
    const email = (body.email ?? '').toString().trim()
    const message = (body.message ?? '').toString().trim()

    // basit dogrulama
    if (!name || !email || !message) return json({ error: 'missing_input' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400)
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return json({ error: 'too_long' }, 400)
    }

    const html =
      `<h2>Yeni erişim talebi</h2>` +
      `<p><strong>İsim:</strong> ${esc(name)}</p>` +
      `<p><strong>Marka & e-posta:</strong> ${esc(email)}</p>` +
      `<p><strong>Neyi büyütüyor:</strong></p>` +
      `<p>${esc(message).replace(/\n/g, '<br>')}</p>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,          // "Yanitla" dedigв kisi = basvuran
        subject: `Erişim talebi — ${name}`,
        html,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Resend error', res.status, detail)
      return json({ error: 'send_failed', detail }, 502)
    }
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})