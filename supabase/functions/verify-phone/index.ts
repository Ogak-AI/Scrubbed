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

    const { code } = await req.json()

    if (!code) {
      throw new Error('Verification code is required')
    }

    // Check if code is valid and not expired
    const { data: verification, error: fetchError } = await supabaseClient
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (fetchError || !verification) {
      throw new Error('Invalid or expired verification code')
    }

    // Mark as verified
    const { error: updateError } = await supabaseClient
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id)

    if (updateError) {
      throw updateError
    }

    // Update profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ phone_verified: true })
      .eq('id', user.id)

    if (profileError) {
      throw profileError
    }

    // Clean up old verification codes for this user
    await supabaseClient
      .from('phone_verifications')
      .delete()
      .eq('user_id', user.id)
      .neq('id', verification.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number verified successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in verify-phone function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while verifying phone number' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})