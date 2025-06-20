import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      throw new Error('Missing required email fields')
    }

    // In a real implementation, you would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Resend
    // - Postmark

    // For now, we'll just log the email content
    console.log('Welcome email would be sent to:', to)
    console.log('Subject:', subject)
    console.log('HTML content length:', html.length)

    // Example integration with SendGrid (commented out):
    /*
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (sendGridApiKey) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }],
            subject: subject,
          }],
          from: { email: 'noreply@scrubbed.online', name: 'Scrubbed' },
          content: [{
            type: 'text/html',
            value: html,
          }],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email via SendGrid')
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email processed successfully',
        // In development, we can include the email content for debugging
        ...(Deno.env.get('DENO_ENV') === 'development' && { 
          debug: { to, subject, htmlLength: html.length } 
        })
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in send-welcome-email function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing welcome email' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})