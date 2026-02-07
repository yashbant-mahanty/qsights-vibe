INSERT INTO cms_content (id, page_key, title, description, content, last_updated_date, created_at, updated_at)
VALUES 
(
  gen_random_uuid(),
  'privacy_policy',
  'Privacy Policy',
  'Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.',
  '<h1>Privacy Policy</h1>
<p>Last Updated: December 17, 2025</p>

<h2>1. Information We Collect</h2>
<p>We collect information that you provide directly to us, including:</p>
<ul>
  <li>Name and contact information</li>
  <li>Account credentials</li>
  <li>Survey responses and feedback</li>
  <li>Communication preferences</li>
</ul>

<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Provide, maintain, and improve our services</li>
  <li>Process your transactions and send related information</li>
  <li>Send you technical notices and support messages</li>
  <li>Respond to your comments and questions</li>
</ul>

<h2>3. Information Sharing</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
<ul>
  <li>With your consent</li>
  <li>To comply with legal obligations</li>
  <li>To protect our rights and safety</li>
</ul>

<h2>4. Data Security</h2>
<p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

<h2>5. Your Rights</h2>
<p>You have the right to:</p>
<ul>
  <li>Access your personal information</li>
  <li>Correct inaccurate data</li>
  <li>Request deletion of your data</li>
  <li>Opt-out of marketing communications</li>
</ul>

<h2>6. Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us through our contact form.</p>',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (page_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  last_updated_date = EXCLUDED.last_updated_date,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO cms_content (id, page_key, title, description, content, last_updated_date, created_at, updated_at)
VALUES 
(
  gen_random_uuid(),
  'terms_of_service',
  'Terms of Service',
  'Please read these terms carefully before using our services. By accessing or using QSights, you agree to be bound by these terms.',
  '<h1>Terms of Service</h1>
<p>Last Updated: December 17, 2025</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing and using QSights, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.</p>

<h2>2. Use License</h2>
<p>Permission is granted to temporarily access QSights for personal or organizational use. This license shall automatically terminate if you violate any of these restrictions.</p>

<h2>3. User Accounts</h2>
<p>You are responsible for:</p>
<ul>
  <li>Maintaining the confidentiality of your account credentials</li>
  <li>All activities that occur under your account</li>
  <li>Notifying us immediately of any unauthorized use</li>
</ul>

<h2>4. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
  <li>Use the service for any illegal purpose</li>
  <li>Violate any laws in your jurisdiction</li>
  <li>Infringe on intellectual property rights</li>
  <li>Transmit any harmful code or malware</li>
  <li>Attempt to gain unauthorized access to our systems</li>
</ul>

<h2>5. Intellectual Property</h2>
<p>The service and its original content, features, and functionality are owned by QSights and are protected by international copyright, trademark, and other intellectual property laws.</p>

<h2>6. Termination</h2>
<p>We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including breach of these Terms.</p>

<h2>7. Limitation of Liability</h2>
<p>In no event shall QSights be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>

<h2>8. Changes to Terms</h2>
<p>We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service.</p>

<h2>9. Contact Information</h2>
<p>For questions about these Terms of Service, please contact us through our contact form.</p>',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (page_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  last_updated_date = EXCLUDED.last_updated_date,
  updated_at = CURRENT_TIMESTAMP;
