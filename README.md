# From Pantry to Platter

Pantry & Plate is a cooking assistant for turning ingredients, cravings, and food photos into practical recipes. Recipe discovery and structured recipe generation run on the server through Lovable AI, so model credentials stay out of browser code.

## What the app can do

- **Use my ingredients** — enter pantry items and get three recipe ideas, including meals, desserts, snacks, and other cooking-related dishes.
- **Make a specific dish** — request a recipe by name, including dishes from cuisines around the world.
- **Choose a cuisine** — select a regional or dietary preference, or choose **All Worldwide Cuisines**.
- **Scale a recipe** — enter the number of people (1–100); the assistant is asked to scale ingredient quantities for that serving count.
- **Explore each recipe** — select a recipe idea to view its required ingredients, available and missing items, estimated cost, preparation and cooking times, difficulty, and numbered cooking steps.
- **Use photos and voice** — upload or take a food photo to identify visible ingredients or dishes. Browser speech recognition is available for spoken questions where supported.
- **Ask Chef** — use Kitchen Consultation for cooking questions, substitutions, timing, and food-safety guidance.
- **Sign in and view chat history** — authentication is optional; chat history is stored locally in the browser. Account-synced chat history requires the corresponding backend support.

Recipe steps are requested in a clear, concise, concrete, correct, complete, coherent, and courteous style. AI-generated quantities, cost estimates, and cooking guidance are suggestions; use your judgment and follow food-safety guidance for your ingredients and equipment.

## Development

Requires Node.js and npm.

```sh
git clone https://github.com/linuharish15/from-pantry-to-platter.git
cd from-pantry-to-platter
npm install
npm run dev
```

Useful checks:

```sh
npm test
npm run lint
npm run build
```

Recipe and consultation generation use the server-side Lovable AI gateway and require `LOVABLE_API_KEY` in the deployment's secret configuration. Never put API keys in browser code or commit secret values. Login uses the configured Supabase auth client.

This project is connected to [Lovable](https://lovable.dev); changes pushed to the connected branch synchronize with the Lovable editor.
