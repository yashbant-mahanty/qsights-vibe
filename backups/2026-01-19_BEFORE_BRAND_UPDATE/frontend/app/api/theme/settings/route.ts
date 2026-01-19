import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Call the Laravel backend from the server side
    // Always use localhost:8000 on the server (not from env which might be external URL)
    const backendUrl = 'http://127.0.0.1:8000/api';
    const response = await fetch(`${backendUrl}/theme/settings`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Set a reasonable timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Backend API returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    
    // Return default settings if backend is unavailable
    return NextResponse.json({
      branding: {
        logo: {
          value: 'https://bq-common.s3.ap-south-1.amazonaws.com/logos/Qsights_Logo_R.png',
          type: 'text'
        }
      },
      footer: {
        footer_text: {
          value: '© 2025. Powered by BioQuest Solutions.',
          type: 'text'
        },
        footer_contact_url: { value: '/contact-us', type: 'text' },
        footer_contact_label: { value: 'Contact Us', type: 'text' },
        footer_privacy_url: { value: '/privacy-policy', type: 'text' },
        footer_terms_url: { value: '/privacy-policy', type: 'text' },
      }
    }, { status: 200 });
  }
}
