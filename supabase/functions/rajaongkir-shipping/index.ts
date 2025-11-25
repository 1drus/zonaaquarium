import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BITESHIP_BASE_URL = 'https://api.biteship.com/v1';

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
      // Origin: Jakarta Pusat (get this from Biteship area search)
      // You can change this based on your store location
      const originAreaId = 'IDNP6IDNC148IDND1845IDZ10013'; // Jakarta Pusat example

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
