import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITESHIP_BASE_URL = 'https://api.biteship.com/v1';

// Initialize Supabase client with service role for system config access
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, cityName, destinationAreaId, weight } = await req.json();
    
    const apiKey = Deno.env.get('BITESHIP_API_KEY');

    console.log('Biteship action:', action);

    // Search for city to get area_id
    if (action === 'searchCity') {
      const response = await fetch(
        `${BITESHIP_BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(cityName)}&type=single`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiKey || '',
          },
        }
      );

      const data = await response.json();
      console.log('Search city response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get shipping rates
    if (action === 'rates') {
      // Get origin from system config
      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'shipping_origin_area_id')
        .single();

      if (configError) {
        console.error('Error fetching origin config:', configError);
      }

      const originAreaId = configData?.config_value || 'IDNP6IDNC148IDND1845IDZ10013'; // Fallback to Jakarta Pusat

      const requestBody = {
        origin_area_id: originAreaId,
        destination_area_id: destinationAreaId,
        couriers: 'jne,jnt,sicepat,anteraja,ninja,lion',
        items: [
          {
            name: 'Paket',
            description: 'Paket produk',
            value: 10000,
            weight: weight || 1000,
            quantity: 1,
          },
        ],
      };

      console.log('Getting rates with params:', requestBody);

      const response = await fetch(`${BITESHIP_BASE_URL}/rates/couriers`, {
        method: 'POST',
        headers: {
          'Authorization': apiKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Rates response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }), 
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in biteship-shipping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
