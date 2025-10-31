# **App Name**: MT5 License Manager

## Core Features:

- Client Data Storage: Store client details like name, email, account number, broker server, balance, and trade information.
- License Status Management: Manage the license status (Liberado/Bloqueado) for each client.
- Data Ingestion Endpoint: Accept client data from MT5 via POST requests for registration or updates.
- Real-time Status Validator: Tool: Validate client authorization status in real-time, ensuring that only authorized clients can run the MT5 indicator. The tool decides if client is authorized to proceed based on the data ingested to the platform.
- Authorization API: Provide an API endpoint that returns client data in JSON format, including authorization status.
- Admin Interface: Develop an admin interface for managing clients and license statuses via POST requests. Not implemented in the MVP.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and stability.
- Background color: Light gray (#F5F5F5) for a clean and professional look.
- Accent color: Teal (#009688) to highlight important actions and information.
- Body and headline font: 'PT Sans' sans-serif for a modern, clean design suitable for headlines and body text.
- Use flat, outline-style icons to represent different data points and actions.
- Employ a grid-based layout for a structured and responsive design.
- Implement subtle transitions and animations for user feedback and engagement.