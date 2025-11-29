import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAJAONGKIR_BASE_URL = 'https://rajaongkir.komerce.id/api/v1';

// Initialize Supabase client with service role for system config access
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read body once and extract all possible parameters
    const body = await req.json();
    const { action, provinceId, cityId, cityName, destinationCityId, weight } = body;
    
    const apiKey = Deno.env.get('RAJAONGKIR_COST_KEY');

    console.log('RajaOngkir action:', action);

    // Get provinces list
    if (action === 'getProvinces') {
      const response = await fetch(
        `${RAJAONGKIR_BASE_URL}/destination/province`,
        {
          method: 'GET',
          headers: {
            'key': apiKey || '',
          },
        }
      );

      const data = await response.json();
      console.log('Provinces response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get cities by province
    if (action === 'getCities') {
      const response = await fetch(
        `${RAJAONGKIR_BASE_URL}/destination/city/${provinceId}`,
        {
          method: 'GET',
          headers: {
            'key': apiKey || '',
          },
        }
      );

      const data = await response.json();
      console.log('Cities response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get districts by city
    if (action === 'getDistricts') {
      const response = await fetch(
        `${RAJAONGKIR_BASE_URL}/destination/district/${cityId}`,
        {
          method: 'GET',
          headers: {
            'key': apiKey || '',
          },
        }
      );

      const data = await response.json();
      console.log('Districts response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get subdistricts by district
    if (action === 'getSubdistricts') {
      const { districtId } = body;
      
      const response = await fetch(
        `${RAJAONGKIR_BASE_URL}/destination/sub-district/${districtId}`,
        {
          method: 'GET',
          headers: {
            'key': apiKey || '',
          },
        }
      );

      const data = await response.json();
      console.log('Subdistricts response:', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search city by name (for finding destination city)
    if (action === 'searchCity') {
      
      // Get all provinces first
      const provincesRes = await fetch(
        `${RAJAONGKIR_BASE_URL}/destination/province`,
        {
          method: 'GET',
          headers: { 'key': apiKey || '' },
        }
      );
      const provincesData = await provincesRes.json();

      // Search through all provinces to find cities matching the name
      const matchingCities = [];
      
      if (provincesData?.meta?.status === 'success' && provincesData?.data) {
        for (const province of provincesData.data) {
          const citiesRes = await fetch(
            `${RAJAONGKIR_BASE_URL}/destination/city/${province.id}`,
            {
              method: 'GET',
              headers: { 'key': apiKey || '' },
            }
          );
          const citiesData = await citiesRes.json();
          
          if (citiesData?.meta?.status === 'success' && citiesData?.data) {
            const matches = citiesData.data.filter((city: any) => 
              city.name.toLowerCase().includes(cityName.toLowerCase())
            );
            matchingCities.push(...matches);
          }
        }
      }

      return new Response(JSON.stringify({
        meta: { status: 'success', code: 200, message: 'Success' },
        data: matchingCities
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get shipping rates
    if (action === 'rates') {
      // Get origin city from system config
      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'shipping_origin_city_id')
        .single();

      if (configError) {
        console.error('Error fetching origin config:', configError);
      }

      const originCityId = configData?.config_value || '151'; // Fallback to Jakarta Pusat

      // Calculate cost for multiple couriers
      const couriers = ['jne', 'tiki', 'pos', 'jnt', 'sicepat'];
      const allResults = [];

      for (const courier of couriers) {
        const formData = new URLSearchParams();
        formData.append('origin', originCityId);
        formData.append('destination', destinationCityId);
        formData.append('weight', (weight || 1000).toString());
        formData.append('courier', courier);

        try {
          const response = await fetch(`${RAJAONGKIR_BASE_URL}/calculate/domestic-cost`, {
            method: 'POST',
            headers: {
              'key': apiKey || '',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });

          const data = await response.json();
          
          if (data?.meta?.status === 'success' && data?.data) {
            allResults.push(...data.data);
          }
        } catch (error) {
          console.error(`Error fetching ${courier} rates:`, error);
        }
      }

      console.log('All rates:', allResults);

      return new Response(JSON.stringify({
        meta: { status: 'success', code: 200, message: 'Success' },
        data: allResults
      }), {
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
