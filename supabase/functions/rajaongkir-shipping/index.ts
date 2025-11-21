import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RajaOngkir Sandbox API base URL
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/starter';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, provinceId, cityId, destination, weight, courier } = await req.json();
    
    const costKey = Deno.env.get('RAJAONGKIR_COST_KEY');
    const deliveryKey = Deno.env.get('RAJAONGKIR_DELIVERY_KEY');

    console.log('RajaOngkir action:', action);

    // Get provinces list
    if (action === 'provinces') {
      const response = await fetch(`${RAJAONGKIR_BASE_URL}/province`, {
        method: 'GET',
        headers: {
          'key': costKey || '',
        },
      });

      const data = await response.json();
      console.log('Provinces response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get cities by province
    if (action === 'cities') {
      const url = provinceId 
        ? `${RAJAONGKIR_BASE_URL}/city?province=${provinceId}`
        : `${RAJAONGKIR_BASE_URL}/city`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'key': costKey || '',
        },
      });

      const data = await response.json();
      console.log('Cities response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get city by ID
    if (action === 'city') {
      const response = await fetch(`${RAJAONGKIR_BASE_URL}/city?id=${cityId}`, {
        method: 'GET',
        headers: {
          'key': costKey || '',
        },
      });

      const data = await response.json();
      console.log('City response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate shipping cost
    if (action === 'cost') {
      // Origin city ID - Zona Aquarium location (example: Jakarta = 152)
      // You can change this based on your store location
      const origin = '152'; // Jakarta Pusat

      const formData = new URLSearchParams();
      formData.append('origin', origin);
      formData.append('destination', destination);
      formData.append('weight', weight.toString());
      formData.append('courier', courier);

      console.log('Calculating cost with params:', {
        origin,
        destination,
        weight,
        courier
      });

      const response = await fetch(`${RAJAONGKIR_BASE_URL}/cost`, {
        method: 'POST',
        headers: {
          'key': deliveryKey || '',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Cost calculation response:', data);

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
    console.error('Error in rajaongkir-shipping:', error);
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
