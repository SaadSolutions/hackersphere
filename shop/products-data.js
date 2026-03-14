/**
 * HACKERSPHERE MOCK PRODUCTS DATA
 * Fallback product catalog when API is unavailable
 */
window.MOCK_PRODUCTS = [
  {
    id: 'mock-001',
    slug: 'network-penetration-toolkit',
    name: 'Network Penetration Toolkit',
    description: 'Complete offensive security suite with 50+ custom scripts for network reconnaissance, vulnerability scanning, and exploit delivery. Includes automated reporting.',
    short_description: 'Professional pentesting suite with 50+ tools',
    price: 149.99,
    compare_price: 199.99,
    category: 'Software',
    rating: 4.8,
    review_count: 342,
    inventory_count: 120,
    is_featured: true,
    is_active: true,
    image: null,
    tags: ['pentesting', 'network', 'offensive'],
    features: [
      'Automated vulnerability scanning',
      'Custom exploit framework',
      'Real-time network mapping',
      'Detailed PDF reporting',
      'Lifetime updates included'
    ],
    specifications: {
      'Platform': 'Linux / macOS / Windows',
      'License': 'Single User',
      'Updates': 'Lifetime',
      'Support': '24/7 Priority'
    }
  },
  {
    id: 'mock-002',
    slug: 'encrypted-usb-drive-256gb',
    name: 'Encrypted USB Drive 256GB',
    description: 'Military-grade AES-256 hardware-encrypted USB drive with biometric unlock. Tamper-proof casing with self-destruct capability after failed attempts.',
    short_description: 'AES-256 hardware-encrypted storage',
    price: 79.99,
    compare_price: null,
    category: 'Hardware',
    rating: 4.6,
    review_count: 218,
    inventory_count: 85,
    is_featured: true,
    is_active: true,
    image: null,
    tags: ['encryption', 'storage', 'hardware'],
    features: [
      'AES-256 hardware encryption',
      'Biometric fingerprint unlock',
      'Tamper-proof metal casing',
      'Self-destruct after 10 failed attempts',
      'USB-C & USB-A compatible'
    ],
    specifications: {
      'Capacity': '256GB',
      'Encryption': 'AES-256 XTS',
      'Interface': 'USB 3.2 Gen 2',
      'Speed': '550MB/s read, 400MB/s write'
    }
  },
  {
    id: 'mock-003',
    slug: 'wireless-hacking-adapter',
    name: 'Wireless Hacking Adapter',
    description: 'Dual-band WiFi adapter with monitor mode and packet injection support. High-gain antenna for extended range capture up to 1km.',
    short_description: 'Dual-band adapter with monitor mode',
    price: 59.99,
    compare_price: 74.99,
    category: 'Hardware',
    rating: 4.5,
    review_count: 567,
    inventory_count: 200,
    is_featured: false,
    is_active: true,
    image: null,
    tags: ['wifi', 'wireless', 'adapter'],
    features: [
      'Monitor mode & packet injection',
      'Dual-band 2.4GHz/5GHz',
      'High-gain 9dBi antenna',
      'Kali Linux compatible',
      'Up to 1km range'
    ],
    specifications: {
      'Chipset': 'RTL8812AU',
      'Bands': '2.4GHz / 5GHz',
      'Antenna': '9dBi removable',
      'OS Support': 'Linux / Windows / macOS'
    }
  },
  {
    id: 'mock-004',
    slug: 'dark-web-monitoring-suite',
    name: 'Dark Web Monitoring Suite',
    description: 'Enterprise-grade dark web intelligence platform. Monitors paste sites, forums, and marketplaces for credential leaks, brand mentions, and threat indicators.',
    short_description: 'Enterprise dark web intelligence platform',
    price: 199.99,
    compare_price: 299.99,
    category: 'Software',
    rating: 4.9,
    review_count: 156,
    inventory_count: 50,
    is_featured: true,
    is_active: true,
    image: null,
    tags: ['monitoring', 'intelligence', 'dark-web'],
    features: [
      'Real-time dark web scanning',
      'Credential leak detection',
      'Brand impersonation alerts',
      'Threat intelligence feeds',
      'API access for integration'
    ],
    specifications: {
      'Monitoring': '24/7 automated',
      'Sources': '15,000+ dark web sites',
      'Alerts': 'Email, Slack, Webhook',
      'License': '1 Year Subscription'
    }
  },
  {
    id: 'mock-005',
    slug: 'hardware-security-key',
    name: 'Hardware Security Key',
    description: 'FIDO2/WebAuthn hardware authentication key with NFC and USB-C. Phishing-resistant multi-factor authentication for all major platforms.',
    short_description: 'FIDO2 hardware auth key with NFC',
    price: 39.99,
    compare_price: null,
    category: 'Hardware',
    rating: 4.7,
    review_count: 891,
    inventory_count: 500,
    is_featured: false,
    is_active: true,
    image: null,
    tags: ['authentication', 'security', 'hardware'],
    features: [
      'FIDO2 / WebAuthn certified',
      'NFC + USB-C connectivity',
      'Waterproof IP68 rated',
      'Works with 100+ services',
      'No battery required'
    ],
    specifications: {
      'Protocols': 'FIDO2, U2F, TOTP',
      'Connectivity': 'USB-C, NFC',
      'Certification': 'FIDO Alliance',
      'Durability': 'IP68 waterproof'
    }
  },
  {
    id: 'mock-006',
    slug: 'cyber-range-access-pass',
    name: 'Cyber Range Access Pass',
    description: 'Unlimited access to our virtual cyber range with 200+ lab environments. Practice offensive and defensive techniques in realistic scenarios.',
    short_description: 'Unlimited virtual lab access — 200+ environments',
    price: 299.99,
    compare_price: 399.99,
    category: 'Training',
    rating: 4.9,
    review_count: 423,
    inventory_count: 1000,
    is_featured: true,
    is_active: true,
    image: null,
    tags: ['training', 'labs', 'practice'],
    features: [
      '200+ lab environments',
      'Offensive & defensive scenarios',
      'Real-world attack simulations',
      'Progress tracking & certs',
      'Community leaderboard'
    ],
    specifications: {
      'Labs': '200+ scenarios',
      'Access': '12-month unlimited',
      'Difficulty': 'Beginner to Expert',
      'Certificates': 'Included'
    }
  },
  {
    id: 'mock-007',
    slug: 'stealth-vpn-router',
    name: 'Stealth VPN Router',
    description: 'Pre-configured travel router with multi-hop VPN, Tor integration, and traffic obfuscation. Pocket-sized with 12-hour battery life.',
    short_description: 'Multi-hop VPN travel router with Tor',
    price: 249.99,
    compare_price: null,
    category: 'Hardware',
    rating: 4.4,
    review_count: 178,
    inventory_count: 35,
    is_featured: false,
    is_active: true,
    image: null,
    tags: ['vpn', 'router', 'privacy'],
    features: [
      'Multi-hop VPN tunneling',
      'Built-in Tor relay',
      'Traffic obfuscation',
      '12-hour battery life',
      'Pocket-sized design'
    ],
    specifications: {
      'WiFi': '802.11ac dual-band',
      'Battery': '5000mAh / 12hrs',
      'VPN': 'WireGuard + OpenVPN',
      'Size': '90mm x 65mm x 20mm'
    }
  },
  {
    id: 'mock-008',
    slug: 'bug-bounty-starter-kit',
    name: 'Bug Bounty Starter Kit',
    description: 'Curated toolkit for aspiring bug bounty hunters. Includes recon automation, custom wordlists, vulnerability templates, and a methodology guide.',
    short_description: 'Complete bug bounty hunter starter pack',
    price: 129.99,
    compare_price: 179.99,
    category: 'Software',
    rating: 4.6,
    review_count: 295,
    inventory_count: 300,
    is_featured: true,
    is_active: true,
    image: null,
    tags: ['bug-bounty', 'recon', 'tools'],
    features: [
      'Automated recon pipeline',
      'Custom wordlists (500K+ entries)',
      'Report templates for HackerOne/Bugcrowd',
      'Video methodology guide',
      'Private Discord community'
    ],
    specifications: {
      'Tools': '15+ custom scripts',
      'Wordlists': '500,000+ entries',
      'Platform': 'Linux / macOS',
      'Updates': '6 months included'
    }
  }
];

window.MOCK_CATEGORIES = [
  { name: 'Software', slug: 'software', count: 3 },
  { name: 'Hardware', slug: 'hardware', count: 4 },
  { name: 'Training', slug: 'training', count: 1 }
];
