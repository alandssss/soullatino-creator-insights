import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action, email, password, role } = await req.json()

    if (action === 'create') {
      // Crear nuevo usuario
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) throw authError

      // Asignar rol de manager
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: role || 'manager'
        })

      if (roleError) throw roleError

      // Crear registro en tabla managers
      const { error: managerError } = await supabaseAdmin
        .from('managers')
        .insert({
          nombre: email.split('@')[0],
          email: email,
          activo: true
        })

      if (managerError) throw managerError

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuario creado exitosamente',
          user_id: authData.user.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_password') {
      // Buscar usuario por email
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (getUserError) throw getUserError

      const user = userData.users.find(u => u.email === email)
      
      if (!user) {
        throw new Error(`Usuario con email ${email} no encontrado`)
      }

      // Actualizar contraseña
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password }
      )

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contraseña actualizada exitosamente',
          user_id: user.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Acción no válida')

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
