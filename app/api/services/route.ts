import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client (Bypasses RLS for secure backend inserts)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Clean and parse the duration (e.g., "45 Mins" -> 45)
    const durationMins = parseInt(body.duration) || 30;

    // 2. Map the frontend payload to our V2 Database Schema
    const serviceData = {
      name: body.name,
      type: body.type,
      category: body.category,
      description: body.description,
      base_price: body.base_price,
      promo_price: body.promo_price,
      aracoins_perk: body.aracoins_perk,
      is_featured: body.is_featured,
      image_url: body.image_url,
      branches: body.branches, // Saves the entire branch schedule as a clean JSON object
      duration_mins: durationMins,
      // Bundle all marketing/advanced features into a single JSONB column
      marketing_meta: {
        visibility: body.visibility,
        tags: body.tags,
        overall_limit_enabled: body.overall_limit_enabled,
        overall_limit: body.overall_limit,
        require_deposit: body.require_deposit,
        deposit_amount: body.deposit_amount,
        commission_rate: body.commission_rate,
        allowances: body.allowances,
        category_carousel: body.category_carousel
      }
    };

    // 3. Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Service created successfully', data }, { status: 201 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
