import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { phone } = await req.json()

    if (!phone) {
      throw new Error('Phone number is required')
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store verification code in database
    const { error: dbError } = await supabaseClient
      .from('phone_verifications')
      .insert({
        user_id: user.id,
        phone,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      })

    if (dbError) {
      throw dbError
    }

    // Send SMS using Twilio (you'll need to add your Twilio credentials)
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      // Real SMS sending with Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
      
      const formData = new URLSearchParams()
      formData.append('From', twilioPhoneNumber)
      formData.append('To', phone)
      formData.append('Body', `Your Scrubbed verification code is: ${code}. This code expires in 10 minutes.`)

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      if (!twilioResponse.ok) {
        const twilioError = await twilioResponse.text()
        console.error('Twilio error:', twilioError)
        throw new Error('Failed to send SMS')
      }

      console.log(`SMS sent successfully to ${phone}`)
    } else {
      // Fallback for development - log the code
      console.log(`Development mode: SMS code for ${phone} is ${code}`)
      
      // You could also use other SMS services here like:
      // - AWS SNS
      // - SendGrid
      // - MessageBird
      // - etc.
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        // Only include code in development mode
        ...(Deno.env.get('DENO_ENV') === 'development' && { code })
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while sending SMS' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})