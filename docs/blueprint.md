# **App Name**: CapFinder

## Core Features:

- Secure User Authentication: User signup and login powered by Firebase Authentication, allowing distinct pathways for investors and startups. This includes a step to define the user's role (Investor or Startup) immediately after registration.
- Dynamic User Profiles: Users can create and manage detailed profiles, including personal and company information. For investors, this includes 'investment interest', and for startups, 'funding needed', 'company', and 'bio'. All profile data is stored securely in Firestore.
- Startup Pitch Management: Startups can post and manage their investment pitches, including 'startup name', 'description', 'funding needed', 'industry', and 'contact email'. Pitches are stored and retrieved from Firestore.
- Investor Pitch Discovery: Investors can browse and view a comprehensive list of all submitted startup pitches, presented in an easy-to-navigate card layout.
- Personalized Dashboard: A simple, role-based dashboard providing relevant overviews. Startups see their submitted pitches and status, while investors can quickly access relevant pitches or saved search criteria.
- AI-Powered Pitch Assistant: Startups can use an AI tool to receive suggestions and refinements for their pitch descriptions, making them more compelling and concise for potential investors.

## Style Guidelines:

- A professional and trustworthy color palette. The primary color is a deep, corporate blue (#2959A3), evoking trust and reliability. The background color is a very light desaturated blue (#EFF2F7) for a clean and spacious feel. An accent color of vibrant turquoise (#39C4E0) is used for calls to action and highlights, providing an energetic contrast.
- Body and headline font: 'Inter' (sans-serif) for its modern, neutral, and highly readable qualities across various screen sizes, aligning with a professional platform.
- Utilize modern, clean line-art icons that visually communicate themes of finance, investment, networking, and specific user actions (e.g., 'post pitch', 'view profile').
- A responsive, card-based layout is fundamental for displaying pitches, user profiles, and dashboard elements. Content is structured within clear, generously spaced cards to ensure readability and easy navigation on all devices, from mobile to desktop.
- Implement subtle and elegant animations, such as gentle hover effects on interactive elements like cards and buttons, and smooth transitions for state changes, modal dialogs, or section loads, enhancing the overall user experience without distraction.