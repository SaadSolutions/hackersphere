-- HackerSphere Seed Data

-- Admin user (password: Admin@123)
INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, avatar_url) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@hackersphere.com', 'admin', '$2b$10$rBnOUuFBtVJwmSFR5TtHW.YkJWqUYRfMOFbN7v5KrjXuE3wqRGYXS', 'Admin', 'User', 'admin', 'https://ui-avatars.com/api/?name=Admin+User&background=00ff41&color=000'),
('00000000-0000-0000-0000-000000000002', 'demo@hackersphere.com', 'demo_user', '$2b$10$rBnOUuFBtVJwmSFR5TtHW.YkJWqUYRfMOFbN7v5KrjXuE3wqRGYXS', 'Demo', 'User', 'user', 'https://ui-avatars.com/api/?name=Demo+User&background=00ff41&color=000')
ON CONFLICT (email) DO NOTHING;

-- Product Categories
INSERT INTO product_categories (id, name, slug, description, icon) VALUES
('10000000-0000-0000-0000-000000000001', 'Firewalls', 'firewalls', 'Network security and firewall solutions', 'shield'),
('10000000-0000-0000-0000-000000000002', 'Antivirus', 'antivirus', 'Malware protection and antivirus software', 'bug'),
('10000000-0000-0000-0000-000000000003', 'Encryption', 'encryption', 'Data encryption and security tools', 'lock'),
('10000000-0000-0000-0000-000000000004', 'VPN', 'vpn', 'Virtual private network solutions', 'wifi'),
('10000000-0000-0000-0000-000000000005', 'Pentesting', 'pentesting', 'Penetration testing tools', 'terminal')
ON CONFLICT (slug) DO NOTHING;

-- Products
INSERT INTO products (id, slug, name, description, short_description, price, compare_price, category, inventory_count, is_featured, rating, review_count, images, features, specifications) VALUES
('20000000-0000-0000-0000-000000000001', 'ultra-ward-firewall', 'Ultra-Ward Firewall Pro', 'Enterprise-grade firewall solution with AI-powered threat detection and real-time monitoring. Protects your network from advanced persistent threats, zero-day exploits, and DDoS attacks.', 'AI-powered enterprise firewall with real-time threat detection', 299.99, 399.99, 'Firewalls', 100, true, 4.8, 156,
  '[{"url": "https://placehold.co/800x600/0a0a0a/00ff41?text=Ultra-Ward+Firewall", "alt": "Ultra-Ward Firewall Pro"}, {"url": "https://placehold.co/800x600/0a0a0a/00ff41?text=Dashboard+View", "alt": "Dashboard"}]',
  '["AI-powered threat detection", "Real-time network monitoring", "DDoS protection", "Zero-day exploit prevention", "Automated incident response", "Multi-layer packet inspection", "Cloud integration", "24/7 support"]',
  '{"throughput": "10 Gbps", "connections": "5M concurrent", "latency": "<1ms", "platforms": "Linux, Windows Server", "license": "Annual subscription"}'),

('20000000-0000-0000-0000-000000000002', 'phantom-antivirus', 'Phantom Antivirus Suite', 'Next-generation antivirus with behavioral analysis and machine learning threat detection. Stops ransomware, spyware, and zero-day malware before they execute.', 'ML-powered antivirus with behavioral threat analysis', 79.99, 99.99, 'Antivirus', 500, true, 4.6, 289,
  '[{"url": "https://placehold.co/800x600/0a0a0a/00ff41?text=Phantom+Antivirus", "alt": "Phantom Antivirus Suite"}]',
  '["Real-time malware detection", "Behavioral analysis engine", "Ransomware protection", "Phishing website blocker", "USB/removable media scanning", "Scheduled deep scans", "Quarantine management", "Performance optimizer"]',
  '{"scan_speed": "500k files/min", "detection_rate": "99.98%", "platforms": "Windows, macOS, Linux", "updates": "Hourly definitions", "license": "Per device/year"}'),

('20000000-0000-0000-0000-000000000003', 'quantum-encryptor', 'Quantum Encryptor X', 'Military-grade AES-256 encryption for files, folders, emails, and communications. Future-proof against quantum computing threats with post-quantum cryptography.', 'Military-grade AES-256 + post-quantum encryption', 149.99, 199.99, 'Encryption', 200, true, 4.9, 94,
  '[{"url": "https://placehold.co/800x600/0a0a0a/00ff41?text=Quantum+Encryptor", "alt": "Quantum Encryptor X"}]',
  '["AES-256 bit encryption", "Post-quantum cryptography", "End-to-end encrypted messaging", "Secure file vault", "Email encryption", "Key management system", "Zero-knowledge architecture", "Hardware security module support"]',
  '{"algorithm": "AES-256 + CRYSTALS-Kyber", "key_size": "256-bit", "platforms": "Windows, macOS, Linux, iOS, Android", "compliance": "FIPS 140-2, GDPR", "license": "Perpetual"}'),

('20000000-0000-0000-0000-000000000004', 'stealth-vpn', 'StealthVPN Enterprise', 'Military-grade VPN with obfuscation technology. Bypass censorship and surveillance while keeping your data completely private with our no-log policy.', 'Enterprise VPN with stealth obfuscation technology', 119.99, 159.99, 'VPN', 300, false, 4.5, 203,
  '[{"url": "https://placehold.co/800x600/0a0a0a/00ff41?text=StealthVPN", "alt": "StealthVPN Enterprise"}]',
  '["Military-grade encryption", "No-log policy", "Stealth obfuscation", "5000+ servers in 60 countries", "Kill switch", "Split tunneling", "Multi-hop routing", "Dedicated IP available"]',
  '{"encryption": "AES-256-GCM", "protocol": "WireGuard + OpenVPN", "servers": "5000+", "countries": "60+", "devices": "Unlimited", "license": "Annual"}'),

('20000000-0000-0000-0000-000000000005', 'pentest-toolkit', 'PentestKit Professional', 'Comprehensive penetration testing toolkit for security professionals. Includes network scanners, exploit frameworks, password auditors, and reporting tools.', 'Complete professional penetration testing toolkit', 399.99, 499.99, 'Pentesting', 50, false, 4.7, 78,
  '[{"url": "https://placehold.co/800x600/0a0a0a/00ff41?text=PentestKit", "alt": "PentestKit Professional"}]',
  '["Network vulnerability scanner", "Exploit framework", "Password auditing tools", "Web application scanner", "Wireless security testing", "Social engineering toolkit", "Automated reporting", "CTF challenge support"]',
  '{"os": "Kali Linux based", "tools": "500+", "updates": "Monthly", "license": "Annual subscription", "support": "Priority email + chat"}')
ON CONFLICT (slug) DO NOTHING;

-- Courses
INSERT INTO courses (id, slug, title, description, short_description, difficulty_level, category, estimated_duration_hours, is_featured, rating, review_count, enrollment_count, thumbnail_url, tags) VALUES
('30000000-0000-0000-0000-000000000001', 'ethical-hacking-fundamentals', 'Ethical Hacking Fundamentals', 'Master the fundamentals of ethical hacking and penetration testing. Learn to think like an attacker to better defend systems. Covers reconnaissance, scanning, exploitation, and reporting.', 'Complete intro to ethical hacking and penetration testing', 'beginner', 'Penetration Testing', 24.5, true, 4.8, 342, 1205,
  'https://placehold.co/800x450/0a0a0a/00ff41?text=Ethical+Hacking', ARRAY['hacking', 'security', 'pentesting', 'beginner']),

('30000000-0000-0000-0000-000000000002', 'network-security-masterclass', 'Network Security Masterclass', 'Deep dive into network security protocols, firewall configuration, intrusion detection systems, and network forensics. Includes hands-on labs with real enterprise tools.', 'Advanced network security from architecture to forensics', 'intermediate', 'Network Security', 36.0, true, 4.7, 189, 876,
  'https://placehold.co/800x450/0a0a0a/00ff41?text=Network+Security', ARRAY['networking', 'firewalls', 'IDS', 'intermediate']),

('30000000-0000-0000-0000-000000000003', 'web-application-security', 'Web Application Security & Bug Bounty', 'Comprehensive web security course covering OWASP Top 10, SQL injection, XSS, CSRF, authentication bypass, and bug bounty hunting methodology.', 'OWASP Top 10, bug bounty hunting, and web pentesting', 'intermediate', 'Web Security', 28.0, true, 4.9, 421, 1589,
  'https://placehold.co/800x450/0a0a0a/00ff41?text=Web+Security', ARRAY['web', 'owasp', 'bug-bounty', 'xss', 'sql-injection']),

('30000000-0000-0000-0000-000000000004', 'cryptography-and-encryption', 'Cryptography & Applied Encryption', 'From Caesar ciphers to AES-256 and post-quantum cryptography. Understand the mathematics behind encryption and how to implement it in real applications.', 'Applied cryptography from classical to post-quantum', 'advanced', 'Cryptography', 20.0, false, 4.6, 98, 445,
  'https://placehold.co/800x450/0a0a0a/00ff41?text=Cryptography', ARRAY['cryptography', 'encryption', 'mathematics', 'advanced']),

('30000000-0000-0000-0000-000000000005', 'malware-analysis-reverse-engineering', 'Malware Analysis & Reverse Engineering', 'Learn to analyze and reverse engineer malware samples. Set up safe analysis environments, use disassemblers, debug malware, and write threat intelligence reports.', 'Analyze and reverse engineer real-world malware', 'advanced', 'Malware Analysis', 32.0, false, 4.8, 156, 623,
  'https://placehold.co/800x450/0a0a0a/00ff41?text=Malware+Analysis', ARRAY['malware', 'reverse-engineering', 'forensics', 'advanced']),

('30000000-0000-0000-0000-000000000006', 'cloud-security-aws-azure', 'Cloud Security: AWS & Azure', 'Secure cloud infrastructure on AWS and Azure. Covers IAM, VPC security, cloud-native security services, compliance, and incident response in cloud environments.', 'Cloud security best practices for AWS and Azure', 'intermediate', 'Cloud Security', 22.0, false, 4.5, 112, 534,
  'https://placehold.co/800x450/0a0a0a/00ff41?text=Cloud+Security', ARRAY['cloud', 'aws', 'azure', 'iam', 'intermediate'])
ON CONFLICT (slug) DO NOTHING;

-- Course modules for first course
INSERT INTO modules (id, course_id, title, description, order_index) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Introduction to Ethical Hacking', 'Foundations, legal aspects, and methodology', 0),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Reconnaissance & OSINT', 'Information gathering techniques', 1),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Scanning & Enumeration', 'Network scanning with Nmap and Nessus', 2),
('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Exploitation Techniques', 'Using Metasploit and manual exploits', 3),
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'Post-Exploitation & Reporting', 'Persistence, pivoting, and professional reports', 4)
ON CONFLICT DO NOTHING;

-- Lessons for module 1
INSERT INTO lessons (id, module_id, course_id, title, content_blocks, order_index, duration_minutes, is_preview) VALUES
('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  'What is Ethical Hacking?',
  '[{"type":"text","content":"Ethical hacking, also known as penetration testing or white-hat hacking, involves legally breaking into computers and devices to test an organization''s defenses. Unlike malicious hackers, ethical hackers have explicit permission to attack target systems."},{"type":"heading","content":"Key Concepts"},{"type":"text","content":"Ethical hackers use the same tools, techniques, and processes as malicious hackers to find and demonstrate business vulnerabilities. The primary goal is to identify security weaknesses before malicious actors can exploit them."},{"type":"callout","content":"Always ensure you have written permission before performing any security testing. Unauthorized testing is illegal and unethical."}]',
  0, 15, true),
('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  'Legal and Ethical Framework',
  '[{"type":"text","content":"Understanding the legal framework is crucial for ethical hackers. In the US, the Computer Fraud and Abuse Act (CFAA) governs computer-related crimes. Similar laws exist in other countries."},{"type":"heading","content":"Rules of Engagement"},{"type":"list","items":["Obtain written authorization","Define scope clearly","Maintain confidentiality","Report all findings","Do not cause damage"]}]',
  1, 20, false),
('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001',
  'Passive Reconnaissance Techniques',
  '[{"type":"text","content":"Passive reconnaissance involves gathering information about a target without directly interacting with it. This includes searching public records, social media, WHOIS data, and DNS records."},{"type":"code","language":"bash","content":"# WHOIS lookup\nwhois hackersphere.com\n\n# DNS enumeration\nnslookup -type=MX hackersphere.com\n\n# TheHarvester for email gathering\ntheharvester -d hackersphere.com -b google"}]',
  0, 25, false)
ON CONFLICT DO NOTHING;

-- Discount codes
INSERT INTO discount_codes (code, description, discount_type, discount_value, min_order_amount, max_uses, valid_until) VALUES
('HACKERSPHERE10', '10% off your first order', 'percent', 10, 0, 1000, NOW() + INTERVAL '1 year'),
('SAVE20', '20% off orders over $100', 'percent', 20, 100, 500, NOW() + INTERVAL '6 months'),
('WELCOME50', '$50 off orders over $200', 'fixed', 50, 200, 100, NOW() + INTERVAL '3 months')
ON CONFLICT (code) DO NOTHING;
