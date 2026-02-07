<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CmsContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cmsContent = [
            [
                'id' => Str::uuid(),
                'page_key' => 'contact_sales',
                'title' => 'Get in Touch With Our Sales Team',
                'description' => 'Have questions about QSights? Our sales team is here to help you find the perfect solution for your organization.',
                'form_fields' => json_encode([
                    'firstName' => ['label' => 'First Name', 'placeholder' => 'Enter your first name'],
                    'lastName' => ['label' => 'Last Name', 'placeholder' => 'Enter your last name'],
                    'email' => ['label' => 'Work Email', 'placeholder' => 'you@company.com'],
                    'phone' => ['label' => 'Phone Number', 'placeholder' => '+1 (555) 000-0000'],
                    'company' => ['label' => 'Company Name', 'placeholder' => 'Your organization'],
                    'companySize' => ['label' => 'Company Size', 'options' => ['1-50', '51-200', '201-1000', '1000+']],
                    'role' => ['label' => 'Your Role', 'placeholder' => 'e.g., Manager, Director'],
                    'interest' => ['label' => 'Area of Interest', 'options' => ['Enterprise Solutions', 'Custom Integration', 'Pricing', 'Other']],
                    'message' => ['label' => 'Message', 'placeholder' => 'Tell us about your needs...'],
                ]),
                'messages' => json_encode([
                    'success' => [
                        'title' => 'Message Sent!',
                        'description' => 'Thank you for contacting QSights Sales. A member of our team will reach out to you within 24 hours to discuss your requirements.',
                    ],
                    'error' => [
                        'title' => 'Submission Failed',
                        'description' => 'Failed to submit request. Please try again.',
                    ],
                ]),
                'cta_text' => 'Submit Request',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'page_key' => 'request_demo',
                'title' => 'Request a Personalized Demo',
                'description' => 'See QSights in action! Schedule a personalized demo tailored to your organization\'s needs.',
                'form_fields' => json_encode([
                    'name' => ['label' => 'Full Name', 'placeholder' => 'Enter your full name'],
                    'email' => ['label' => 'Email Address', 'placeholder' => 'you@company.com'],
                    'phone' => ['label' => 'Phone Number', 'placeholder' => '+1 (555) 000-0000'],
                    'country' => ['label' => 'Country', 'placeholder' => 'Select your country'],
                    'city' => ['label' => 'City', 'placeholder' => 'Enter your city'],
                    'message' => ['label' => 'Additional Notes', 'placeholder' => 'Tell us what you\'d like to see...'],
                ]),
                'messages' => json_encode([
                    'success' => [
                        'title' => 'Demo Request Received!',
                        'description' => 'Thank you for your interest in QSights! Our team will contact you shortly to schedule your personalized demo.',
                    ],
                    'error' => [
                        'title' => 'Submission Failed',
                        'description' => 'Failed to submit request. Please try again.',
                    ],
                ]),
                'cta_text' => 'Request Demo',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'page_key' => 'contact_us',
                'title' => 'Contact Us',
                'description' => 'Have a question or need support? We\'re here to help!',
                'form_fields' => json_encode([
                    'name' => ['label' => 'Name', 'placeholder' => 'Your full name'],
                    'email' => ['label' => 'Email', 'placeholder' => 'your.email@example.com'],
                    'subject' => ['label' => 'Subject', 'placeholder' => 'What is this about?'],
                    'message' => ['label' => 'Message', 'placeholder' => 'Your message...'],
                ]),
                'messages' => json_encode([
                    'success' => [
                        'title' => 'Message Sent!',
                        'description' => 'Thank you for contacting us. We\'ll get back to you as soon as possible.',
                    ],
                    'error' => [
                        'title' => 'Failed to Send',
                        'description' => 'Unable to send your message. Please try again.',
                    ],
                ]),
                'cta_text' => 'Send Message',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'page_key' => 'privacy_policy',
                'title' => 'Privacy Policy',
                'description' => 'Learn how QSights collects, uses, and protects your personal information.',
                'content' => '<h2>Introduction</h2><p>At QSights, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, disclose, and safeguard your data.</p><h2>Information We Collect</h2><p>We collect information that you provide directly to us, including:</p><ul><li>Name and contact information</li><li>Account credentials</li><li>Survey responses and feedback</li><li>Usage data and analytics</li></ul><h2>How We Use Your Information</h2><p>We use the information we collect to:</p><ul><li>Provide and improve our services</li><li>Communicate with you</li><li>Ensure security and prevent fraud</li><li>Comply with legal obligations</li></ul><h2>Data Security</h2><p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p><h2>Your Rights</h2><p>You have the right to access, correct, or delete your personal information. Contact us at privacy@qsights.com to exercise these rights.</p><h2>Contact Us</h2><p>If you have questions about this Privacy Policy, please contact us at privacy@qsights.com.</p>',
                'last_updated_date' => now(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'page_key' => 'terms_of_service',
                'title' => 'Terms of Service',
                'description' => 'Review the terms and conditions for using QSights platform.',
                'content' => '<h2>Acceptance of Terms</h2><p>By accessing and using QSights, you accept and agree to be bound by the terms and provision of this agreement.</p><h2>Use License</h2><p>Permission is granted to temporarily use QSights for personal or commercial purposes. This license shall automatically terminate if you violate any of these restrictions.</p><h2>User Accounts</h2><p>You are responsible for:</p><ul><li>Maintaining the confidentiality of your account</li><li>All activities that occur under your account</li><li>Notifying us immediately of any unauthorized use</li></ul><h2>Prohibited Uses</h2><p>You may not use QSights to:</p><ul><li>Violate any laws or regulations</li><li>Infringe on intellectual property rights</li><li>Transmit malicious code or viruses</li><li>Interfere with system security</li></ul><h2>Service Modifications</h2><p>We reserve the right to modify or discontinue the service at any time without notice.</p><h2>Limitation of Liability</h2><p>QSights shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p><h2>Governing Law</h2><p>These terms shall be governed by and construed in accordance with applicable laws.</p><h2>Contact Information</h2><p>For questions about these Terms, contact us at legal@qsights.com.</p>',
                'last_updated_date' => now(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($cmsContent as $content) {
            DB::table('cms_content')->insert($content);
        }

        $this->command->info('CMS content seeded successfully!');
    }
}
